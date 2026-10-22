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
    ctx.translate(xFeet, yFeet);
    if (dir < 0) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
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
    ctx.save();
    if (hidden) {
      ctx.globalAlpha = 0.78;
      ctx.shadowColor = theme.accent2;
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = theme.platformDark;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = hidden ? 'rgba(77,180,190,.28)' : theme.platform;
    ctx.fillRect(p.x + 2, p.y + 2, p.w - 4, Math.max(3, p.h - 4));
    ctx.fillStyle = theme.platformTop;
    ctx.fillRect(p.x, p.y, p.w, 3);
    ctx.fillStyle = hidden ? theme.accent2 : theme.platformEdge;
    ctx.fillRect(p.x, p.y, p.w, 1);
    if (quality !== 'low') {
      var cracks = Math.floor(p.w / 46);
      for (var i = 0; i < cracks; i++) {
        var hx = p.x + 12 + hash(p.x + i * 31) * (p.w - 24);
        var hy = p.y + 8 + hash(p.y + i * 17) * Math.max(2, p.h - 14);
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        ctx.fillRect(Math.round(hx), Math.round(hy), 1, 4 + hash(i + p.x) * 5);
      }
      if (era === 'prehistoria' && p.w > 60) {
        ctx.strokeStyle = 'rgba(86,140,72,.55)';
        ctx.lineWidth = 1;
        for (var v = 0; v < Math.floor(p.w / 90) + 1; v++) {
          var vx = p.x + 18 + v * 90;
          var swing = Math.sin(time * 1.2 + v + p.x) * 2;
          ctx.beginPath();
          ctx.moveTo(vx, p.y + 3);
          ctx.quadraticCurveTo(vx + 4 + swing, p.y + 14, vx + 2 + swing, p.y + 20 + hash(v) * 8);
          ctx.stroke();
        }
      } else if (era === 'antiguedad' && p.w > 70) {
        ctx.fillStyle = 'rgba(215,185,138,.18)';
        for (var c = 0; c < Math.floor(p.w / 70); c++) {
          var ccx = p.x + 12 + c * 70;
          ctx.fillRect(ccx, p.y + 3, 2, Math.min(18, p.h - 5));
          ctx.fillRect(ccx + 8, p.y + 3, 1, Math.min(18, p.h - 5));
        }
      } else if (era === 'nucleo') {
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 2 + p.x);
        ctx.fillStyle = theme.accent;
        for (var e = 0; e < Math.floor(p.w / 34); e++) {
          ctx.fillRect(p.x + 8 + e * 34, p.y + 2, 10, 1);
        }
        ctx.globalAlpha = 1;
      }
    }
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
    }
    ctx.restore();
    void theme;
  }

  function drawDoor(ctx, door, openT, time, era) {
    var theme = CF.themes[era];
    var col = door.type === 'glyph' ? '#b98bff' : door.type === 'harmonic' ? '#ffbf5e' : (era === 'nucleo' ? '#66e0ff' : '#52f0e6');
    ctx.save();
    var alpha = 1 - openT;
    if (alpha <= 0.02) { ctx.restore(); return; }
    ctx.globalAlpha = alpha;
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
    ctx.fillText(door.type === 'glyph' ? 'GLYPH' : door.type === 'plates' ? 'ANCHOR' : 'CORE', door.x + door.w / 2, door.y - 8);
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
    drawPlatform: drawPlatform,
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
