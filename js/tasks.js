(function () {
  'use strict';

  var CF = window.CF = window.CF || {};

  var TXT = {
    es: {
      kicker: 'CONSOLA DE {role}',
      echoTitle: 'CALIBRACIÓN DE ECO',
      echoDesc: 'Sigue la secuencia de pulsos y repítela. La consola solo responde a tu científico.',
      echoListen: 'ESCUCHA LOS PULSOS...',
      echoRepeat: 'REPITE LA SECUENCIA',
      echoWrong: 'SECUENCIA ERRÓNEA',
      resTitle: 'SINTONÍA ARMÓNICA',
      resDesc: 'Detén cada aguja dentro de la banda estable. Sin sonido: confía en la vista.',
      resLock: 'FIJAR',
      resStable: 'ESTABLE',
      resWrong: 'FUERA DE BANDA',
      resChannel: 'CANAL {n}',
      glyphTitle: 'DESCIFRADO GLÍFICO',
      glyphDesc: 'Marca los glifos en el orden de la clave. Tu voz no hace falta aquí.',
      glyphKey: 'CLAVE',
      glyphWrong: 'ORDEN INCORRECTO',
      glyphOrder: 'MARCA LOS GLIFOS',
      step: 'PASO {n}/{m}',
      only: 'SOLO TÚ VES ESTA CONSOLA',
      complete: 'TAREA COMPLETA',
      abort: 'ABANDONAR',
      esc: 'ESC PARA SALIR',
      roleEcho: 'ECO',
      roleRes: 'RESONANCIA',
      roleGlyph: 'GLIFO'
    },
    en: {
      kicker: '{role} CONSOLE',
      echoTitle: 'ECHO CALIBRATION',
      echoDesc: 'Follow the pulse sequence and repeat it. The console only answers your scientist.',
      echoListen: 'LISTEN TO THE PULSES...',
      echoRepeat: 'REPEAT THE SEQUENCE',
      echoWrong: 'WRONG SEQUENCE',
      resTitle: 'HARMONIC TUNING',
      resDesc: 'Stop each needle inside the stable band. No sound: trust your eyes.',
      resLock: 'LOCK',
      resStable: 'STABLE',
      resWrong: 'OUT OF BAND',
      resChannel: 'CHANNEL {n}',
      glyphTitle: 'GLYPH DECODING',
      glyphDesc: 'Mark the glyphs in the key order. Your voice is not needed here.',
      glyphKey: 'KEY',
      glyphWrong: 'WRONG ORDER',
      glyphOrder: 'MARK THE GLYPHS',
      step: 'STEP {n}/{m}',
      only: 'ONLY YOU CAN SEE THIS CONSOLE',
      complete: 'TASK COMPLETE',
      abort: 'ABANDON',
      esc: 'ESC TO LEAVE',
      roleEcho: 'ECHO',
      roleRes: 'RESONANCE',
      roleGlyph: 'GLYPH'
    },
    pt: {
      kicker: 'CONSOLE DE {role}',
      echoTitle: 'CALIBRAÇÃO DE ECO',
      echoDesc: 'Siga a sequência de pulsos e repita. O console só responde ao seu cientista.',
      echoListen: 'OUÇA OS PULSOS...',
      echoRepeat: 'REPITA A SEQUÊNCIA',
      echoWrong: 'SEQUÊNCIA ERRADA',
      resTitle: 'SINTONIA HARMÔNICA',
      resDesc: 'Pare cada agulha dentro da faixa estável. Sem som: confie na visão.',
      resLock: 'FIXAR',
      resStable: 'ESTÁVEL',
      resWrong: 'FORA DA FAIXA',
      resChannel: 'CANAL {n}',
      glyphTitle: 'DECIFRAÇÃO GLÍFICA',
      glyphDesc: 'Marque os glifos na ordem da chave. Sua voz não é necessária aqui.',
      glyphKey: 'CHAVE',
      glyphWrong: 'ORDEM INCORRETA',
      glyphOrder: 'MARQUE OS GLIFOS',
      step: 'PASSO {n}/{m}',
      only: 'SÓ VOCÊ VÊ ESTE CONSOLE',
      complete: 'TAREFA COMPLETA',
      abort: 'ABANDONAR',
      esc: 'ESC PARA SAIR',
      roleEcho: 'ECO',
      roleRes: 'RESSONÂNCIA',
      roleGlyph: 'GLIFO'
    }
  };

  var GLYPHS = [
    [1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 1, 0, 0, 1, 0, 0, 1, 1],
    [0, 1, 0, 1, 1, 1, 0, 1, 0],
    [1, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 1, 1, 1, 0, 1, 0, 1, 0],
    [1, 0, 0, 0, 1, 1, 1, 0, 1],
    [1, 1, 1, 0, 1, 0, 1, 0, 1],
    [0, 0, 1, 1, 1, 0, 1, 0, 0]
  ];

  var state = null;
  var layer = null;
  var keyHandler = null;

  function tx(key, vars) {
    var lang = (CF.i18n && CF.i18n.getLang) ? CF.i18n.getLang() : 'es';
    var table = TXT[lang] || TXT.es;
    var value = table[key] || TXT.es[key] || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        value = value.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
      });
    }
    return value;
  }

  function character(id) {
    for (var i = 0; i < CF.characters.length; i++) {
      if (CF.characters[i].id === id) return CF.characters[i];
    }
    return CF.characters[0];
  }

  function glyphPixels(pattern, cls) {
    var html = '<span class="glyph-pixels ' + (cls || '') + '">';
    for (var i = 0; i < pattern.length; i++) {
      html += '<i class="' + (pattern[i] ? 'on' : '') + '"></i>';
    }
    return html + '</span>';
  }

  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function difficultyId() {
    return (state && state.opts && state.opts.difficulty) || 'normal';
  }

  function sequenceLength() {
    var d = difficultyId();
    return d === 'easy' ? 3 : d === 'hard' ? 5 : 4;
  }

  function addTimer(fn, ms) {
    if (!state) return null;
    var id = setTimeout(function () {
      if (!state) return;
      fn();
    }, ms);
    state.timers.push(id);
    return id;
  }

  function clearTimers() {
    if (!state) return;
    for (var i = 0; i < state.timers.length; i++) clearTimeout(state.timers[i]);
    state.timers = [];
  }

  function stopRaf() {
    if (state && state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
  }

  function setReadout(text, tone) {
    if (!state) return;
    var el = layer && layer.querySelector('[data-task-readout]');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('ok', 'err');
    if (tone) el.classList.add(tone);
  }

  function setStatus(text, tone) {
    if (!state) return;
    var el = layer && layer.querySelector('[data-task-status]');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('ok', 'err');
    if (tone) el.classList.add(tone);
  }

  function updateProgress() {
    if (!state) return;
    var total = state.type === 'resonance' ? state.meters.length : state.total;
    var done = state.type === 'resonance'
      ? state.meters.filter(function (m) { return m.locked; }).length
      : state.input.length;
    var pips = layer && layer.querySelector('[data-task-pips]');
    if (pips) {
      var html = '';
      for (var i = 0; i < total; i++) html += '<i class="' + (i < done ? 'on' : '') + '"></i>';
      pips.innerHTML = html;
    }
    var step = layer && layer.querySelector('[data-task-step]');
    if (step) step.textContent = tx('step', { n: Math.min(done + 1, total), m: total });
  }

  function flashError() {
    if (!state || !layer) return;
    layer.classList.remove('is-error');
    void layer.offsetWidth;
    layer.classList.add('is-error');
    addTimer(function () {
      if (layer) layer.classList.remove('is-error');
    }, 500);
  }

  function completeTask() {
    if (!state || state.done) return;
    state.done = true;
    state.locked = true;
    clearTimers();
    stopRaf();
    setReadout(tx('complete'), 'ok');
    setStatus(tx('complete'), 'ok');
    if (layer) layer.classList.add('is-success');
    if (CF.audio) CF.audio.play(CF.cues.confirm, { gain: 0.75 });
    addTimer(function () { finish(true); }, 720);
  }

  function cancelTask() {
    if (!state || state.done) return;
    if (CF.audio) CF.audio.play(CF.cues.uiBack, { gain: 0.5 });
    finish(false);
  }

  function finish(success) {
    var opts = state && state.opts;
    close();
    if (!opts) return;
    if (success && opts.onComplete) opts.onComplete();
    if (!success && opts.onCancel) opts.onCancel();
  }

  function buildFrame(role, type) {
    var accent = role.accent;
    var title = type === 'echo' ? tx('echoTitle') : type === 'resonance' ? tx('resTitle') : tx('glyphTitle');
    var desc = type === 'echo' ? tx('echoDesc') : type === 'resonance' ? tx('resDesc') : tx('glyphDesc');
    var roleLabel = type === 'echo' ? tx('roleEcho') : type === 'resonance' ? tx('roleRes') : tx('roleGlyph');
    var html = '' +
      '<div class="task-frame" style="--accent:' + accent + ';--accent-rgb:' + role.accentRgb + '">' +
        '<div class="task-top">' +
          '<div>' +
            '<div class="task-kicker">' + tx('kicker', { role: roleLabel }) + '</div>' +
            '<h2>' + title + '</h2>' +
          '</div>' +
          '<button class="task-close" type="button" data-task-cancel aria-label="' + tx('esc') + '">ESC</button>' +
        '</div>' +
        '<div class="task-main">' +
          '<div class="task-stage" data-task-stage></div>' +
          '<aside class="task-side">' +
            '<div class="task-portrait"><canvas width="112" height="112" aria-hidden="true"></canvas></div>' +
            '<div class="task-role">' + (CF.i18n ? CF.i18n.t(role.nameKey) : role.id) + '</div>' +
            '<p class="task-desc">' + desc + '</p>' +
            '<div class="task-status" data-task-status>' + tx('glyphOrder') + '</div>' +
            '<div class="task-pips" data-task-pips></div>' +
            '<div class="task-step" data-task-step></div>' +
            '<div class="task-only">' + tx('only') + '</div>' +
          '</aside>' +
        '</div>' +
        '<div class="task-bottom">' +
          '<span class="task-readout" data-task-readout>' + tx('glyphOrder') + '</span>' +
          '<div class="task-actions">' +
            '<span class="task-esc">' + tx('esc') + '</span>' +
            '<button class="task-abort" type="button" data-task-cancel>' + tx('abort') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    var el = document.createElement('div');
    el.className = 'task-layer';
    el.setAttribute('data-task-layer', '');
    el.innerHTML = html;
    return el;
  }

  function buildEcho(stage) {
    var labels = ['1', '2', '3', '4'];
    var html = '<div class="echo-console">' +
      '<div class="echo-sonar" aria-hidden="true">' +
        '<i></i><i></i><i></i><i></i>' +
        '<b></b>' +
      '</div>' +
      '<div class="echo-pads">';
    for (var i = 0; i < 4; i++) {
      html += '<button type="button" class="echo-pad echo-pad--' + i + '" data-echo="' + i + '">' +
        '<span>' + labels[i] + '</span><small>' + (i === 0 ? 'N' : i === 1 ? 'E' : i === 2 ? 'S' : 'O') + '</small>' +
      '</button>';
    }
    html += '</div><div class="echo-tip">' + tx('echoRepeat') + '</div></div>';
    stage.innerHTML = html;
    state.seq = [];
    var last = -1;
    for (var s = 0; s < state.total; s++) {
      var n = Math.floor(Math.random() * 4);
      if (n === last) n = (n + 1 + Math.floor(Math.random() * 3)) % 4;
      state.seq.push(n);
      last = n;
    }
    state.input = [];
    state.showing = true;
    state.locked = true;
    for (var p = 0; p < 4; p++) {
      (function (idx) {
        var btn = stage.querySelector('[data-echo="' + idx + '"]');
        if (btn) {
          btn.addEventListener('click', function () {
            if (!state || state.type !== 'echo' || state.locked || state.showing || state.done) return;
            if (idx === state.seq[state.input.length]) {
              state.input.push(idx);
              btn.classList.add('on');
              if (CF.audio) CF.audio.play(CF.cues.uiClick, { gain: 0.5 });
              addTimer(function () { btn.classList.remove('on'); }, 180);
              updateProgress();
              if (state.input.length >= state.seq.length) completeTask();
            } else {
              flashError();
              setReadout(tx('echoWrong'), 'err');
              if (CF.audio) CF.audio.play(CF.cues.error, { gain: 0.6 });
              state.locked = true;
              addTimer(function () {
                if (!state || state.done) return;
                state.input = [];
                updateProgress();
                playEcho();
              }, 760);
            }
          });
        }
      })(p);
    }
    addTimer(playEcho, 520);
  }

  function playEcho() {
    if (!state || state.type !== 'echo' || state.done) return;
    var stage = layer && layer.querySelector('[data-task-stage]');
    if (!stage) return;
    state.input = [];
    state.showing = true;
    state.locked = true;
    updateProgress();
    setReadout(tx('echoListen'));
    setStatus(tx('echoListen'));
    var i = 0;
    function step() {
      if (!state || state.type !== 'echo' || state.done) return;
      if (i >= state.seq.length) {
        state.showing = false;
        state.locked = false;
        setReadout(tx('echoRepeat'));
        setStatus(tx('echoRepeat'));
        return;
      }
      var idx = state.seq[i++];
      var pad = stage.querySelector('[data-echo="' + idx + '"]');
      if (pad) {
        pad.classList.add('on');
        if (CF.audio) CF.audio.play(CF.cues.uiClick, { gain: 0.45, rate: 0.9 + idx * 0.08 });
        addTimer(function () { pad.classList.remove('on'); }, 280);
      }
      addTimer(step, 460);
    }
    step();
  }

  function buildResonance(stage) {
    state.meters = [];
    var html = '<div class="resonance-console">';
    for (var i = 0; i < 3; i++) {
      var zoneStart = 34 + i * 6;
      var zoneSize = 19 - i * 2;
      state.meters.push({
        speed: 1.15 + i * 0.27,
        phase: Math.random() * Math.PI * 2,
        pos: 50,
        locked: false,
        zoneStart: zoneStart,
        zoneEnd: zoneStart + zoneSize
      });
      html += '<div class="res-meter" data-meter="' + i + '">' +
        '<div class="res-label">' + tx('resChannel', { n: i + 1 }) + '</div>' +
        '<div class="res-track">' +
          '<i class="res-zone" style="left:' + zoneStart + '%;width:' + zoneSize + '%"></i>' +
          '<i class="res-needle" data-needle></i>' +
          '<i class="res-fill"></i>' +
        '</div>' +
        '<div class="res-state" data-res-state></div>' +
      '</div>';
    }
    html += '<button type="button" class="res-lock" data-res-lock>' + tx('resLock') + '</button></div>';
    stage.innerHTML = html;
    state.locked = false;
    state.input = [];
    updateProgress();
    var lock = stage.querySelector('[data-res-lock]');
    if (lock) lock.addEventListener('click', lockResonance);
    state.start = performance.now();
    state.raf = requestAnimationFrame(tickResonance);
  }

  function tickResonance(now) {
    if (!state || state.type !== 'resonance' || state.done) return;
    var t = (now - state.start) / 1000;
    var stage = layer && layer.querySelector('[data-task-stage]');
    if (!stage) return;
    var firstOpen = -1;
    for (var i = 0; i < state.meters.length; i++) {
      var m = state.meters[i];
      if (!m.locked) {
        if (firstOpen < 0) firstOpen = i;
        m.pos = 50 + 44 * Math.sin(t * m.speed + m.phase);
      }
      var meter = stage.querySelector('[data-meter="' + i + '"]');
      if (meter) {
        meter.classList.toggle('active', i === firstOpen && !m.locked);
        meter.classList.toggle('locked', m.locked);
        var needle = meter.querySelector('[data-needle]');
        if (needle) needle.style.left = m.pos + '%';
      }
    }
    state.raf = requestAnimationFrame(tickResonance);
  }

  function lockResonance() {
    if (!state || state.type !== 'resonance' || state.done || state.locked) return;
    var idx = -1;
    for (var i = 0; i < state.meters.length; i++) {
      if (!state.meters[i].locked) { idx = i; break; }
    }
    if (idx < 0) return;
    var m = state.meters[idx];
    var ok = m.pos >= m.zoneStart && m.pos <= m.zoneEnd;
    var stage = layer && layer.querySelector('[data-task-stage]');
    var meter = stage && stage.querySelector('[data-meter="' + idx + '"]');
    if (ok) {
      m.locked = true;
      if (meter) {
        meter.classList.add('locked');
        var st = meter.querySelector('[data-res-state]');
        if (st) st.textContent = tx('resStable');
      }
      if (CF.audio) CF.audio.play(CF.cues.uiClick, { gain: 0.6 });
      updateProgress();
      if (state.meters.every(function (x) { return x.locked; })) completeTask();
    } else {
      flashError();
      setReadout(tx('resWrong'), 'err');
      if (CF.audio) CF.audio.play(CF.cues.error, { gain: 0.55 });
      m.phase += 1.4;
      state.locked = true;
      addTimer(function () {
        if (!state || state.done) return;
        state.locked = false;
        setReadout(tx('resLock'));
      }, 420);
    }
  }

  function buildGlyph(stage) {
    var ids = [];
    for (var i = 0; i < GLYPHS.length; i++) ids.push(i);
    var shuffled = shuffle(ids);
    var target = shuffled.slice(0, state.total);
    var pool = shuffled.slice(state.total);
    var grid = target.slice();
    while (grid.length < 9) {
      grid.push(pool.length ? pool[Math.floor(Math.random() * pool.length)] : Math.floor(Math.random() * GLYPHS.length));
    }
    grid = shuffle(grid);
    state.target = target;
    state.grid = grid;
    state.input = [];
    state.locked = false;
    state.showing = false;
    var key = '';
    for (var k = 0; k < target.length; k++) key += glyphPixels(GLYPHS[target[k]], 'glyph-key-pixels');
    var html = '<div class="glyph-console">' +
      '<div class="glyph-key"><span>' + tx('glyphKey') + '</span><div class="glyph-key-list">' + key + '</div></div>' +
      '<div class="glyph-grid">';
    for (var g = 0; g < grid.length; g++) {
      html += '<button type="button" class="glyph-cell" data-glyph="' + grid[g] + '" aria-label="glifo">' +
        glyphPixels(GLYPHS[grid[g]]) + '</button>';
    }
    html += '</div><div class="glyph-tip">' + tx('glyphOrder') + '</div></div>';
    stage.innerHTML = html;
    updateProgress();
    var cells = stage.querySelectorAll('[data-glyph]');
    for (var c = 0; c < cells.length; c++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          if (!state || state.type !== 'glyph' || state.locked || state.done) return;
          var id = Number(btn.getAttribute('data-glyph'));
          if (id === state.target[state.input.length]) {
            state.input.push(id);
            btn.classList.add('picked');
            if (CF.audio) CF.audio.play(CF.cues.uiClick, { gain: 0.5 });
            updateProgress();
            if (state.input.length >= state.target.length) completeTask();
          } else {
            flashError();
            setReadout(tx('glyphWrong'), 'err');
            if (CF.audio) CF.audio.play(CF.cues.error, { gain: 0.6 });
            state.input = [];
            updateProgress();
            var picked = stage.querySelectorAll('.glyph-cell.picked');
            for (var p = 0; p < picked.length; p++) picked[p].classList.remove('picked');
            addTimer(function () {
              if (state && !state.done) setReadout(tx('glyphOrder'));
            }, 650);
          }
        });
      })(cells[c]);
    }
  }

  function bindKeys() {
    keyHandler = function (e) {
      if (!state) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        cancelTask();
        return;
      }
      if (state.type === 'resonance' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        lockResonance();
        return;
      }
      if (state.type === 'echo' && /^Digit[1-4]$/.test(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var idx = Number(e.code.slice(-1)) - 1;
        var pad = layer && layer.querySelector('[data-echo="' + idx + '"]');
        if (pad) pad.click();
        return;
      }
    };
    window.addEventListener('keydown', keyHandler, true);
  }

  function bindFrame() {
    if (!layer) return;
    var closeBtns = layer.querySelectorAll('[data-task-cancel]');
    for (var i = 0; i < closeBtns.length; i++) closeBtns[i].addEventListener('click', cancelTask);
    layer.addEventListener('click', function (e) {
      if (e.target === layer) cancelTask();
    });
  }

  function open(opts) {
    close();
    var role = character(opts && opts.char);
    var type = opts && opts.type ? opts.type : 'glyph';
    state = {
      opts: opts || {},
      type: type,
      char: role.id,
      total: sequenceLength(),
      input: [],
      seq: [],
      meters: [],
      timers: [],
      done: false,
      locked: false,
      showing: false,
      start: 0,
      raf: 0
    };
    layer = buildFrame(role, type);
    var root = document.getElementById('overlay');
    if (root) root.appendChild(layer);
    bindFrame();
    bindKeys();
    var stage = layer.querySelector('[data-task-stage]');
    var portrait = layer.querySelector('.task-portrait canvas');
    if (portrait && CF.engine && CF.engine.drawPortrait) CF.engine.drawPortrait(portrait, role.id);
    if (type === 'echo') buildEcho(stage);
    else if (type === 'resonance') buildResonance(stage);
    else buildGlyph(stage);
    updateProgress();
    if (!document.body.classList.contains('is-game')) layer.classList.add('task-layer--menu');
  }

  function close() {
    if (state) clearTimers();
    stopRaf();
    if (keyHandler) {
      window.removeEventListener('keydown', keyHandler, true);
      keyHandler = null;
    }
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = null;
    state = null;
  }

  CF.tasks = {
    open: open,
    close: close,
    cancel: cancelTask,
    isOpen: function () { return !!state; }
  };
})();
