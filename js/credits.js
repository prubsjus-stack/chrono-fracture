(function () {
  'use strict';

  var CF = window.CF = window.CF || {};
  var t = function (k) { return CF.i18n.t(k); };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var state = { raf: 0, timer: 0, done: null, canvas: null, ctx: null, stars: [], run: false };

  function finish() {
    if (!state.run) return;
    state.run = false;
    cancelAnimationFrame(state.raf);
    clearTimeout(state.timer);
    var cb = state.done;
    state.done = null;
    if (cb) cb();
  }

  function stop() {
    state.run = false;
    cancelAnimationFrame(state.raf);
    clearTimeout(state.timer);
    state.done = null;
  }

  function starfield(canvas) {
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0;
    var stars = [];
    function resize() {
      w = canvas.width = Math.max(320, Math.min(1920, window.innerWidth));
      h = canvas.height = Math.max(200, Math.min(1080, window.innerHeight));
      stars = [];
      for (var i = 0; i < 150; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: 0.3 + Math.random() * 0.7,
          ph: Math.random() * Math.PI * 2,
          c: Math.random() < 0.25 ? '185,139,255' : Math.random() < 0.5 ? '82,240,230' : '233,242,255'
        });
      }
    }
    resize();
    window.addEventListener('resize', resize);
    var t0 = performance.now();
    function frame(now) {
      if (!state.run) return;
      var dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(3,5,12,.22)';
      ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.y += s.z * 9 * dt;
        if (s.y > h + 4) { s.y = -4; s.x = Math.random() * w; }
        var a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(now * 0.0012 + s.ph));
        ctx.fillStyle = 'rgba(' + s.c + ',' + a.toFixed(3) + ')';
        var sz = s.z > 0.8 ? 2 : 1;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), sz, sz);
      }
      state.raf = requestAnimationFrame(frame);
    }
    state.raf = requestAnimationFrame(frame);
    return { resize: resize };
  }

  function blockHtml(sec) {
    if (sec.final) {
      return '<div class="credit-block">' +
        '<div class="credit-logo">BROKEN<br>FREQUENCY</div>' +
        '<p class="small">' + esc(t('credits.final')) + '</p>' +
        '<p class="small" style="margin-top:26px">' + esc(t('credits.legal')) + '</p>' +
        '<p class="small" style="margin-top:18px">' + esc(CF.TITLE) + ' v' + esc(CF.VERSION) + ' — ' + esc(t('credits.engine')) + '</p>' +
        '</div>';
    }
    var names = (sec.names || []).filter(Boolean);
    if (!names.length) return '';
    var body;
    if (sec.columns) {
      body = '<div class="cols">' + names.map(function (n) {
        return '<p>' + esc(n) + '</p>';
      }).join('') + '</div>';
    } else {
      body = names.map(function (n) {
        return '<p class="' + (sec.big ? 'big' : '') + '">' + esc(n) + '</p>';
      }).join('');
    }
    return '<div class="credit-block">' +
      '<h3>' + esc(t(sec.titleKey)) + '</h3>' +
      (sec.role ? '<p class="role">' + esc(sec.role) + '</p>' : '') +
      body +
      '</div>';
  }

  function render(container, onDone) {
    stop();
    var sections = (CF.credits || []).map(blockHtml).join('');
    container.innerHTML = '' +
      '<div class="credits-screen">' +
        '<canvas class="credits-bg"></canvas>' +
        '<button class="btn btn--ghost btn--sm credit-skip" data-action="skip">' + esc(t('credits.skip')) + '</button>' +
        '<div class="credits-scroll"><div class="credits-roll" data-roll>' + sections + '</div></div>' +
        '<div class="credits-hint">' + esc(t('credits.hint')) + '</div>' +
      '</div>';

    CF.i18n.applyDom(container);
    state.canvas = container.querySelector('.credits-bg');
    state.ctx = state.canvas ? state.canvas.getContext('2d') : null;
    state.run = true;
    state.done = onDone;
    if (state.canvas) starfield(state.canvas);

    var roll = container.querySelector('[data-roll]');
    var height = roll ? roll.scrollHeight : 2400;
    var duration = Math.max(46, Math.min(115, height / 28));
    if (roll) {
      roll.style.setProperty('--dur', duration.toFixed(1) + 's');
      void roll.offsetHeight;
      roll.classList.add('run');
    }

    state.timer = setTimeout(finish, duration * 1000 + 250);

    var skip = container.querySelector('[data-action="skip"]');
    if (skip) skip.addEventListener('click', function () {
      CF.audio.play(CF.cues.uiBack, { gain: 0.5 });
      finish();
    });
    return duration;
  }

  window.CF.creditsUI = { render: render, stop: stop };
})();
