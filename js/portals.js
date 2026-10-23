(function () {
  'use strict';

  var CF = window.CF = window.CF || {};
  var registry = [];
  var clock = 0;

  function hexToRgb(hex) {
    hex = String(hex || '#52f0e6').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgba(rgb, a) {
    return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + a + ')';
  }

  function tone(rgb, amount) {
    var r = Math.round(rgb.r + (255 - rgb.r) * amount);
    var g = Math.round(rgb.g + (255 - rgb.g) * amount);
    var b = Math.round(rgb.b + (255 - rgb.b) * amount);
    if (amount < 0) {
      r = Math.round(rgb.r * (1 + amount));
      g = Math.round(rgb.g * (1 + amount));
      b = Math.round(rgb.b * (1 + amount));
    }
    return 'rgb(' + Math.max(0, Math.min(255, r)) + ',' + Math.max(0, Math.min(255, g)) + ',' + Math.max(0, Math.min(255, b)) + ')';
  }

  function pixelHash(x, y, seed) {
    var n = Math.sin(x * 127.1 + y * 311.7 + (seed || 0) * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function steppedRect(ctx, x, y, w, h, step, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x + step * 4, y, w - step * 8, h);
    ctx.fillRect(x + step * 2, y + step, w - step * 4, h - step * 2);
    ctx.fillRect(x + step, y + step * 2, w - step * 2, h - step * 4);
    ctx.fillRect(x, y + step * 4, w, h - step * 8);
  }

  function wrapText(ctx, text, maxWidth, maxLines) {
    var words = String(text || '').split(/\s+/);
    var lines = [];
    var line = '';
    var i = 0;
    while (i < words.length) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = words[i];
        i++;
        if (lines.length === maxLines) break;
      } else {
        line = test;
        i++;
      }
    }
    if (lines.length < maxLines && line) {
      lines.push(line);
      line = '';
    }
    if (i < words.length || line) {
      var last = lines.length ? lines[lines.length - 1] : '';
      while (last.length > 1 && ctx.measureText(last + '...').width > maxWidth) {
        last = last.slice(0, -1);
      }
      if (lines.length) lines[lines.length - 1] = last + '...';
    }
    return lines;
  }

  function drawLabel(ctx, w, h, o) {
    if (!o.label) return;
    var maxW = w - 108;
    var labelSize = 22;
    var labelFont = '700 ' + labelSize + 'px Silkscreen, monospace';
    ctx.font = labelFont;
    var labelW = ctx.measureText(o.label).width;
    if (labelW > maxW) {
      labelSize = Math.max(12, Math.floor(labelSize * maxW / labelW));
      labelFont = '700 ' + labelSize + 'px Silkscreen, monospace';
      ctx.font = labelFont;
    }
    var subSize = 12;
    var subFont = '400 ' + subSize + 'px Silkscreen, monospace';
    ctx.font = subFont;
    var subLines = o.sub ? wrapText(ctx, o.sub, maxW - 8, 3) : [];
    var plateW = Math.min(maxW + 26, w - 56);
    var plateH = 32 + (subLines.length ? 8 + subLines.length * 14 : 0);
    var px = Math.round((w - plateW) / 2);
    var py = Math.round((h - plateH) / 2);
    var edge = tone(o.rgb, -0.45);

    steppedRect(ctx, px - 4, py - 4, plateW + 8, plateH + 8, 2, '#000000');
    steppedRect(ctx, px - 2, py - 2, plateW + 4, plateH + 4, 2, edge);
    steppedRect(ctx, px, py, plateW, plateH, 2, '#03050d');
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fillRect(px + 6, py + 3, plateW - 12, 1);
    ctx.fillStyle = tone(o.rgb, -0.2);
    ctx.fillRect(px + 8, py + plateH - 3, plateW - 16, 1);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = labelFont;
    ctx.fillStyle = '#000000';
    ctx.fillText(o.label, w / 2 + 1, py + 16 + 1);
    ctx.fillStyle = '#f4f9ff';
    ctx.fillText(o.label, w / 2, py + 16);

    if (subLines.length) {
      ctx.font = subFont;
      ctx.fillStyle = '#a9c3e6';
      for (var i = 0; i < subLines.length; i++) {
        ctx.fillStyle = '#000000';
        ctx.fillText(subLines[i], w / 2 + 1, py + 35 + i * 14 + 1);
        ctx.fillStyle = '#a9c3e6';
        ctx.fillText(subLines[i], w / 2, py + 35 + i * 14);
      }
    }

    ctx.fillStyle = tone(o.rgb, 0.25);
    ctx.fillRect(px + 5, py + 6, 3, 3);
    ctx.fillRect(px + plateW - 8, py + 6, 3, 3);
  }

  function drawButton(ctx, w, h, o) {
    o = o || {};
    var rgb = o.rgb || hexToRgb(o.color);
    var t = o.t || 0;
    var hover = !!o.hover;
    var press = o.press || 0;
    var opening = o.opening == null ? 1 : o.opening;
    var intensity = o.intensity == null ? 1 : o.intensity;
    if (hover) intensity *= 1.14;
    var speed = hover ? 1.7 : 1;
    var step = 4;
    var edge = tone(rgb, -0.62);
    var edgeDark = tone(rgb, -0.82);
    var hot = tone(rgb, 0.72);
    var pale = tone(rgb, 0.9);
    var cx = w / 2;
    var cy = h / 2;
    var ix = 24;
    var iy = 20;
    var iw = w - 48;
    var ih = h - 40;
    var rx = iw / 2;
    var ry = ih / 2;

    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.35 + Math.min(1, opening) * 0.65;

    steppedRect(ctx, 0, 0, w, h, step, '#000000');
    steppedRect(ctx, step * 2, step * 2, w - step * 4, h - step * 4, step, '#03050c');
    steppedRect(ctx, step * 3, step * 3, w - step * 6, h - step * 6, step, edgeDark);
    steppedRect(ctx, step * 4, step * 4, w - step * 8, h - step * 8, step, edge);
    steppedRect(ctx, step * 5, step * 5, w - step * 10, h - step * 10, step, '#000000');
    steppedRect(ctx, step * 6, step * 6, w - step * 12, h - step * 12, step, '#03050d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(ix - 2, iy - 2, iw + 4, ih + 4);
    ctx.fillStyle = tone(rgb, -0.88);
    ctx.fillRect(ix, iy, iw, ih);

    var B = 4;
    var bands = [
      { r: 0.24, w: 0.045, tone: 0.92 },
      { r: 0.42, w: 0.05, tone: 0.74 },
      { r: 0.62, w: 0.055, tone: 0.48 },
      { r: 0.82, w: 0.06, tone: 0.24 },
      { r: 0.97, w: 0.035, tone: 0.05 }
    ];

    for (var gy = 0; gy < Math.ceil(ih / B); gy++) {
      for (var gx = 0; gx < Math.ceil(iw / B); gx++) {
        var px = ix + gx * B;
        var py = iy + gy * B;
        var nx = (px + B / 2 - cx) / rx;
        var ny = (py + B / 2 - cy) / ry;
        var r = Math.sqrt(nx * nx + ny * ny);
        if (r > 1.035) continue;
        var a = Math.atan2(ny, nx);
        var wobble = 0.034 * Math.sin(a * 5 + t * 1.8 * speed) +
          0.021 * Math.sin(a * 9 - t * 1.15 * speed) +
          0.011 * Math.sin((gx * 0.8 + gy * 1.1) + t * 0.9 * speed);
        var rr = r + wobble;
        var shade = 0;
        var found = false;
        for (var bi = 0; bi < bands.length; bi++) {
          var bd = bands[bi];
          var width = bd.w * (1 + 0.24 * Math.sin(a * 4 - t * 0.8 + bi));
          if (Math.abs(rr - bd.r) < width) {
            shade = bd.tone + (pixelHash(gx, gy, bi) - 0.5) * 0.2;
            found = true;
            break;
          }
        }
        var angleGlint = Math.abs(Math.atan2(Math.sin(a + 0.85 + 0.14 * Math.sin(t * 0.7)), Math.cos(a + 0.85 + 0.14 * Math.sin(t * 0.7))));
        if (angleGlint < 0.18 && rr > 0.18 && rr < 0.93) shade = Math.max(shade, 0.8);
        if (!found && r < 0.14) shade = 0.95;
        if (!found && pixelHash(gx, gy, Math.floor(t * 4 * speed)) > 0.972 && r < 0.96) {
          shade = 0.35 + pixelHash(gx + 3, gy + 7, 4) * 0.55;
          found = true;
        }
        if (!found) {
          var base = 0.055 + (1 - Math.min(1, r)) * 0.045;
          ctx.fillStyle = 'rgba(' + Math.round(rgb.r * base) + ',' + Math.round(rgb.g * base) + ',' + Math.round(rgb.b * base) + ',1)';
          ctx.fillRect(px, py, B, B);
          continue;
        }
        ctx.fillStyle = shade > 0.8 ? pale : shade > 0.5 ? hot : tone(rgb, shade);
        ctx.fillRect(px, py, B, B);
        if (shade > 0.86) {
          ctx.fillStyle = '#f2ffff';
          ctx.fillRect(px + 1, py + 1, 2, 2);
        }
      }
    }

    for (var f = 0; f < 14; f++) {
      var fa = pixelHash(f, 9, 2) * Math.PI * 2 + t * (0.18 + pixelHash(f, 3, 1) * 0.2) * speed;
      var fr = 0.68 + pixelHash(f, 6, 5) * 0.42;
      var fx = Math.round(cx + Math.cos(fa) * rx * fr);
      var fy = Math.round(cy + Math.sin(fa) * ry * fr);
      if (fx < ix || fx > ix + iw - B || fy < iy || fy > iy + ih - B) continue;
      var fs = pixelHash(f, 11, Math.floor(t * 3)) > 0.55 ? 4 : 2;
      ctx.fillStyle = f % 3 === 0 ? pale : tone(rgb, 0.5);
      ctx.fillRect(fx, fy, fs, fs);
    }

    var marker = Math.floor(t * 3.2) % 6;
    for (var k = 0; k < 6; k++) {
      var mx = 28 + k * Math.floor((w - 56) / 6);
      ctx.fillStyle = k === marker ? pale : tone(rgb, -0.25);
      ctx.fillRect(mx, h - 15, 10, 3);
    }
    ctx.fillStyle = tone(rgb, 0.3);
    ctx.fillRect(20, 14, 10, 3);
    ctx.fillRect(w - 30, 14, 10, 3);
    ctx.fillRect(20, h - 17, 10, 3);
    ctx.fillRect(w - 30, h - 17, 10, 3);
    drawLabel(ctx, w, h, { label: o.label, sub: o.sub, rgb: rgb });

    if (press > 0.05) {
      ctx.fillStyle = rgba(rgb, 0.45 * press);
      ctx.fillRect(ix, iy, iw, 3);
      ctx.fillRect(ix, iy + ih - 3, iw, 3);
    }
    ctx.restore();
  }

  function draw(ctx, size, o) {
    o = o || {};
    var rgb = o.rgb || hexToRgb(o.color);
    var t = o.t || 0;
    var hover = !!o.hover;
    var press = o.press || 0;
    var opening = o.opening == null ? 1 : o.opening;
    var intensity = o.intensity == null ? 1 : o.intensity;
    if (hover) intensity *= 1.18;
    var cx = size / 2;
    var cy = size / 2;
    var baseR = size * 0.335;
    var ease = opening < 1 ? 1 - Math.pow(1 - opening, 3) : 1;
    var R = baseR * (0.42 + ease * 0.58) * (hover ? 1.045 : 1);
    var speed = hover ? 1.75 : 1;

    ctx.save();
    ctx.clearRect(0, 0, size, size);
    ctx.translate(cx, cy);
    ctx.scale(1 + press * 0.045, 1 + press * 0.045);
    ctx.globalAlpha = 0.25 + ease * 0.75;
    ctx.globalCompositeOperation = 'lighter';

    var glow = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 1.55);
    glow.addColorStop(0, rgba(rgb, 0.34 * intensity));
    glow.addColorStop(0.45, rgba(rgb, 0.14 * intensity));
    glow.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    var disk = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.92);
    disk.addColorStop(0, 'rgba(2,4,12,.25)');
    disk.addColorStop(0.68, 'rgba(3,5,14,.82)');
    disk.addColorStop(1, 'rgba(2,3,9,.35)');
    ctx.fillStyle = disk;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.92, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'butt';

    var rings = [
      { r: 1.0, w: 2.2, speed: 0.45, dash: [6, 5], alpha: 0.85 },
      { r: 0.82, w: 1.4, speed: -0.75, dash: [3, 6], alpha: 0.6 },
      { r: 0.63, w: 2.8, speed: 1.15, dash: [10, 4], alpha: 0.75 },
      { r: 0.38, w: 1.2, speed: -1.7, dash: [2, 3], alpha: 0.9 }
    ];
    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i];
      var rr = R * ring.r;
      var phase = t * ring.speed * speed + i * 1.3;
      ctx.save();
      ctx.rotate(phase);
      ctx.strokeStyle = rgba(rgb, ring.alpha * intensity);
      ctx.lineWidth = ring.w;
      ctx.setLineDash(ring.dash);
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);

    var arms = 7;
    for (var a = 0; a < arms; a++) {
      var start = t * 0.85 * speed + a * (Math.PI * 2 / arms);
      var len = Math.PI * (0.4 + 0.18 * Math.sin(t * 1.3 + a));
      var r0 = R * (0.2 + 0.08 * Math.sin(t + a));
      var r1 = R * (0.66 + 0.14 * Math.cos(t * 0.8 + a));
      ctx.strokeStyle = rgba(rgb, (0.18 + 0.18 * (a % 2)) * intensity);
      ctx.lineWidth = a % 3 === 0 ? 2.4 : 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, (r0 + r1) / 2, start, start + len);
      ctx.stroke();
    }

    var particles = 20;
    for (var p = 0; p < particles; p++) {
      var seed = p * 2.399963;
      var orbit = R * (0.3 + 0.66 * ((p * 37) % 100) / 100);
      var ang = seed + t * (0.5 + (p % 5) * 0.16) * speed * (p % 2 ? 1 : -1);
      var px = Math.cos(ang) * orbit;
      var py = Math.sin(ang) * orbit * 0.92;
      var ps = p % 4 === 0 ? 2.2 : 1.4;
      ctx.fillStyle = rgba(rgb, (0.35 + 0.55 * ((p * 17) % 10) / 10) * intensity);
      ctx.fillRect(Math.round(px) - ps / 2, Math.round(py) - ps / 2, ps, ps);
    }

    var core = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.42);
    core.addColorStop(0, 'rgba(255,255,255,' + (0.85 * intensity) + ')');
    core.addColorStop(0.16, rgba(rgb, 0.95 * intensity));
    core.addColorStop(0.5, rgba(rgb, 0.25 * intensity));
    core.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.46, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    var ticks = 16;
    for (var k = 0; k < ticks; k++) {
      var ta = (k / ticks) * Math.PI * 2 + t * 0.12;
      var tr = R * 1.06;
      var tx = Math.cos(ta) * tr;
      var ty = Math.sin(ta) * tr;
      var on = (k + Math.floor(t * 2.6)) % 4 === 0;
      ctx.fillStyle = on ? rgba(rgb, 0.9) : rgba(rgb, 0.22);
      ctx.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, on ? 2 : 1, on ? 2 : 1);
    }

    if (press > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(rgb, 0.55 * press);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, R * (1 + (1 - press) * 0.5), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawWorldPortal(ctx, x, y, size, color, t, active) {
    var rgb = hexToRgb(color);
    var cx = x;
    var ry = size * 0.86;
    var cy = y - ry * 0.8;
    var rx = size * 0.5;
    var floor = y + 2;
    ctx.save();
    ctx.globalAlpha = active ? 1 : 0.4;

    // stone pillars rooted on the ground so the gate never floats
    var pillarW = 14;
    ctx.fillStyle = '#2a2620';
    ctx.fillRect(cx - rx - pillarW * 0.4, cy - ry * 0.1, pillarW * 0.8, floor - (cy - ry * 0.1));
    ctx.fillRect(cx + rx - pillarW * 0.4, cy - ry * 0.1, pillarW * 0.8, floor - (cy - ry * 0.1));
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(cx - rx - pillarW * 0.4, cy - ry * 0.1, 2, floor - (cy - ry * 0.1));
    ctx.fillRect(cx + rx - pillarW * 0.4, cy - ry * 0.1, 2, floor - (cy - ry * 0.1));
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(cx, floor, rx + 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);

    // soft community glow (translucent, keeps the level art visible behind)
    var glow = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx * 2.1);
    glow.addColorStop(0, rgba(rgb, 0.35));
    glow.addColorStop(0.5, rgba(rgb, 0.13));
    glow.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, rx * 2.1, 0, Math.PI * 2);
    ctx.fill();

    // rotating rune rings, The Past Within style
    ctx.globalCompositeOperation = 'lighter';
    var rings = [
      { r: 1.0, w: 2.4, speed: 0.5, dash: [8, 6], alpha: 0.9 },
      { r: 0.8, w: 1.6, speed: -0.8, dash: [4, 7], alpha: 0.7 },
      { r: 0.6, w: 3, speed: 1.2, dash: [12, 5], alpha: 0.8 },
      { r: 0.38, w: 1.4, speed: -1.9, dash: [3, 4], alpha: 0.95 }
    ];
    for (var i = 0; i < rings.length; i++) {
      var rg = rings[i];
      ctx.save();
      ctx.rotate(t * rg.speed + i * 1.35);
      ctx.strokeStyle = rgba(rgb, rg.alpha);
      ctx.lineWidth = rg.w;
      ctx.setLineDash(rg.dash);
      ctx.beginPath();
      ctx.arc(0, 0, rx * rg.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);

    // orbiting sparks
    for (var p = 0; p < 22; p++) {
      var seed = p * 2.399963;
      var orbit = rx * (0.34 + 0.6 * ((p * 37) % 100) / 100);
      var ang = seed + t * (0.6 + (p % 5) * 0.18) * (p % 2 ? 1 : -1);
      var px = Math.cos(ang) * orbit;
      var py = Math.sin(ang) * orbit;
      var ps = p % 4 === 0 ? 2.4 : 1.5;
      ctx.fillStyle = rgba(rgb, 0.4 + 0.5 * ((p * 17) % 10) / 10);
      ctx.fillRect(Math.round(px) - ps / 2, Math.round(py) - ps / 2, ps, ps);
    }

    // bright core horizon
    var core = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 0.6);
    core.addColorStop(0, 'rgba(255,255,255,' + (active ? 0.9 : 0.4) + ')');
    core.addColorStop(0.2, rgba(rgb, active ? 0.85 : 0.4));
    core.addColorStop(0.6, rgba(rgb, 0.2));
    core.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, rx * 0.62, 0, Math.PI * 2);
    ctx.fill();

    // tick crown
    ctx.globalCompositeOperation = 'source-over';
    var ticks = 18;
    for (var k = 0; k < ticks; k++) {
      var ta = (k / ticks) * Math.PI * 2 + t * 0.16;
      var tr = rx * 1.06;
      var on = (k + Math.floor(t * 2.8)) % 4 === 0;
      ctx.fillStyle = on ? rgba(rgb, 0.95) : rgba(rgb, 0.28);
      ctx.fillRect(Math.cos(ta) * tr - 1, Math.sin(ta) * tr - 1, on ? 3 : 2, on ? 3 : 2);
    }

    // outer stone arch (drawn unscaled so it stays crisp)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(cx, cy);
    ctx.save();
    ctx.scale(1, ry / rx);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(20,24,32,.9)';
    ctx.beginPath();
    ctx.arc(0, 0, rx * 1.02, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(rgb, 0.75);
    ctx.beginPath();
    ctx.arc(0, 0, rx * 1.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  function bind(canvas, color) {
    var btn = canvas.closest('button') || canvas;
    var state = {
      canvas: canvas,
      ctx: canvas.getContext('2d'),
      color: color || '#52f0e6',
      rgb: hexToRgb(color || '#52f0e6'),
      label: btn.getAttribute('data-label') || '',
      sub: btn.getAttribute('data-sub') || '',
      hover: false,
      press: 0,
      opening: 0,
      born: clock
    };
    function over() {
      if (!state.hover) {
        state.hover = true;
        CF.audio.play(CF.cues.uiHover, { gain: 0.6 });
      }
    }
    function out() { state.hover = false; }
    function down() {
      state.press = 1;
      CF.audio.play(CF.cues.uiClick, { gain: 0.8 });
    }
    function up() { state.press = 0; }
    btn.addEventListener('pointerenter', over);
    btn.addEventListener('pointerleave', out);
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('focus', over);
    btn.addEventListener('blur', out);
    registry.push(state);
    return state;
  }

  function drawAll(dt) {
    clock += dt;
    for (var i = registry.length - 1; i >= 0; i--) {
      var s = registry[i];
      if (!s.canvas.isConnected) {
        registry.splice(i, 1);
        continue;
      }
      s.opening = Math.min(1, s.opening + dt * 2.4);
      s.press = Math.max(0, s.press - dt * 3.4);
      drawButton(s.ctx, s.canvas.width, s.canvas.height, {
        color: s.color,
        rgb: s.rgb,
        label: s.label,
        sub: s.sub,
        t: clock,
        hover: s.hover,
        press: s.press,
        opening: s.opening,
        intensity: 1
      });
    }
  }

  CF.portal = {
    draw: draw,
    drawWorld: drawWorldPortal,
    bind: bind,
    drawAll: drawAll,
    hexToRgb: hexToRgb,
    clear: function () { registry.length = 0; },
    get clock() { return clock; }
  };
})();
