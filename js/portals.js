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
    ctx.save();
    ctx.translate(x, y);
    if (!active) {
      ctx.globalAlpha = 0.35;
    }
    draw(ctx, size, {
      color: color,
      rgb: rgb,
      t: t,
      hover: active,
      press: 0,
      intensity: active ? 1.15 : 0.55,
      opening: active ? 1 : 0.7
    });
    ctx.restore();
  }

  function bind(canvas, color) {
    var state = {
      canvas: canvas,
      ctx: canvas.getContext('2d'),
      color: color || '#52f0e6',
      rgb: hexToRgb(color || '#52f0e6'),
      hover: false,
      press: 0,
      opening: 0,
      born: clock
    };
    var btn = canvas.closest('button') || canvas;
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
      var size = s.canvas.width;
      draw(s.ctx, size, {
        color: s.color,
        rgb: s.rgb,
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
