(function () {
  'use strict';

  var CF = window.CF = window.CF || {};
  var W = 960;
  var H = 540;
  var SI = CF.spriteInfo;

  var images = {};
  var spriteFrames = [];
  var spriteCache = {};
  var loaded = false;

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function load() {
    var bg1 = loadImage('assets/img/bg/prehistoria.jpg');
    var bg2 = loadImage('assets/img/bg/antiguedad.jpg');
    var frames = [];
    for (var i = 1; i <= SI.frames; i++) {
      frames.push(loadImage(SI.filePattern.replace('{n}', i)));
    }
    return Promise.all([bg1, bg2].concat(frames)).then(function (res) {
      images.prehistoria = res[0];
      images.antiguedad = res[1];
      spriteFrames = res.slice(2);
      buildCaches();
      loaded = true;
      return true;
    });
  }

  function buildCaches() {
    CF.characters.forEach(function (ch) {
      spriteCache[ch.id] = [];
      for (var i = 0; i < spriteFrames.length; i++) {
        var img = spriteFrames[i];
        if (!img) { spriteCache[ch.id].push(null); continue; }
        var cv = document.createElement('canvas');
        cv.width = SI.crop.w;
        cv.height = SI.crop.h;
        var c = cv.getContext('2d');
        c.imageSmoothingEnabled = false;
        c.drawImage(img, SI.crop.x, SI.crop.y, SI.crop.w, SI.crop.h, 0, 0, SI.crop.w, SI.crop.h);
        if (ch.tint) {
          c.globalCompositeOperation = 'source-atop';
          c.fillStyle = ch.tint;
          c.fillRect(0, 0, cv.width, cv.height);
          c.globalCompositeOperation = 'source-over';
        }
        spriteCache[ch.id].push(cv);
      }
    });
  }

  function frameFor(charId, frameIndex) {
    var arr = spriteCache[charId];
    if (!arr || !arr.length) return null;
    var idx = ((frameIndex % arr.length) + arr.length) % arr.length;
    return arr[idx] || arr[0];
  }

  function drawCharacter(ctx, ch, xFeet, yFeet, dir, frameIndex, opts) {
    opts = opts || {};
    var h = opts.height || SI.drawHeight;
    var cv = frameFor(ch.id, frameIndex);
    var w = h * (SI.crop.w / SI.crop.h);
    ctx.save();
    if (!cv) {
      ctx.fillStyle = ch.accent;
      ctx.fillRect(xFeet - 8, yFeet - 40, 16, 40);
      ctx.restore();
      return;
    }
    var baseAlpha = opts.alpha == null ? 1 : opts.alpha;
    ctx.globalAlpha = baseAlpha * 0.32;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(xFeet, yFeet - 1, w * 0.34, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = baseAlpha;
    ctx.translate(xFeet, yFeet);
    if (dir < 0) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, -w / 2, -h, w, h);
    ctx.restore();

    ctx.save();
    ctx.translate(xFeet, yFeet);
    var headY = -h * 0.78;
    var faceX = dir * w * 0.1;
    if (ch.id === 'p1') {
      ctx.fillStyle = 'rgba(3,10,16,.85)';
      ctx.fillRect(faceX - 7, headY - 2, 15, 5);
      ctx.fillStyle = ch.accent;
      ctx.fillRect(faceX - 6, headY - 1, 13, 2);
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin((opts.time || 0) * 3);
      ctx.fillStyle = ch.accent;
      ctx.fillRect(faceX + 5, headY, 2, 2);
    } else if (ch.id === 'p2') {
      ctx.strokeStyle = ch.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, headY + 1, 7.5, Math.PI * 0.95, Math.PI * 2.05);
      ctx.stroke();
      ctx.fillStyle = ch.accent;
      ctx.fillRect(-9, headY - 1, 3, 6);
      ctx.fillRect(6, headY - 1, 3, 6);
    }
    ctx.restore();
  }

  function drawPortrait(canvas, charId) {
    var ch = CF.characters.filter(function (c) { return c.id === charId; })[0] || CF.characters[0];
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    var rgb = CF.portal.hexToRgb(ch.accent);
    var g = ctx.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.5, w * 0.7);
    g.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',.18)');
    g.addColorStop(1, 'rgba(4,7,16,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(126,165,224,.12)';
    ctx.lineWidth = 1;
    for (var x = 0; x < w; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (var y = 0; y < h; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    var size = h * 0.82;
    var cv = frameFor(charId, 0);
    if (cv) {
      ctx.imageSmoothingEnabled = false;
      var sw = size * (SI.crop.w / SI.crop.h);
      ctx.drawImage(cv, w / 2 - sw / 2, h * 0.96 - size, sw, size);
    }
    ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',.85)';
    ctx.fillRect(w / 2 - 26, h - 7, 52, 1);
  }

  function drawBackground(ctx, level, camX, time, quality, reduced) {
    var theme = CF.themes[level.era];
    if (level.era === 'nucleo') {
      drawCoreBackground(ctx, camX, time, quality, reduced);
      drawFarLayer(ctx, level, camX, time, quality);
      return;
    }
    var img = images[level.era];
    if (img) {
      var scale = 1.14;
      var dw = W * scale;
      var dh = H * scale;
      var maxCam = Math.max(1, level.width - W);
      var shift = (camX / maxCam) * (dw - W);
      ctx.drawImage(img, -shift, -(dh - H) / 2 - 4, dw, dh);
    } else {
      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, level.era === 'prehistoria' ? '#2a1e35' : '#2a2340');
      bg.addColorStop(1, '#0b0a15');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.save();
    var tint = level.era === 'prehistoria'
      ? 'rgba(30,12,40,.26)'
      : 'rgba(28,20,55,.24)';
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
    var bot = ctx.createLinearGradient(0, H * 0.55, 0, H);
    bot.addColorStop(0, 'rgba(3,4,12,0)');
    bot.addColorStop(1, 'rgba(3,4,12,.78)');
    ctx.fillStyle = bot;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
    if (quality !== 'low') {
      ctx.globalAlpha = 0.05 + 0.02 * Math.sin(time * 0.4);
      ctx.fillStyle = theme.fog;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    drawFarLayer(ctx, level, camX, time, quality);
  }

  function drawFarLayer(ctx, level, camX, time, quality) {
    var era = level.era;
    var count = quality === 'low' ? 5 : 9;
    var par = camX * 0.135;
    ctx.save();
    if (era === 'prehistoria') {
      for (var i = 0; i < count; i++) {
        var x = ((i * 236 - par) % (W + 340)) - 170;
        var h = 190 + hash(i * 7.3) * 150;
        var sway = Math.sin(time * 0.45 + i) * 5;
        ctx.fillStyle = 'rgba(9,17,18,.42)';
        ctx.fillRect(x - 7, H - h, 14, h);
        ctx.fillRect(x - 3, H - h, 6, h);
        ctx.fillStyle = 'rgba(8,16,16,.38)';
        for (var c = 0; c < 5; c++) {
          var cy = H - h + c * 24;
          var cw = 52 - c * 5;
          ctx.fillRect(x - cw / 2 + sway * (c / 5), cy, cw, 7);
          ctx.fillRect(x - cw / 3 + sway * (c / 5), cy - 7, cw * 0.55, 5);
        }
        if (quality !== 'low' && i % 2 === 0) {
          ctx.fillStyle = 'rgba(255,190,90,.18)';
          ctx.fillRect(x + 12, H - h + 54 + Math.sin(time + i) * 6, 2, 2);
        }
      }
      ctx.fillStyle = 'rgba(24,34,44,.18)';
      ctx.fillRect(0, H * 0.62, W, H * 0.2);
    } else if (era === 'antiguedad') {
      for (var j = 0; j < count; j++) {
        var cx = ((j * 282 - par) % (W + 340)) - 170;
        var ch = 170 + hash(j * 5.7) * 140;
        ctx.fillStyle = 'rgba(18,15,28,.38)';
        ctx.fillRect(cx - 13, H - ch, 26, ch);
        ctx.fillRect(cx - 17, H - ch - 8, 34, 8);
        ctx.fillStyle = 'rgba(12,10,22,.28)';
        ctx.fillRect(cx - 5, H - ch + 18, 4, ch - 30);
        ctx.fillRect(cx + 4, H - ch + 18, 3, ch - 30);
        if (j % 3 === 0) {
          ctx.strokeStyle = 'rgba(18,15,28,.3)';
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(cx - 42, H - ch + 10);
          ctx.quadraticCurveTo(cx, H - ch - 34, cx + 48, H - ch - 4);
          ctx.stroke();
        }
        if (quality !== 'low' && j % 2) {
          ctx.fillStyle = 'rgba(255,191,94,.14)';
          ctx.fillRect(cx + 20, H - ch + 34, 2, 2);
        }
      }
      ctx.fillStyle = 'rgba(28,22,46,.14)';
      ctx.fillRect(0, H * 0.59, W, H * 0.22);
    } else {
      for (var k = 0; k < count; k++) {
        var tx = ((k * 247 - par) % (W + 320)) - 160;
        var th = 120 + hash(k * 9.1) * 190;
        ctx.fillStyle = 'rgba(8,14,38,.42)';
        ctx.fillRect(tx - 12, H - th, 24, th);
        ctx.fillStyle = 'rgba(8,14,38,.3)';
        ctx.fillRect(tx - 26, H - th + 24, 52, 5);
        ctx.fillRect(tx - 18, H - th + 52, 36, 3);
        ctx.fillStyle = 'rgba(102,224,255,.24)';
        ctx.fillRect(tx - 1, H - th + 38, 2, 2);
        ctx.fillRect(tx - 1, H - th + 78, 2, 2);
        ctx.strokeStyle = 'rgba(102,224,255,.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(tx, H - th + 18, 28, 8, time * 0.2 + k, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(10,18,44,.2)';
      ctx.fillRect(0, H * 0.58, W, H * 0.2);
    }
    ctx.restore();
  }

  function drawAtmosphere(ctx, level, camX, time, quality, reduced) {
    if (reduced || quality === 'low') return;
    var theme = CF.themes[level.era];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (level.era !== 'nucleo') {
      var warm = level.era === 'prehistoria';
      for (var i = 0; i < 3; i++) {
        var x = ((i * 410 - camX * 0.06 + time * 4) % (W + 420)) - 210;
        var g = ctx.createLinearGradient(x, 0, x + 170, H);
        g.addColorStop(0, warm ? 'rgba(255,186,105,.075)' : 'rgba(170,210,255,.055)');
        g.addColorStop(1, 'rgba(40,80,140,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 90, 0);
        ctx.lineTo(x + 290, H);
        ctx.lineTo(x + 150, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = level.era === 'prehistoria' ? 'rgba(255,196,110,.3)' : 'rgba(210,225,255,.22)';
      for (var d = 0; d < 22; d++) {
        var dx = ((d * 97 + time * (3 + d % 4)) % (W + 30)) - 15;
        var dy = ((d * 61 + time * (2 + d % 3)) % (H + 20)) - 10;
        ctx.globalAlpha = 0.16 + 0.12 * Math.sin(time + d);
        ctx.fillRect(Math.round(dx), Math.round(dy), 1, 1);
      }
    } else {
      for (var b = 0; b < 4; b++) {
        var bx = ((b * 310 - camX * 0.05 + time * 3) % (W + 260)) - 130;
        var bg = ctx.createLinearGradient(bx, 0, bx + 18, H);
        bg.addColorStop(0, b % 2 ? 'rgba(102,224,255,.05)' : 'rgba(185,139,255,.05)');
        bg.addColorStop(1, 'rgba(30,60,120,0)');
        ctx.fillStyle = bg;
        ctx.fillRect(bx, 0, 18, H);
      }
      ctx.fillStyle = 'rgba(102,224,255,.16)';
      for (var s = 0; s < 18; s++) {
        var sx = ((s * 137 - time * 8) % (W + 40)) - 20;
        var sy = ((s * 53 + time * 3) % H);
        ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }
    }
    ctx.restore();
    void theme;
  }

  function drawCoreBackground(ctx, camX, time, quality, reduced) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#050818');
    g.addColorStop(0.55, '#0a1030');
    g.addColorStop(1, '#03040b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    var cx = 480 - camX * 0.12;
    var cy = 240 + Math.sin(time * 0.25) * 6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 4; i++) {
      var r = 90 + i * 70 + Math.sin(time * 0.6 + i) * 8;
      ctx.strokeStyle = i % 2 ? 'rgba(185,139,255,.07)' : 'rgba(102,224,255,.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.66, time * 0.05 + i * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    var glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 260);
    glow.addColorStop(0, 'rgba(150,240,255,.35)');
    glow.addColorStop(0.18, 'rgba(80,180,255,.18)');
    glow.addColorStop(0.55, 'rgba(120,90,255,.06)');
    glow.addColorStop(1, 'rgba(20,30,90,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    if (!reduced) {
      for (var s = 0; s < 36; s++) {
        var sx = ((s * 137.5 + time * (8 + (s % 5) * 3)) % (W + 40)) - 20;
        var sy = ((s * 71.3 + time * 4) % H);
        ctx.fillStyle = s % 3 ? 'rgba(120,220,255,.3)' : 'rgba(190,150,255,.32)';
        ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }
    }
    ctx.restore();
    var bot = ctx.createLinearGradient(0, H * 0.6, 0, H);
    bot.addColorStop(0, 'rgba(3,4,12,0)');
    bot.addColorStop(1, 'rgba(3,4,12,.82)');
    ctx.fillStyle = bot;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
    void quality;
  }

  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function shadeHex(hex, amount) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    if (amount >= 0) {
      r += (255 - r) * amount;
      g += (255 - g) * amount;
      b += (255 - b) * amount;
    } else {
      r *= 1 + amount;
      g *= 1 + amount;
      b *= 1 + amount;
    }
    return 'rgb(' + Math.round(Math.max(0, Math.min(255, r))) + ',' + Math.round(Math.max(0, Math.min(255, g))) + ',' + Math.round(Math.max(0, Math.min(255, b))) + ')';
  }

  function drawPlatform(ctx, p, era, time, opts) {
    opts = opts || {};
    var theme = CF.themes[era];
    var hidden = p.kind === 'hidden';
    var revealed = opts.revealed;
    var quality = opts.quality || 'high';
    if (hidden && !revealed) {
      if (opts.faint) {
        ctx.save();
        ctx.globalAlpha = 0.12 + 0.06 * Math.sin(time * 2 + p.x);
        ctx.strokeStyle = theme.accent2;
        ctx.setLineDash([3, 5]);
        ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
        ctx.restore();
      }
      return;
    }

    var x = Math.round(p.x);
    var y = Math.round(p.y);
    var w = Math.round(p.w);
    var h = Math.round(p.h);
    var dark = theme.platformDark;
    var body = hidden ? '#2c5c62' : theme.platform;
    var top = hidden ? theme.accent2 : theme.platformTop;
    var edge = hidden ? '#c6ffff' : theme.platformEdge;

    var baseAlpha = hidden ? 0.82 : 1;
    ctx.save();
    if (hidden) {
      ctx.globalAlpha = baseAlpha;
      ctx.shadowColor = theme.accent2;
      ctx.shadowBlur = 12;
    }

    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.fillRect(x + 4, y + 4, w, h);

    ctx.fillStyle = dark;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = body;
    ctx.fillRect(x + 2, y + 3, w - 4, Math.max(3, h - 5));

    var rowH = 9;
    for (var ry = 5; ry < h - 2; ry += rowH) {
      var offset = (Math.floor(ry / rowH) % 2) * 13;
      for (var bx = 2 - offset; bx < w - 2; bx += 27) {
        var sx = Math.max(2, bx + 2);
        var sw = Math.min(w - 2, bx + 26) - sx;
        if (sw < 4) continue;
        var v = hash((x + bx) * 0.13 + (y + ry) * 0.09 + (era === 'nucleo' ? 9 : 0));
        ctx.fillStyle = v > 0.69 ? shadeHex(body, 0.09) : v < 0.22 ? shadeHex(body, -0.16) : body;
        ctx.fillRect(x + sx, y + ry, sw, Math.min(rowH - 2, h - ry - 3));
      }
    }

    ctx.fillStyle = shadeHex(body, -0.28);
    ctx.fillRect(x + 2, y + 3, 2, h - 5);
    ctx.fillStyle = shadeHex(body, -0.42);
    ctx.fillRect(x + w - 4, y + 3, 2, h - 5);
    ctx.fillStyle = shadeHex(body, -0.5);
    ctx.fillRect(x - 1, y + h - 2, w + 2, 2);

    for (var bx2 = 0; bx2 < w; bx2 += 19) {
      var tw = Math.min(13, w - bx2);
      if (tw < 4) break;
      var tv = hash(x + bx2 * 0.7 + y);
      ctx.fillStyle = tv > 0.55 ? top : shadeHex(top, -0.12);
      ctx.fillRect(x + bx2, y + 1, tw, 3);
      ctx.fillStyle = tv > 0.55 ? edge : shadeHex(edge, -0.16);
      ctx.fillRect(x + bx2, y, tw, 1);
    }
    ctx.fillStyle = shadeHex(top, -0.38);
    ctx.fillRect(x, y + 4, w, 2);
    ctx.fillStyle = shadeHex(edge, -0.25);
    ctx.fillRect(x, y + 4, w, 1);

    if (quality !== 'low') {
      if (era === 'prehistoria') {
        for (var m = 0; m < Math.floor(w / 17); m++) {
          var mx = x + 6 + m * 17 + hash(m + x) * 5;
          if (hash(m * 3 + x) > 0.4 && mx < x + w - 6) {
            ctx.fillStyle = hash(m + 7) > 0.5 ? '#6c8849' : '#52713d';
            ctx.fillRect(Math.round(mx), y, 5, 2);
            if (hash(m + 12) > 0.6) ctx.fillRect(Math.round(mx) + 1, y - 1, 3, 1);
          }
        }
        for (var vv = 0; vv < Math.floor(w / 74) + 1; vv++) {
          var vx = x + 16 + vv * 74 + hash(vv + x) * 18;
          var len = 5 + Math.floor(hash(vv * 2 + x) * 10);
          if (vv === Math.floor(w / 74) && vx > x + w - 10) continue;
          ctx.fillStyle = '#3f5a35';
          ctx.fillRect(Math.round(vx), y + h, 2, len);
          ctx.fillStyle = '#64864b';
          ctx.fillRect(Math.round(vx) + 2, y + h + 3, 3, 2);
          ctx.fillRect(Math.round(vx) - 2, y + h + len - 4, 3, 2);
        }
        for (var c = 0; c < Math.floor(w / 42); c++) {
          var cx = x + 9 + c * 42 + hash(c + x) * 12;
          var cy = y + 8 + hash(c * 5 + y) * Math.max(2, h - 13);
          ctx.fillStyle = 'rgba(15,9,6,.45)';
          ctx.fillRect(Math.round(cx), Math.round(cy), 2, 3);
          ctx.fillRect(Math.round(cx) + 2, Math.round(cy) + 3, 2, 2);
          ctx.fillStyle = 'rgba(226,190,126,.28)';
          ctx.fillRect(Math.round(cx) + 1, Math.round(cy) - 1, 1, 2);
        }
      } else if (era === 'antiguedad') {
        for (var g = 0; g < Math.floor(w / 58); g++) {
          var gx = x + 15 + g * 58;
          ctx.fillStyle = 'rgba(5,4,10,.32)';
          ctx.fillRect(gx, y + 5, 2, Math.max(4, h - 8));
          ctx.fillStyle = 'rgba(231,204,156,.2)';
          ctx.fillRect(gx + 3, y + 5, 1, Math.max(4, h - 9));
          ctx.fillStyle = '#d7b98a';
          ctx.fillRect(gx + 3, y + 8, 8, 2);
          ctx.fillRect(gx + 5, y + 10, 2, 5);
          ctx.fillRect(gx + 9, y + 14, 2, 3);
        }
        for (var cc = 0; cc < Math.floor(w / 88); cc++) {
          var px = x + 8 + cc * 88;
          var py = y + 6 + (h > 30 ? 10 : 0);
          ctx.fillStyle = 'rgba(255,206,112,.38)';
          ctx.fillRect(px, py, 7, 2);
          ctx.fillRect(px + 2, py + 3, 3, 3);
          ctx.fillRect(px + 5, py + 6, 2, 2);
        }
      } else if (era === 'nucleo') {
        for (var e = 0; e < Math.floor(w / 31); e++) {
          var ex = x + 7 + e * 31;
          ctx.globalAlpha = 0.35 + 0.2 * Math.sin(time * 2.2 + e * 0.8 + x * 0.03);
          ctx.fillStyle = theme.accent;
          ctx.fillRect(ex, y + 6, 14, 1);
          ctx.fillRect(ex + 5, y + 6, 1, Math.min(6, h - 9));
          ctx.globalAlpha = baseAlpha;
        }
        for (var rr = 0; rr < Math.floor(w / 37); rr++) {
          var rx = x + 9 + rr * 37;
          ctx.fillStyle = '#8fa7e8';
          ctx.fillRect(rx, y + 2, 2, 1);
          ctx.fillRect(rx, y + h - 4, 2, 1);
        }
        ctx.globalAlpha = 0.45 + 0.15 * Math.sin(time * 2 + x * 0.05);
        ctx.fillStyle = edge;
        ctx.fillRect(x + 4, y + h - 3, w - 8, 1);
        ctx.globalAlpha = baseAlpha;
      }

      if (hidden) {
        ctx.fillStyle = 'rgba(109,238,255,.2)';
        for (var s = 0; s < Math.floor(w / 24); s++) {
          ctx.fillRect(x + 6 + s * 24, y + 5 + (s % 3) * 5, 9, 1);
        }
      }
    }

    if (h <= 30 && w > 54 && era !== 'nucleo') {
      ctx.fillStyle = dark;
      ctx.fillRect(x + 9, y + h, 3, 7);
      ctx.fillRect(x + w - 12, y + h, 3, 7);
      ctx.fillStyle = shadeHex(body, -0.2);
      ctx.fillRect(x + 12, y + h, 5, 2);
      ctx.fillRect(x + w - 12, y + h, 5, 2);
    } else if (h <= 30 && era === 'nucleo') {
      ctx.fillStyle = '#0a1024';
      ctx.fillRect(x + 12, y + h, 4, 9);
      ctx.fillRect(x + w - 16, y + h, 4, 9);
      ctx.fillStyle = theme.accent;
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(time * 3 + x);
      ctx.fillRect(x + 13, y + h + 3, 2, 4);
      ctx.fillRect(x + w - 15, y + h + 3, 2, 4);
      ctx.globalAlpha = baseAlpha;
    }

    ctx.restore();
  }

  function drawFern(ctx, time, seed) {
    var sway = Math.sin(time * 1.15 + seed * 0.03) * 1.8;
    ctx.fillStyle = 'rgba(0,0,0,.24)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 22, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    var angles = [-2.42, -2.06, -1.74, -1.4, -1.03, -0.68];
    for (var i = 0; i < angles.length; i++) {
      var len = 22 + hash(seed + i * 3.7) * 20;
      var a = angles[i] + sway * 0.012;
      var ex = Math.cos(a) * len;
      var ey = Math.sin(a) * len;
      var cx = ex * 0.3;
      var cy = ey * 0.6;
      ctx.strokeStyle = i % 2 ? '#335b33' : '#47763f';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.stroke();
      for (var t = 0.36; t < 0.9; t += 0.16) {
        var px = 2 * (1 - t) * t * cx + t * t * ex;
        var py = 2 * (1 - t) * t * cy + t * t * ey;
        var leaf = 3 + (1 - t) * 3;
        ctx.fillStyle = i % 2 ? '#5f8c4a' : '#79a85c';
        ctx.fillRect(Math.round(px - leaf * 0.5), Math.round(py - 1), Math.round(leaf), 2);
      }
    }
    ctx.fillStyle = '#8fbf6a';
    for (var f = 0; f < 3; f++) {
      ctx.fillRect(Math.round(hash(seed + f) * 8 - 4), -Math.round(6 + hash(seed + f * 2) * 9), 1, 3);
    }
  }

  function drawBoneRib(ctx, time, seed) {
    var sway = Math.sin(time * 0.55 + seed) * 0.8;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 38, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(sway, 0);
    ctx.strokeStyle = '#4d3d32';
    ctx.lineWidth = 6;
    for (var i = 0; i < 5; i++) {
      var y0 = -5 - i * 8;
      var x1 = 19 + i * 5;
      var x2 = 16 + i * 7;
      ctx.beginPath();
      ctx.moveTo(-2, y0);
      ctx.bezierCurveTo(x1, y0 - 17, x2, y0 - 29 - i * 3, 9 + i * 4, y0 - 39 - i * 3);
      ctx.stroke();
    }
    ctx.strokeStyle = '#c7b18b';
    ctx.lineWidth = 3.4;
    for (var j = 0; j < 5; j++) {
      var yy = -5 - j * 8;
      var a1 = 19 + j * 5;
      var a2 = 16 + j * 7;
      ctx.beginPath();
      ctx.moveTo(-2, yy);
      ctx.bezierCurveTo(a1, yy - 17, a2, yy - 29 - j * 3, 9 + j * 4, yy - 39 - j * 3);
      ctx.stroke();
    }
    ctx.strokeStyle = '#d8c49b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-4, -60);
    ctx.stroke();
    ctx.fillStyle = '#6b5744';
    for (var v = 0; v < 7; v++) {
      ctx.fillRect(-7, -8 - v * 8, 6, 3);
    }
    ctx.restore();
  }

  function drawSkull(ctx, seed) {
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 17, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(0, -7);
    ctx.fillStyle = '#bda77f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-8, 6, 16, 6);
    ctx.fillStyle = '#3c3027';
    ctx.beginPath();
    ctx.ellipse(-5 + seed * 0.02, -1, 3.2, 3.8, -0.2, 0, Math.PI * 2);
    ctx.ellipse(5 + seed * 0.02, -1, 3.2, 3.8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-1, 3, 2, 3);
    ctx.fillStyle = '#8f7a5a';
    ctx.fillRect(-6, 10, 1, 3);
    ctx.fillRect(-2, 10, 1, 3);
    ctx.fillRect(2, 10, 1, 3);
    ctx.fillRect(6, 10, 1, 3);
    ctx.restore();
  }

  function drawRock(ctx, seed) {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 24, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    var pts = [
      [-18, 0], [-22, -9], [-12, -20], [-3, -24], [8, -20], [19, -12], [21, 0]
    ];
    ctx.fillStyle = '#3b342e';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a5148';
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.lineTo(-14, -13);
    ctx.lineTo(-3, -21);
    ctx.lineTo(7, -17);
    ctx.lineTo(13, -6);
    ctx.lineTo(11, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7e7162';
    ctx.fillRect(-12, -14, 5, 2);
    ctx.fillRect(2, -17, 4, 2);
    ctx.fillStyle = '#4c7a3f';
    ctx.fillRect(-20 + hash(seed) * 4, -6, 4, 2);
    ctx.fillRect(10, -10, 5, 2);
  }

  function drawTorch(ctx, time, ready) {
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b211b';
    ctx.fillRect(-2, -44, 4, 44);
    ctx.fillStyle = '#5b4731';
    ctx.fillRect(-6, -48, 12, 5);
    ctx.fillRect(-9, -44, 18, 3);
    var f = 1 + Math.sin(time * 9 + ready) * 0.12;
    ctx.save();
    ctx.translate(0, -49);
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(0, -8, 2, 0, -8, 46);
    g.addColorStop(0, 'rgba(255,214,130,.4)');
    g.addColorStop(0.4, 'rgba(255,139,60,.13)');
    g.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-46, -54, 92, 92);
    ctx.fillStyle = 'rgba(255,120,42,.85)';
    ctx.beginPath();
    ctx.moveTo(-7 * f, 0);
    ctx.quadraticCurveTo(-9 * f, -14, 0, -25 * f);
    ctx.quadraticCurveTo(9 * f, -14, 7 * f, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,224,120,.95)';
    ctx.beginPath();
    ctx.moveTo(-3.5, -1);
    ctx.quadraticCurveTo(-4, -9, 1 + Math.sin(time * 7) * 2, -16 * f);
    ctx.quadraticCurveTo(5, -8, 3.5, -1);
    ctx.closePath();
    ctx.fill();
    if (ready) {
      for (var s = 0; s < 3; s++) {
        var a = time * 2 + s * 2.1;
        ctx.fillStyle = 'rgba(255,190,90,.6)';
        ctx.fillRect(Math.cos(a) * (10 + s * 2), -18 + Math.sin(a * 1.4) * 8, 1, 1);
      }
    }
    ctx.restore();
  }

  function drawVine(ctx, time, seed) {
    var len = 42 + hash(seed) * 34;
    var sway = Math.sin(time * 1.4 + seed) * 3;
    ctx.save();
    ctx.strokeStyle = '#355b34';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(5 + sway, len * 0.3, -6 + sway, len * 0.7, sway, len);
    ctx.stroke();
    for (var i = 1; i < 6; i++) {
      var t = i / 6;
      var px = Math.sin(t * Math.PI * 2 + seed) * 4 + sway * t;
      var py = len * t;
      ctx.fillStyle = i % 2 ? '#4f7d44' : '#6f9b52';
      ctx.fillRect(Math.round(px - 4), Math.round(py), 5, 2);
      ctx.fillRect(Math.round(px + 2), Math.round(py + 5), 4, 2);
    }
    ctx.restore();
  }

  function drawColumn(ctx, seed, quality) {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 19, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    var h = 54 + hash(seed) * 18;
    ctx.fillStyle = '#746b62';
    ctx.fillRect(-15, -7, 30, 7);
    ctx.fillStyle = '#9b8f80';
    ctx.fillRect(-12, -10, 24, 4);
    ctx.fillStyle = '#6c6259';
    ctx.fillRect(-9, -h, 18, h - 9);
    ctx.fillStyle = '#a99b88';
    ctx.fillRect(-9, -h, 4, h - 10);
    ctx.fillStyle = '#514941';
    ctx.fillRect(4, -h, 3, h - 10);
    ctx.fillStyle = '#8a7d6f';
    ctx.fillRect(-12, -h - 7, 24, 7);
    ctx.fillStyle = '#b3a48f';
    ctx.fillRect(-12, -h - 7, 24, 2);
    if (quality !== 'low') {
      for (var i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(55,48,43,.5)' : 'rgba(190,174,150,.22)';
        ctx.fillRect(-6 + i * 4, -h + 3, 1, h - 13);
      }
      ctx.strokeStyle = 'rgba(40,35,30,.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2, -h + 10);
      ctx.lineTo(1, -h + 18);
      ctx.lineTo(-1, -h + 26);
      ctx.stroke();
      ctx.fillStyle = '#4c7a3f';
      ctx.fillRect(-10, -14, 5, 3);
      ctx.fillRect(5, -20, 4, 2);
    }
  }

  function drawStatue(ctx, time, quality) {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4b4640';
    ctx.fillRect(-15, -9, 30, 9);
    ctx.fillStyle = '#746e65';
    ctx.fillRect(-12, -13, 24, 4);
    ctx.fillStyle = '#8d877c';
    ctx.fillRect(-8, -40, 16, 27);
    ctx.fillStyle = '#a29a8d';
    ctx.fillRect(-11, -42, 22, 6);
    ctx.fillStyle = '#7d766b';
    ctx.fillRect(-5, -51, 10, 9);
    ctx.fillStyle = '#b5ad9f';
    ctx.fillRect(-5, -51, 10, 2);
    ctx.fillStyle = '#514b43';
    ctx.fillRect(-9, -57, 18, 6);
    ctx.fillRect(-6, -60, 12, 4);
    ctx.fillStyle = '#ffcf72';
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 2.2);
    ctx.fillRect(-3, -48, 2, 1);
    ctx.fillRect(2, -48, 2, 1);
    ctx.globalAlpha = 1;
    if (quality !== 'low') {
      ctx.fillStyle = '#4c7a3f';
      ctx.fillRect(-11, -28, 4, 2);
      ctx.fillRect(-9, -20, 3, 2);
      ctx.fillRect(7, -36, 3, 2);
    }
  }

  function drawBanner(ctx, time, seed) {
    var wave = Math.sin(time * 2 + seed) * 3;
    ctx.save();
    ctx.strokeStyle = '#3c2e28';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.stroke();
    ctx.fillStyle = 'rgba(75, 32, 30, .88)';
    ctx.beginPath();
    ctx.moveTo(-14, 2);
    ctx.lineTo(14, 2);
    ctx.lineTo(13 + wave, 44);
    ctx.lineTo(0, 54);
    ctx.lineTo(-13 + wave, 44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(210, 170, 95, .55)';
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(6, 21);
    ctx.lineTo(0, 30);
    ctx.lineTo(-6, 21);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-2, 6, 4, 2);
    ctx.restore();
  }

  function drawUrn(ctx, seed) {
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d4b3d';
    ctx.fillRect(-9, -4, 18, 4);
    ctx.fillStyle = '#9b6e4c';
    ctx.beginPath();
    ctx.ellipse(0, -19, 11, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b9865d';
    ctx.fillRect(-6, -29, 12, 3);
    ctx.fillRect(-7, -34, 14, 4);
    ctx.strokeStyle = '#7f563d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-11, -21, 5, Math.PI * 0.4, Math.PI * 1.4);
    ctx.moveTo(11, -26);
    ctx.arc(11, -21, 5, Math.PI * -0.4, Math.PI * 0.6, true);
    ctx.stroke();
    ctx.fillStyle = '#d6a36f';
    ctx.fillRect(-9, -24, 3, 8);
    if (hash(seed) > 0.5) {
      ctx.fillStyle = '#4c7a3f';
      ctx.fillRect(-2, -35, 4, 2);
      ctx.fillRect(2, -32, 3, 2);
    }
  }

  function drawPylon(ctx, time, quality) {
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 19, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111a38';
    ctx.fillRect(-12, -8, 24, 8);
    ctx.fillStyle = '#263461';
    ctx.fillRect(-7, -55, 14, 48);
    ctx.fillStyle = '#42588e';
    ctx.fillRect(-7, -55, 4, 48);
    ctx.fillStyle = '#0a1024';
    ctx.fillRect(4, -55, 3, 48);
    ctx.fillStyle = '#66e0ff';
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 3);
    ctx.fillRect(-3, -48, 6, 2);
    ctx.fillRect(-3, -39, 6, 2);
    ctx.fillRect(-3, -30, 6, 2);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(102,224,255,.75)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -62, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d8ffff';
    ctx.beginPath();
    ctx.arc(0, -62, 2.5 + Math.sin(time * 4) * 0.7, 0, Math.PI * 2);
    ctx.fill();
    if (quality !== 'low') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(0, -62, 2, 0, -62, 36);
      g.addColorStop(0, 'rgba(102,224,255,.28)');
      g.addColorStop(1, 'rgba(102,224,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-36, -98, 72, 72);
      ctx.restore();
      ctx.strokeStyle = 'rgba(185,139,255,.5)';
      ctx.beginPath();
      ctx.ellipse(0, -62, 15, 5, time * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawCable(ctx, d, time) {
    var x2 = d.x2 != null ? d.x2 - d.x : 120;
    var y2 = d.y2 != null ? d.y2 - d.y : 20;
    var sag = 18 + Math.abs(x2) * 0.08;
    ctx.strokeStyle = '#0a1024';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(x2 * 0.5, (y2 + sag) * 0.6, x2, y2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(102,224,255,.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.quadraticCurveTo(x2 * 0.5, (y2 + sag) * 0.6 - 1, x2, y2 - 1);
    ctx.stroke();
    ctx.fillStyle = '#1a294d';
    ctx.fillRect(-3, 0, 6, 8);
    ctx.fillRect(x2 - 3, y2, 6, 8);
    ctx.fillStyle = '#66e0ff';
    ctx.fillRect(-2, 1, 4, 2);
    ctx.fillRect(x2 - 2, y2 + 1, 4, 2);
    for (var i = 1; i < 5; i++) {
      var t = i / 5;
      var cx = 2 * (1 - t) * t * (x2 * 0.5) + t * t * x2;
      var cy = 2 * (1 - t) * t * ((y2 + sag) * 0.6) + t * t * y2;
      ctx.fillStyle = i % 2 ? '#66e0ff' : '#b98bff';
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(time * 3 + i);
      ctx.fillRect(cx - 1, cy + 2, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawHolo(ctx, time, seed, quality) {
    var bob = Math.sin(time * 1.6 + seed) * 3;
    ctx.save();
    ctx.translate(0, bob);
    ctx.globalAlpha = 0.18 + 0.06 * Math.sin(time * 3);
    ctx.fillStyle = '#66e0ff';
    ctx.fillRect(-30, -20, 60, 40);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(132,240,255,.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-27, -17, 54, 34);
    ctx.fillStyle = 'rgba(8,18,45,.55)';
    ctx.fillRect(-26, -16, 52, 32);
    ctx.fillStyle = 'rgba(102,224,255,.48)';
    for (var i = 0; i < 5; i++) {
      var w = 12 + hash(seed + i) * 30;
      ctx.fillRect(-21, -11 + i * 5, w, 1);
    }
    ctx.fillStyle = 'rgba(185,139,255,.7)';
    ctx.fillRect(-22, -14, 7, 2);
    if (quality !== 'low') {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#66e0ff';
      ctx.fillRect(-20, 18, 40, 1);
      ctx.fillRect(-14, 22, 28, 1);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(102,224,255,.35)';
    ctx.lineWidth = 1;
    for (var b = 0; b < 4; b++) {
      var by = 24 + hash(seed + b * 5) * 26;
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(time * 2 + b);
      ctx.beginPath();
      ctx.moveTo(-3, by);
      ctx.lineTo(3, by + 12);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.4 + 0.25 * Math.sin(time * 3 + seed);
    ctx.fillStyle = '#66e0ff';
    ctx.fillRect(-2, 50, 4, 5);
    ctx.restore();
  }

  function drawCrystal(ctx, time, seed) {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 19, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    var shards = [
      [-10, 0, -15, -20, 7],
      [0, 0, 2, -33, 9],
      [11, 0, 17, -17, 6],
      [5, 0, -4, -12, 4]
    ];
    for (var i = 0; i < shards.length; i++) {
      var s = shards[i];
      ctx.fillStyle = i % 2 ? '#3b5f93' : '#38528a';
      ctx.beginPath();
      ctx.moveTo(s[0] - s[4], s[1]);
      ctx.lineTo(s[2], s[3]);
      ctx.lineTo(s[0] + s[4], s[1]);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(144,232,255,.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(190,250,255,.55)';
      ctx.fillRect(s[2] - 1, s[3] + 6, 1, 8);
    }
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.18 * Math.sin(time * 2 + seed);
    ctx.fillStyle = '#66e0ff';
    ctx.fillRect(-2, -38, 4, 38);
    ctx.restore();
  }

  function drawRune(ctx, time, quality) {
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10162e';
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-10, -46);
    ctx.lineTo(0, -54);
    ctx.lineTo(10, -46);
    ctx.lineTo(12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(102,224,255,.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = '#b98bff';
    ctx.globalAlpha = 0.65 + 0.25 * Math.sin(time * 2.4);
    ctx.beginPath();
    ctx.moveTo(-4, -38);
    ctx.lineTo(4, -31);
    ctx.lineTo(-4, -23);
    ctx.moveTo(4, -22);
    ctx.lineTo(4, -12);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (quality !== 'low') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(185,139,255,.4)';
      for (var i = 0; i < 4; i++) {
        var a = time + i * 1.57;
        ctx.fillRect(Math.cos(a) * 18, -32 + Math.sin(a) * 18, 1, 1);
      }
      ctx.restore();
    }
  }

  function drawMushroom(ctx, time, seed) {
    var pulse = 0.7 + 0.3 * Math.sin(time * 1.8 + seed);
    var caps = [
      { x: -12, y: -10, s: 6, h: 12 },
      { x: 2, y: -18, s: 8, h: 20 },
      { x: 13, y: -7, s: 5, h: 9 }
    ];
    for (var i = 0; i < caps.length; i++) {
      var c = caps[i];
      ctx.fillStyle = '#d9d0b0';
      ctx.fillRect(c.x - 1, c.y, 2, c.h);
      ctx.fillStyle = i === 1 ? '#79d6b2' : '#5fb795';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.s, c.s * 0.62, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(225,255,240,.8)';
      ctx.fillRect(c.x - 2, c.y - c.s * 0.62, 2, 2);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18 * pulse;
    var g = ctx.createRadialGradient(2, -18, 1, 2, -18, 27);
    g.addColorStop(0, 'rgba(110,255,205,.7)');
    g.addColorStop(1, 'rgba(60,180,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-28, -46, 56, 56);
    ctx.restore();
  }

  function drawRoot(ctx, time, seed) {
    var sway = Math.sin(time * 0.8 + seed) * 1.2;
    ctx.save();
    ctx.strokeStyle = '#2d2119';
    ctx.lineWidth = 7;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.bezierCurveTo(-16, -18, -25, -40, -8, -58);
    ctx.stroke();
    ctx.strokeStyle = '#4b3525';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-28, -2);
    ctx.bezierCurveTo(-8 + sway, -22, 15, -31, 33, -48);
    ctx.moveTo(-9, -57);
    ctx.bezierCurveTo(4, -48, 18, -53, 24, -39);
    ctx.stroke();
    ctx.fillStyle = '#5e4430';
    for (var i = 0; i < 7; i++) {
      var t = i / 6;
      ctx.fillRect(-28 + t * 38, -4 - t * 48 + Math.sin(i + seed) * 3, 3, 2);
    }
    ctx.restore();
  }

  function drawFossil(ctx, seed) {
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#49443f';
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(-17, -17);
    ctx.lineTo(8, -23);
    ctx.lineTo(22, -9);
    ctx.lineTo(18, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b3a88d';
    ctx.lineWidth = 1.3;
    var turns = 2.8;
    ctx.beginPath();
    for (var i = 0; i < 26; i++) {
      var a = i * 0.32;
      var r = 1 + a * 3.4;
      var x = Math.cos(a) * r;
      var y = -11 + Math.sin(a) * r * 0.72;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#7d745f';
    for (var k = 0; k < 5; k++) ctx.fillRect(-9 + k * 4, -4 + (k % 2), 2, 2);
    void seed;
  }

  function drawMonolith(ctx, time, seed) {
    ctx.fillStyle = 'rgba(0,0,0,.36)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    var h = 62 + hash(seed) * 22;
    ctx.fillStyle = '#242630';
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(-10, -h);
    ctx.lineTo(-2, -h - 7);
    ctx.lineTo(9, -h + 2);
    ctx.lineTo(13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a3d4b';
    ctx.fillRect(-9, -h + 6, 4, h - 10);
    ctx.fillStyle = '#171922';
    ctx.fillRect(4, -h + 9, 3, h - 13);
    ctx.strokeStyle = 'rgba(102,224,255,.55)';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5 + 0.25 * Math.sin(time * 1.7 + seed);
    ctx.beginPath();
    ctx.moveTo(-5, -h + 18);
    ctx.lineTo(3, -h + 26);
    ctx.lineTo(-3, -h + 34);
    ctx.moveTo(2, -h + 43);
    ctx.lineTo(-4, -h + 49);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (hash(seed) > 0.5) {
      ctx.fillStyle = '#4c7a3f';
      ctx.fillRect(-13, -12, 5, 3);
      ctx.fillRect(6, -24, 4, 2);
    }
  }

  function drawArch(ctx, seed) {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 38, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    var h = 58 + hash(seed) * 18;
    ctx.fillStyle = '#665e55';
    ctx.fillRect(-32, -h, 13, h);
    ctx.fillRect(19, -h, 13, h);
    ctx.fillStyle = '#8f8373';
    ctx.fillRect(-32, -h, 5, h);
    ctx.fillRect(19, -h, 4, h);
    ctx.fillStyle = '#4d453d';
    ctx.fillRect(-36, -h - 8, 21, 8);
    ctx.fillRect(15, -h - 8, 21, 8);
    ctx.strokeStyle = '#6f655a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-30, -h - 4);
    ctx.quadraticCurveTo(-6, -h - 30, 17, -h - 17);
    ctx.stroke();
    ctx.strokeStyle = '#8d8172';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-26, -h - 5);
    ctx.quadraticCurveTo(-5, -h - 25, 12, -h - 16);
    ctx.stroke();
    ctx.fillStyle = '#4c7a3f';
    ctx.fillRect(-30, -h + 12, 4, 3);
    ctx.fillRect(22, -h + 24, 3, 2);
  }

  function drawLantern(ctx, time, seed) {
    var sway = Math.sin(time * 1.4 + seed) * 2.2;
    ctx.save();
    ctx.translate(sway, 0);
    ctx.strokeStyle = '#241d19';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -54);
    ctx.lineTo(0, -24);
    ctx.stroke();
    ctx.fillStyle = '#1a1614';
    ctx.fillRect(-7, -30, 14, 4);
    ctx.fillStyle = '#4b3c2c';
    ctx.fillRect(-8, -26, 16, 3);
    ctx.fillStyle = 'rgba(255,197,94,.32)';
    ctx.beginPath();
    ctx.moveTo(-6, -23);
    ctx.lineTo(6, -23);
    ctx.lineTo(4, -6);
    ctx.lineTo(-4, -6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8f6a38';
    ctx.stroke();
    ctx.fillStyle = '#ffd88a';
    ctx.globalAlpha = 0.65 + 0.25 * Math.sin(time * 5);
    ctx.fillRect(-1, -18, 2, 7);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#32271d';
    ctx.fillRect(-7, -6, 14, 3);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(0, -15, 2, 0, -15, 34);
    g.addColorStop(0, 'rgba(255,205,110,.26)');
    g.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-34, -49, 68, 68);
    ctx.restore();
    ctx.restore();
  }

  function drawTerminal(ctx, time, seed) {
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b1226';
    ctx.fillRect(-17, -8, 34, 8);
    ctx.fillStyle = '#1a294d';
    ctx.fillRect(-14, -36, 28, 28);
    ctx.fillStyle = '#27507a';
    ctx.fillRect(-14, -36, 28, 3);
    ctx.fillStyle = 'rgba(102,224,255,.15)';
    ctx.fillRect(-11, -31, 22, 18);
    ctx.strokeStyle = 'rgba(102,224,255,.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-11, -31, 22, 18);
    ctx.fillStyle = 'rgba(102,224,255,.7)';
    for (var i = 0; i < 4; i++) {
      var w = 5 + hash(seed + i * 3) * 12;
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(time * 2 + i);
      ctx.fillRect(-9, -28 + i * 4, w, 1);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#66e0ff';
    ctx.fillRect(-4, -12, 8, 2);
    ctx.fillStyle = '#0a1024';
    ctx.fillRect(-12, -6, 24, 3);
  }

  function drawBeacon(ctx, time, seed) {
    var bob = Math.sin(time * 1.4 + seed) * 4;
    ctx.save();
    ctx.translate(0, bob);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, -1 - bob, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a2240';
    ctx.fillRect(-5, -10, 10, 10);
    ctx.fillStyle = '#66e0ff';
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 3 + seed);
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(8, -20);
    ctx.lineTo(0, -10);
    ctx.lineTo(-8, -20);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(102,224,255,.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, -30, 23, 7, time * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(0, -30, 2, 0, -30, 36);
    g.addColorStop(0, 'rgba(102,224,255,.3)');
    g.addColorStop(1, 'rgba(102,224,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-36, -66, 72, 72);
    ctx.restore();
    ctx.restore();
  }

  function drawChain(ctx, time, seed) {
    var sway = Math.sin(time * 0.9 + seed) * 2;
    ctx.strokeStyle = '#262b36';
    ctx.lineWidth = 2;
    for (var i = 0; i < 9; i++) {
      var y = -i * 10;
      var x = sway * (i / 8);
      ctx.beginPath();
      ctx.ellipse(x, y, 3, 5, i % 2 ? 0.4 : -0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(102,224,255,.5)';
    ctx.fillRect(sway - 1, -92, 2, 2);
  }

  function drawStalagmite(ctx, time, seed, quality) {
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    for (var i = 0; i < 3; i++) {
      var x = (i - 1) * 11;
      var h = 24 + hash(seed + i * 7) * 30;
      var w = 7 - i;
      ctx.fillStyle = i === 1 ? '#8d877c' : '#746e65';
      ctx.beginPath();
      ctx.moveTo(x - w, 0);
      ctx.lineTo(x - 2, -h);
      ctx.lineTo(x + 4, -h * 0.82);
      ctx.lineTo(x + w + 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(210,225,220,.16)';
      ctx.beginPath();
      ctx.moveTo(x - 2, -h);
      ctx.lineTo(x + 3, -h * 0.8);
      ctx.lineTo(x + 1, -3);
      ctx.closePath();
      ctx.fill();
    }
    if (quality !== 'low') {
      ctx.fillStyle = '#4c7a3f';
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 2 + seed);
      ctx.fillRect(-13, -9, 3, 2);
      ctx.fillRect(8, -16, 2, 2);
      ctx.globalAlpha = 1;
    }
  }

  function drawNest(ctx, time, seed) {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5e4430';
    ctx.lineWidth = 2;
    for (var i = 0; i < 7; i++) {
      var a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 24, -3 + Math.sin(a) * 6);
      ctx.quadraticCurveTo(Math.cos(a) * 10, -10, -Math.sin(a) * 12, -9);
      ctx.stroke();
    }
    ctx.fillStyle = '#3a2a1d';
    ctx.beginPath();
    ctx.ellipse(0, -6, 19, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    for (var e = 0; e < 3; e++) {
      ctx.fillStyle = e === 1 ? '#e0d8bb' : '#c9c0a2';
      ctx.beginPath();
      ctx.ellipse(-7 + e * 7, -9 - (e % 2) * 2, 5, 7, 0.14 * (e - 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,250,225,.45)';
      ctx.fillRect(-8 + e * 7, -12, 2, 2);
    }
    ctx.strokeStyle = 'rgba(80,60,42,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -13);
    ctx.lineTo(-5, -9);
    ctx.lineTo(-7, -6);
    ctx.stroke();
    if (Math.sin(time * 1.6 + seed) > 0.3) {
      ctx.fillStyle = 'rgba(255,230,170,.35)';
      ctx.fillRect(-1, -20, 1, 1);
      ctx.fillRect(9, -16, 1, 1);
    }
  }

  function drawBrazier(ctx, time, seed, quality) {
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4b4640';
    ctx.fillRect(-12, -7, 24, 7);
    ctx.fillStyle = '#746e65';
    ctx.fillRect(-6, -24, 12, 18);
    ctx.fillStyle = '#8d877c';
    ctx.fillRect(-15, -30, 30, 6);
    ctx.fillStyle = '#3a3530';
    ctx.fillRect(-12, -27, 24, 3);
    var f = 0.7 + 0.3 * Math.sin(time * 4.2 + seed);
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ff9d3c';
    ctx.beginPath();
    ctx.moveTo(-7, -30);
    ctx.quadraticCurveTo(-3, -44 * f, 1, -35);
    ctx.quadraticCurveTo(4, -49 * f, 8, -30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.moveTo(-3, -30);
    ctx.quadraticCurveTo(0, -40 * f, 4, -30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (quality !== 'low') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(0, -34, 2, 0, -34, 48);
      g.addColorStop(0, 'rgba(255,180,80,.26)');
      g.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-48, -82, 96, 96);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,220,140,.7)';
      var sx = Math.sin(time * 3 + seed) * 5;
      ctx.fillRect(sx, -56 - Math.sin(time * 5 + seed) * 5, 1, 1);
    }
  }

  function drawObelisk(ctx, time, seed, quality) {
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 19, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4b4640';
    ctx.fillRect(-16, -9, 32, 9);
    ctx.fillStyle = '#6f685f';
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(-7, -70);
    ctx.lineTo(0, -79);
    ctx.lineTo(7, -70);
    ctx.lineTo(10, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#918a7f';
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(-7, -70);
    ctx.lineTo(0, -79);
    ctx.lineTo(-2, -10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#514b43';
    ctx.beginPath();
    ctx.moveTo(2, -9);
    ctx.lineTo(5, -69);
    ctx.lineTo(7, -70);
    ctx.lineTo(10, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,191,94,.72)';
    ctx.globalAlpha = 0.55 + 0.3 * Math.sin(time * 2.4 + seed);
    ctx.fillRect(-2, -58, 4, 2);
    ctx.fillRect(-1, -49, 3, 6);
    ctx.fillRect(-2, -38, 4, 2);
    ctx.globalAlpha = 1;
    if (quality !== 'low') {
      ctx.strokeStyle = 'rgba(255,191,94,.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, -66);
      ctx.lineTo(-3, -61);
      ctx.moveTo(5, -44);
      ctx.lineTo(2, -40);
      ctx.stroke();
    }
  }

  function drawDrone(ctx, time, seed, quality) {
    var bob = Math.sin(time * 1.7 + seed) * 4;
    ctx.save();
    ctx.translate(0, bob);
    ctx.fillStyle = 'rgba(9,20,46,.9)';
    ctx.fillRect(-14, -10, 28, 11);
    ctx.fillStyle = '#3b5f93';
    ctx.fillRect(-14, -10, 28, 3);
    ctx.fillStyle = '#66e0ff';
    ctx.globalAlpha = 0.65 + 0.25 * Math.sin(time * 4 + seed);
    ctx.fillRect(-3, -4, 6, 2);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(160,230,255,.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-12, -12);
    ctx.lineTo(-24, -15);
    ctx.moveTo(12, -12);
    ctx.lineTo(24, -15);
    ctx.stroke();
    ctx.fillStyle = 'rgba(102,224,255,.55)';
    var spin = Math.sin(time * 18 + seed);
    ctx.fillRect(-29, -16 + spin, 10, 1);
    ctx.fillRect(19, -16 - spin, 10, 1);
    ctx.fillStyle = '#b98bff';
    ctx.fillRect(-1, -17, 2, 4);
    ctx.fillStyle = '#d8ffff';
    ctx.fillRect(-1, -18, 2, 2);
    if (quality !== 'low') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(0, -4, 2, 0, -4, 30);
      g.addColorStop(0, 'rgba(102,224,255,.24)');
      g.addColorStop(1, 'rgba(102,224,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-30, -34, 60, 60);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawVent(ctx, time, seed, quality) {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a294d';
    ctx.fillRect(-17, -6, 34, 6);
    ctx.fillStyle = '#0b1226';
    for (var i = 0; i < 5; i++) ctx.fillRect(-14 + i * 6, -5, 3, 4);
    ctx.fillStyle = '#66e0ff';
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 2 + seed);
    ctx.fillRect(-12, -7, 24, 1);
    ctx.globalAlpha = 1;
    for (var p = 0; p < 3; p++) {
      var k = ((time * 0.35 + p / 3 + seed * 0.01) % 1);
      ctx.fillStyle = 'rgba(170,220,255,' + (0.16 * (1 - k)) + ')';
      ctx.beginPath();
      ctx.ellipse(Math.sin(time * 1.3 + p) * 6, -10 - k * 42, 6 + k * 14, 4 + k * 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (quality !== 'low') {
      ctx.strokeStyle = 'rgba(102,224,255,.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-15, -8);
      ctx.lineTo(-19, -4);
      ctx.moveTo(15, -8);
      ctx.lineTo(19, -4);
      ctx.stroke();
    }
  }

  function drawProp(ctx, d, era, time, quality) {
    if (d.type === 'fern') drawFern(ctx, time, d.x || 0);
    else if (d.type === 'mushroom') drawMushroom(ctx, time, d.x || 0);
    else if (d.type === 'root') drawRoot(ctx, time, d.x || 0);
    else if (d.type === 'fossil') drawFossil(ctx, d.x || 0);
    else if (d.type === 'monolith') drawMonolith(ctx, time, d.x || 0);
    else if (d.type === 'arch') drawArch(ctx, d.x || 0);
    else if (d.type === 'lantern') drawLantern(ctx, time, d.x || 0);
    else if (d.type === 'terminal') drawTerminal(ctx, time, d.x || 0);
    else if (d.type === 'beacon') drawBeacon(ctx, time, d.x || 0);
    else if (d.type === 'chain') drawChain(ctx, time, d.x || 0);
    else if (d.type === 'bone') drawBoneRib(ctx, time, d.x || 0);
    else if (d.type === 'skull') drawSkull(ctx, d.x || 0);
    else if (d.type === 'rock') drawRock(ctx, d.x || 0);
    else if (d.type === 'torch') drawTorch(ctx, time, d.x || 0);
    else if (d.type === 'vine') drawVine(ctx, time, d.x || 0);
    else if (d.type === 'column') drawColumn(ctx, d.x || 0, quality);
    else if (d.type === 'statue') drawStatue(ctx, time, quality);
    else if (d.type === 'banner') drawBanner(ctx, time, d.x || 0);
    else if (d.type === 'urn') drawUrn(ctx, d.x || 0);
    else if (d.type === 'pylon') drawPylon(ctx, time, quality);
    else if (d.type === 'cable') drawCable(ctx, d, time);
    else if (d.type === 'holo') drawHolo(ctx, time, d.x || 0, quality);
    else if (d.type === 'crystal') drawCrystal(ctx, time, d.x || 0);
    else if (d.type === 'rune') drawRune(ctx, time, quality);
    else if (d.type === 'stalagmite') drawStalagmite(ctx, time, d.x || 0, quality);
    else if (d.type === 'nest') drawNest(ctx, time, d.x || 0);
    else if (d.type === 'brazier') drawBrazier(ctx, time, d.x || 0, quality);
    else if (d.type === 'obelisk') drawObelisk(ctx, time, d.x || 0, quality);
    else if (d.type === 'drone') drawDrone(ctx, time, d.x || 0, quality);
    else if (d.type === 'vent') drawVent(ctx, time, d.x || 0, quality);
    void era;
  }

  function drawPropList(ctx, list, era, camX, time, quality, opacity) {
    for (var i = 0; i < list.length; i++) {
      var d = list[i];
      var s = d.s || 1;
      var x = d.x == null ? 0 : d.x;
      var margin = 90 * s;
      if (x + margin < camX || x - margin > camX + W) continue;
      ctx.save();
      ctx.translate(x, d.y == null ? 0 : d.y);
      ctx.scale(d.flip ? -s : s, s);
      var alpha = d.alpha != null ? d.alpha : opacity;
      if (alpha != null) ctx.globalAlpha = alpha;
      drawProp(ctx, d, era, time, quality);
      ctx.restore();
    }
  }

  function drawDecor(ctx, level, camX, time, quality) {
    drawPropList(ctx, level.decor || [], level.era, camX, time, quality);
  }

  function drawForeground(ctx, level, camX, time, quality) {
    drawPropList(ctx, level.foreground || [], level.era, camX, time, quality, 0.78);
  }

  function drawScreenForeground(ctx, level, camX, time, quality) {
    if (quality === 'low') return;
    var era = level.era;
    var drift = camX * 0.02;
    ctx.save();
    if (era === 'prehistoria') {
      ctx.save();
      ctx.translate(-8 + Math.sin(drift * 0.7) * 5, H + 14);
      ctx.scale(2.7, 2.7);
      ctx.globalAlpha = 0.46;
      drawFern(ctx, time, drift);
      ctx.restore();
      ctx.save();
      ctx.translate(W + 8, H + 14);
      ctx.scale(-2.9, 2.9);
      ctx.globalAlpha = 0.42;
      drawFern(ctx, time, drift + 17);
      ctx.restore();
      ctx.save();
      ctx.translate(48 + Math.sin(time * 0.7) * 5, -8);
      ctx.scale(1.8, 1.8);
      ctx.globalAlpha = 0.34;
      drawVine(ctx, time, drift);
      ctx.restore();
      ctx.save();
      ctx.translate(W - 54, -6);
      ctx.scale(1.6, 1.6);
      ctx.globalAlpha = 0.28;
      drawVine(ctx, time, drift + 9);
      ctx.restore();
    } else if (era === 'antiguedad') {
      ctx.save();
      ctx.translate(64, -8);
      ctx.scale(1.9, 1.9);
      ctx.globalAlpha = 0.34;
      drawBanner(ctx, time, drift);
      ctx.restore();
      ctx.save();
      ctx.translate(W - 64, -8);
      ctx.scale(-1.9, 1.9);
      ctx.globalAlpha = 0.28;
      drawBanner(ctx, time, drift + 11);
      ctx.restore();
      ctx.save();
      ctx.translate(14, H + 16);
      ctx.scale(2.35, 2.35);
      ctx.globalAlpha = 0.3;
      drawColumn(ctx, drift, quality);
      ctx.restore();
      ctx.save();
      ctx.translate(W - 14, H + 16);
      ctx.scale(-2.35, 2.35);
      ctx.globalAlpha = 0.26;
      drawColumn(ctx, drift + 23, quality);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(66, -6);
      ctx.scale(1.8, -1.8);
      ctx.globalAlpha = 0.36;
      drawChain(ctx, time, drift);
      ctx.restore();
      ctx.save();
      ctx.translate(W - 78, -10);
      ctx.scale(1.4, -1.4);
      ctx.globalAlpha = 0.3;
      drawChain(ctx, time, drift + 8);
      ctx.restore();
      ctx.save();
      ctx.translate(16, H + 14);
      ctx.scale(2.1, 2.1);
      ctx.globalAlpha = 0.34;
      drawCrystal(ctx, time, drift);
      ctx.restore();
      ctx.save();
      ctx.translate(W - 18, H + 14);
      ctx.scale(-2.1, 2.1);
      ctx.globalAlpha = 0.3;
      drawCrystal(ctx, time, drift + 15);
      ctx.restore();
    }
    var g = ctx.createLinearGradient(0, H - 92, 0, H);
    g.addColorStop(0, 'rgba(2,5,12,0)');
    g.addColorStop(1, era === 'prehistoria' ? 'rgba(7,9,5,.3)' : era === 'antiguedad' ? 'rgba(9,5,4,.3)' : 'rgba(3,4,14,.36)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, H - 92, W, 92);
    ctx.restore();
  }

  function drawShard(ctx, shard, time, revealed) {
    if (shard.hidden && !revealed) {
      return;
    }
    var y = shard.y + Math.sin(time * 2 + shard.x) * 4;
    ctx.save();
    ctx.translate(shard.x, y);
    var col = shard.hidden ? '#7ef7ff' : '#a9e6ff';
    ctx.shadowColor = col;
    ctx.shadowBlur = 18;
    ctx.rotate(Math.sin(time * 0.8 + shard.x) * 0.08);
    ctx.fillStyle = 'rgba(120,220,255,.18)';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 22);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(230,255,255,.9)';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(6, -1);
    ctx.lineTo(0, 12);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(82,240,230,.7)';
    ctx.beginPath();
    ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
    ctx.stroke();
    ctx.restore();
    if (!shard.hidden || revealed) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 3 + shard.x);
      ctx.fillStyle = col;
      for (var i = 0; i < 4; i++) {
        var a = time * 1.2 + i * 1.57;
        var r = 20 + (i % 2) * 7;
        ctx.fillRect(shard.x + Math.cos(a) * r, y + Math.sin(a) * r, 1.5, 1.5);
      }
      ctx.restore();
    }
  }

  function drawDevice(ctx, d, active, time, era, opts) {
    opts = opts || {};
    var theme = CF.themes[era];
    var col = d.type === 'glyph' ? '#b98bff' : d.type === 'harmonic' ? '#ffbf5e' : '#52f0e6';
    var y = d.y;
    ctx.save();
    ctx.translate(d.x, y);
    if (d.type === 'altar') {
      var h = 56;
      ctx.fillStyle = 'rgba(4,7,16,.9)';
      ctx.fillRect(-18, -h, 36, h);
      ctx.fillStyle = active ? col : 'rgba(80,95,140,.55)';
      ctx.fillRect(-15, -h, 30, 3);
      ctx.fillRect(-15, -h, 3, h);
      ctx.fillRect(12, -h, 3, h);
      ctx.fillRect(-15, -6, 30, 6);
      ctx.globalAlpha = active ? 0.9 : 0.5;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -h - 12, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.fillRect(-1, -h - 18, 2, 6);
      ctx.fillRect(-1, -h - 5, 2, 2);
      if (active) {
        ctx.globalAlpha = 0.25 + 0.1 * Math.sin(time * 3);
        ctx.fillStyle = col;
        ctx.fillRect(-22, -h - 4, 44, h + 6);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#cfe6ff';
      ctx.font = '7px Silkscreen, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(d.label || '', 0, -h - 26);
    } else if (d.type === 'glyph') {
      ctx.fillStyle = '#151022';
      ctx.fillRect(-21, -12, 42, 12);
      ctx.fillStyle = 'rgba(185,139,255,.35)';
      ctx.fillRect(-18, -15, 36, 4);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.4;
      var pulse = active ? 1 : 0.6 + 0.2 * Math.sin(time * 3);
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(9, -22);
      ctx.lineTo(0, -10);
      ctx.lineTo(-9, -22);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, -27); ctx.lineTo(4, -17);
      ctx.moveTo(4, -27); ctx.lineTo(-4, -17);
      ctx.stroke();
      if (active) {
        ctx.globalAlpha = 0.2 + 0.08 * Math.sin(time * 4);
        ctx.fillStyle = col;
        ctx.fillRect(-26, -42, 52, 42);
      }
    } else if (d.type === 'harmonic') {
      ctx.fillStyle = '#2a1d0a';
      ctx.fillRect(-23, -12, 46, 12);
      ctx.fillStyle = 'rgba(255,191,94,.4)';
      ctx.fillRect(-20, -15, 40, 4);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = active ? 1 : 0.7;
      ctx.beginPath();
      ctx.moveTo(-10, -16);
      ctx.lineTo(-10, -32);
      ctx.moveTo(10, -16);
      ctx.lineTo(10, -32);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -23, 11, Math.PI * 0.15, Math.PI * 0.85, true);
      ctx.stroke();
      if (active) {
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 5);
        for (var i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(0, -24, 12 + i * 7 + (time * 12 % 7), Math.PI * 1.12, Math.PI * 1.88);
          ctx.stroke();
        }
      }
    } else if (d.type === 'link') {
      var es = CF.i18n && CF.i18n.getLang && CF.i18n.getLang() === 'es';
      var lib = d.role === 'vision' ? (es ? 'VERDAD' : 'TRUTH') : (es ? 'ANCLA' : 'ANCHOR');
      var pulse = 0.55 + 0.3 * Math.sin(time * 2.6 + d.x);
      ctx.fillStyle = 'rgba(3,7,16,.86)';
      ctx.fillRect(-17, -10, 34, 10);
      ctx.fillStyle = 'rgba(87,255,168,.3)';
      ctx.fillRect(-14, -13, 28, 4);
      ctx.strokeStyle = active ? '#57ffa8' : '#7ef7ff';
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = active ? 0.9 : pulse;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(0, -40);
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(0, -42, 2, 0, -42, 30);
      g.addColorStop(0, active ? 'rgba(120,255,180,.45)' : 'rgba(126,247,255,' + pulse * 0.4 + ')');
      g.addColorStop(1, 'rgba(60,200,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-30, -72, 60, 60);
      ctx.restore();
      ctx.fillStyle = active ? '#57ffa8' : '#7ef7ff';
      ctx.beginPath();
      ctx.arc(0, -42, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.lineTo(6, -42);
      ctx.lineTo(0, -34);
      ctx.lineTo(-6, -42);
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#d6ffe6';
      ctx.font = '7px Silkscreen, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lib, 0, -58);
      ctx.fillStyle = '#a9bbd8';
      ctx.fillText(d.label || '', 0, 8);
    }
    ctx.restore();
    void theme;
  }

  function drawDoor(ctx, door, openT, time, era) {
    var theme = CF.themes[era];
    var col = door.type === 'glyph' ? '#b98bff' : door.type === 'harmonic' ? '#ffbf5e' : door.type === 'link' ? '#57ffa8' : (era === 'nucleo' ? '#66e0ff' : '#52f0e6');
    var isLink = door.type === 'link';
    var es = CF.i18n && CF.i18n.getLang && CF.i18n.getLang() === 'es';
    ctx.save();
    var alpha = 1 - openT;
    if (alpha <= 0.02) { ctx.restore(); return; }
    ctx.globalAlpha = alpha;
    // pulsing link lock pillar so players can spot the puzzle from afar
    if (isLink && alpha > 0.6) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var pulse = 0.4 + 0.25 * Math.sin(time * 2.4);
      var pg = ctx.createLinearGradient(door.x, door.y - 180, door.x, door.y + door.h);
      pg.addColorStop(0, 'rgba(87,255,168,0)');
      pg.addColorStop(0.65, 'rgba(87,255,168,' + (pulse * 0.32) + ')');
      pg.addColorStop(1, 'rgba(87,255,168,0)');
      ctx.fillStyle = pg;
      ctx.fillRect(door.x - 16, door.y - 180, door.w + 32, door.h + 180);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(5,8,18,.72)';
    ctx.fillRect(door.x, door.y, door.w, door.h);
    var grad = ctx.createLinearGradient(door.x, 0, door.x + door.w, 0);
    grad.addColorStop(0, 'rgba(0,0,0,.1)');
    grad.addColorStop(0.5, 'rgba(' + CF.portal.hexToRgb(col).r + ',' + CF.portal.hexToRgb(col).g + ',' + CF.portal.hexToRgb(col).b + ',.45)');
    grad.addColorStop(1, 'rgba(0,0,0,.1)');
    ctx.fillStyle = grad;
    ctx.fillRect(door.x + 3, door.y + 3, door.w - 6, door.h - 6);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.globalAlpha = alpha * (0.7 + 0.2 * Math.sin(time * 3 + door.x));
    for (var i = 0; i < 6; i++) {
      var yy = door.y + 10 + i * (door.h - 20) / 5;
      ctx.beginPath();
      ctx.moveTo(door.x + 5, yy);
      ctx.lineTo(door.x + door.w - 5, yy + Math.sin(time + i) * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    ctx.fillRect(door.x, door.y, door.w, 1);
    ctx.fillRect(door.x, door.y + door.h - 1, door.w, 1);
    ctx.font = '7px Silkscreen, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e9f2ff';
    ctx.fillText(door.type === 'glyph' ? 'GLYPH' : door.type === 'plates' ? 'ANCHOR' : isLink ? (es ? 'ENLACE' : 'LINK') : 'CORE', door.x + door.w / 2, door.y - 8);
    ctx.restore();
    void theme;
  }

  function drawPlate(ctx, plate, pressed, time) {
    ctx.save();
    ctx.translate(plate.x + plate.w / 2, plate.y + plate.h);
    ctx.fillStyle = '#0b1322';
    ctx.fillRect(-plate.w / 2, -plate.h, plate.w, plate.h);
    ctx.fillStyle = pressed ? '#57ffa8' : 'rgba(82,240,230,.45)';
    ctx.globalAlpha = pressed ? 0.9 : 0.55 + 0.15 * Math.sin(time * 3);
    ctx.fillRect(-plate.w / 2 + 2, -plate.h, plate.w - 4, 2);
    if (pressed) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#57ffa8';
      ctx.fillRect(-plate.w / 2, -plate.h - 10, plate.w, 12);
    }
    ctx.restore();
  }

  function drawCheckpoint(ctx, cp, active, time) {
    ctx.save();
    ctx.translate(cp.x, cp.y);
    ctx.strokeStyle = active ? '#57ffa8' : 'rgba(120,150,200,.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -34);
    ctx.stroke();
    ctx.fillStyle = active ? '#57ffa8' : 'rgba(120,150,200,.6)';
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(14, -29);
    ctx.lineTo(0, -24);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = active ? 0.25 + 0.1 * Math.sin(time * 2.5) : 0.1;
    ctx.fillRect(-12, -50, 24, 50);
    ctx.restore();
  }

  function drawOrb(ctx, orb, time, era) {
    var x = orb.x + Math.sin(time * orb.speed + orb.phase) * (orb.maxX - orb.minX) / 2;
    var y = orb.y + Math.cos(time * orb.speed * 0.7 + orb.phase) * (orb.maxY != null ? (orb.maxY - orb.minY) / 2 : 8);
    ctx.save();
    ctx.translate(x, y + Math.sin(time * 2 + orb.phase) * 3);
    ctx.shadowColor = '#ff5b6e';
    ctx.shadowBlur = 14;
    var grad = ctx.createRadialGradient(0, 0, 1, 0, 0, orb.r + 6);
    grad.addColorStop(0, 'rgba(255,230,220,.9)');
    grad.addColorStop(0.25, 'rgba(255,91,110,.9)');
    grad.addColorStop(0.7, 'rgba(120,20,80,.35)');
    grad.addColorStop(1, 'rgba(80,0,50,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, orb.r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,4,14,.92)';
    ctx.beginPath();
    ctx.arc(0, 0, orb.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,120,140,.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, orb.r, 0, Math.PI * 2);
    ctx.stroke();
    for (var i = 0; i < 3; i++) {
      var a = time * 2 + i * 2.1;
      ctx.fillStyle = 'rgba(255,150,160,.7)';
      ctx.fillRect(Math.cos(a) * orb.r * 1.25, Math.sin(a) * orb.r * 1.25, 1.5, 1.5);
    }
    ctx.restore();
    void era;
  }

  function drawCore(ctx, level, time) {
    if (!level.isFinal) return;
    var cx = 1430;
    var cy = 150;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(0, 0, 4, 0, 0, 90);
    g.addColorStop(0, 'rgba(255,255,255,.7)');
    g.addColorStop(0.15, 'rgba(130,240,255,.5)');
    g.addColorStop(0.45, 'rgba(90,120,255,.16)');
    g.addColorStop(1, 'rgba(40,40,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(130,240,255,.35)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 26 + i * 12, 12 + i * 7, time * (0.2 + i * 0.1), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(240,255,255,.9)';
    ctx.beginPath();
    ctx.arc(0, 0, 4 + Math.sin(time * 4) * 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawGemParticles(ctx, x, y, time) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#7ef7ff';
    for (var i = 0; i < 5; i++) {
      var a = time + i * 1.25;
      ctx.fillRect(x + Math.cos(a) * 12, y + Math.sin(a * 1.3) * 12, 1, 1);
    }
    ctx.restore();
  }

  function txt(ctx, text, x, y, size, color, align, weight) {
    ctx.save();
    ctx.font = (weight ? weight + ' ' : '') + (size || 8) + 'px Silkscreen, monospace';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
    ctx.fillStyle = color || '#e9f2ff';
    ctx.fillText(text, Math.round(x), Math.round(y));
    ctx.restore();
  }

  function panel(ctx, x, y, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,8,18,' + (alpha == null ? 0.72 : alpha) + ')';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(126,190,255,.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = 'rgba(82,240,230,.6)';
    ctx.fillRect(x, y, 6, 1);
    ctx.fillRect(x, y, 1, 6);
    ctx.restore();
  }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function circleRect(cx, cy, r, rect) {
    var nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    var ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    var dx = cx - nx;
    var dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function moveAndCollide(ent, solids, dt, bounds) {
    var wasGround = ent.onGround;
    ent.onGround = false;
    ent.hitWall = false;
    ent.x += ent.vx * dt;
    if (bounds) {
      if (ent.x < bounds.minX) { ent.x = bounds.minX; ent.vx = 0; ent.hitWall = true; }
      if (ent.x + ent.w > bounds.maxX) { ent.x = bounds.maxX - ent.w; ent.vx = 0; ent.hitWall = true; }
    }
    for (var i = 0; i < solids.length; i++) {
      var s = solids[i];
      if (!aabb(ent, s)) continue;
      if (ent.vx > 0) { ent.x = s.x - ent.w; ent.vx = 0; ent.hitWall = true; }
      else if (ent.vx < 0) { ent.x = s.x + s.w; ent.vx = 0; ent.hitWall = true; }
    }
    ent.y += ent.vy * dt;
    for (var j = 0; j < solids.length; j++) {
      var q = solids[j];
      if (!aabb(ent, q)) continue;
      if (ent.vy > 0) {
        ent.y = q.y - ent.h;
        ent.vy = 0;
        ent.onGround = true;
        ent.ground = q;
      } else if (ent.vy < 0) {
        ent.y = q.y + q.h;
        ent.vy = 0;
      }
    }
    if (wasGround && !ent.onGround && ent.vy === 0) {
      // walking off an edge
    }
    return ent;
  }

  function FX() {
    this.parts = [];
    this.max = 260;
  }
  FX.prototype.spawn = function (x, y, opts) {
    if (this.parts.length >= this.max) this.parts.shift();
    opts = opts || {};
    this.parts.push({
      x: x, y: y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      life: opts.life || 1,
      max: opts.life || 1,
      size: opts.size || 2,
      color: opts.color || '#7ef7ff',
      grav: opts.grav || 0,
      drag: opts.drag == null ? 0.99 : opts.drag,
      glow: !!opts.glow
    });
  };
  FX.prototype.burst = function (x, y, color, n, power) {
    n = n || 14;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = (0.3 + Math.random()) * (power || 90);
      this.spawn(x, y, {
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 20,
        life: 0.5 + Math.random() * 0.7,
        size: 1 + Math.random() * 2,
        color: color,
        grav: 60,
        drag: 0.97
      });
    }
  };
  FX.prototype.update = function (dt) {
    for (var i = this.parts.length - 1; i >= 0; i--) {
      var p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  };
  FX.prototype.draw = function (ctx, camX, camY) {
    ctx.save();
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.size, p.size);
    }
    ctx.restore();
  };
  FX.prototype.clear = function () { this.parts.length = 0; };

  window.CF.engine = {
    W: W,
    H: H,
    load: load,
    images: images,
    drawCharacter: drawCharacter,
    drawPortrait: drawPortrait,
    drawBackground: drawBackground,
    drawAtmosphere: drawAtmosphere,
    drawPlatform: drawPlatform,
    drawDecor: drawDecor,
    drawForeground: drawForeground,
    drawScreenForeground: drawScreenForeground,
    drawShard: drawShard,
    drawDevice: drawDevice,
    drawDoor: drawDoor,
    drawPlate: drawPlate,
    drawCheckpoint: drawCheckpoint,
    drawOrb: drawOrb,
    drawCore: drawCore,
    drawGemParticles: drawGemParticles,
    txt: txt,
    panel: panel,
    aabb: aabb,
    circleRect: circleRect,
    clamp: clamp,
    lerp: lerp,
    moveAndCollide: moveAndCollide,
    FX: FX,
    get loaded() { return loaded; }
  };
})();

