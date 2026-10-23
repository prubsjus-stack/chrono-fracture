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
      roleGlyph: 'GLIFO',
      roleTruth: 'VERDAD',
      roleAction: 'ANCLA',
      orbsTitle: 'ORBE ESTABLE',
      orbsDescV: 'Solo tú ves cuál orbe es REAL. Dile a tu compañero cuál marcar en su consola.',
      orbsDescA: 'Tres orbes: solo uno es real. Pregúntale a tu compañero cuál.',
      orbsReal: 'EL ORBE REAL',
      orbsListen: 'AVISA A TU COMPAÑERO',
      orbsDone: 'MENSAJE ENVIADO A LA ANCLA',
      orbsHint: 'PREGÚNTALE A TU COMPAÑERO',
      orbsWrong: 'ORBE FALSO',
      codeTitle: 'CLAVE ENTRE ERAS',
      codeDescV: 'Código completo. Dile a tu compañero los dos dígitos que faltan.',
      codeDescA: 'Dos huecos en el código. Pide a tu compañero los dígitos.',
      codeSlots: 'CLAVE',
      codePad: 'DÍGITO',
      codeWrong: 'DÍGITO ERRÓNEO',
      codeDone: 'MENSAJE ENVIADO A LA ANCLA'
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
      roleGlyph: 'GLYPH',
      roleTruth: 'TRUTH',
      roleAction: 'ANCHOR',
      orbsTitle: 'STABLE ORB',
      orbsDescV: 'Only you can see which orb is REAL. Tell your partner which one to pick.',
      orbsDescA: 'Three orbs: only one is real. Ask your partner which one.',
      orbsReal: 'THE REAL ORB',
      orbsListen: 'TELL YOUR PARTNER',
      orbsDone: 'MESSAGE SENT TO ANCHOR',
      orbsHint: 'ASK YOUR PARTNER',
      orbsWrong: 'FALSE ORB',
      codeTitle: 'KEY ACROSS ERAS',
      codeDescV: 'Full code. Tell your partner the two missing digits.',
      codeDescA: 'Two gaps in the code. Ask your partner for the digits.',
      codeSlots: 'CODE',
      codePad: 'DIGIT',
      codeWrong: 'WRONG DIGIT',
      codeDone: 'MESSAGE SENT TO ANCHOR'
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
      roleGlyph: 'GLIFO',
      roleTruth: 'VERDADE',
      roleAction: 'ÂNCORA',
      orbsTitle: 'ORBE ESTÁVEL',
      orbsDescV: 'Só você vê qual orbe é REAL. Diga ao parceiro qual marcar.',
      orbsDescA: 'Três orbes: só um é real. Pergunte ao parceiro qual.',
      orbsReal: 'O ORBE REAL',
      orbsListen: 'AVISE SEU PARCEIRO',
      orbsDone: 'MENSAGEM ENVIADA À ÂNCORA',
      orbsHint: 'PERGUNTE AO SEU PARCEIRO',
      orbsWrong: 'ORBE FALSO',
      codeTitle: 'CHAVE ENTRE ERAS',
      codeDescV: 'Código completo. Diga ao parceiro os dois dígitos que faltam.',
      codeDescA: 'Dois espaços no código. Peça os dígitos ao parceiro.',
      codeSlots: 'CÓDIGO',
      codePad: 'DÍGITO',
      codeWrong: 'DÍGITO ERRADO',
      codeDone: 'MENSAGEM ENVIADA À ÂNCORA'
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
    var isCodeAction = state.link && state.link.mode === 'code' && state.link.role === 'action';
    var total = state.type === 'resonance' ? state.meters.length : isCodeAction ? state.total : state.total;
    var done = state.type === 'resonance'
      ? state.meters.filter(function (m) { return m.locked; }).length
      : isCodeAction
        ? state.fill.length
        : state.link && state.link.mode === 'code' && state.link.role === 'vision'
          ? (state.done ? 1 : 0)
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
    var linkRole = (type === 'link' && state && state.opts && state.opts.link && state.opts.link.role) || 'vision';
    var linkMode = (type === 'link' && state && state.opts && state.opts.link && state.opts.link.mode) || 'orbs';
    var title = type === 'echo' ? tx('echoTitle') : type === 'resonance' ? tx('resTitle') : type === 'link'
      ? (linkMode === 'code' ? tx('codeTitle') : tx('orbsTitle'))
      : tx('glyphTitle');
    var desc = type === 'echo' ? tx('echoDesc') : type === 'resonance' ? tx('resDesc') : type === 'link'
      ? (linkMode === 'code'
        ? (linkRole === 'vision' ? tx('codeDescV') : tx('codeDescA'))
        : (linkRole === 'vision' ? tx('orbsDescV') : tx('orbsDescA')))
      : tx('glyphDesc');
    var roleLabel = type === 'echo' ? tx('roleEcho') : type === 'resonance' ? tx('roleRes') : type === 'link'
      ? (linkRole === 'vision' ? tx('roleTruth') : tx('roleAction'))
      : tx('roleGlyph');
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

  function linkInfo() {
    return (state && state.opts && state.opts.link) || null;
  }

  function buildLinkOrbs(stage) {
    var link = linkInfo();
    var isVision = link && link.role === 'vision';
    state.total = 1;
    state.link = link;
    var html = '<div class="link-console">' +
      '<div class="link-title">' + (isVision ? tx('orbsReal') : tx('orbsHint')) + '</div>' +
      '<div class="link-orbs">';
    for (var i = 0; i < 3; i++) {
      var real = isVision && link.correct === i;
      html += '<div class="link-orb' + (real ? ' real' : '') + '" data-orb="' + i + '"><b>A B C'.charAt(i * 2) + '</b><i></i></div>';
    }
    html += '</div><div class="link-tip">' + (isVision ? tx('orbsListen') : tx('orbsDescA')) + '</div>';
    if (isVision) {
      html += '<button type="button" class="res-lock" data-link-confirm>' + tx('orbsDone') + '</button>';
    } else {
      html += '<div class="link-pad">';
      for (var p = 0; p < 3; p++) {
        html += '<button type="button" class="res-lock link-pad-btn" data-link-orb="' + p + '">' + 'ABC'.charAt(p) + '</button>';
      }
      html += '</div>';
    }
    html += '</div>';
    stage.innerHTML = html;
    state.locked = false;
    if (isVision) {
      setReadout(tx('orbsReal'));
      setStatus(tx('orbsListen'));
      var confirmBtn = stage.querySelector('[data-link-confirm]');
      if (confirmBtn) confirmBtn.addEventListener('click', function () {
        if (!state || state.done) return;
        completeTask();
      });
    } else {
      setReadout(tx('orbsHint'));
      setStatus(tx('orbsHint'));
      var cells = stage.querySelectorAll('[data-link-orb]');
      for (var c = 0; c < cells.length; c++) {
        (function (btn, idx) {
          btn.addEventListener('click', function () {
            btn.textContent = 'ABC'.charAt(idx);
            if (!state || state.done || state.locked) return;
            if (state.link && idx === state.link.correct) {
              btn.textContent = 'ABC'.charAt(idx);
              completeTask();
            } else {
              flashError();
              setReadout(tx('orbsWrong'), 'err');
              if (CF.audio) CF.audio.play(CF.cues.error, { gain: 0.55 });
              state.locked = true;
              addTimer(function () {
                if (state && !state.done) {
                  state.locked = false;
                  setReadout(tx('orbsHint'));
                }
              }, 520);
            }
          });
        })(cells[c], c);
      }
    }
    void html;
  }

  function buildLinkCode(stage) {
    var link = linkInfo();
    var isVision = link && link.role === 'vision';
    state.link = link;
    state.code = link && link.code ? link.code.slice() : [0, 0, 0, 0];
    state.total = 1;
    if (!isVision) {
      state.blanks = link && link.blanks ? link.blanks.slice() : [0, 2];
      state.fill = [];
      state.total = state.blanks.length;
    }
    var codeHtml = '';
    if (isVision) {
      for (var i = 0; i < state.code.length; i++) {
        codeHtml += '<b>' + (state.code[i] + 1) + '</b>';
      }
    } else {
      for (var g = 0; g < state.code.length; g++) {
        var isBlank = state.blanks.indexOf(g) >= 0;
        codeHtml += '<b class="' + (isBlank ? 'blank' : 'masked') + '"' + (isBlank ? ' data-slot="' + g + '"' : '') + '>·</b>';
      }
    }
    var html = '<div class="link-console">' +
      '<div class="link-title">' + (isVision ? tx('codeSlots') : tx('codePad')) + '</div>' +
      '<div class="link-code">' + codeHtml + '</div>';
    if (isVision) {
      html += '<div class="link-tip">' + tx('codeDescV') + '</div>' +
        '<button type="button" class="res-lock" data-link-confirm>' + tx('codeDone') + '</button>';
    } else {
      html += '<div class="link-tip">' + tx('codeDescA') + '</div><div class="link-pad">';
      for (var d = 0; d < 9; d++) {
        html += '<button type="button" class="res-lock link-pad-btn" data-link-digit="' + (d + 1) + '">' + (d + 1) + '</button>';
      }
      html += '</div>';
    }
    html += '</div>';
    stage.innerHTML = html;
    state.locked = false;
    if (isVision) {
      setReadout(tx('codeDone'));
      setStatus(tx('codeDone'));
      var confirmBtn = stage.querySelector('[data-link-confirm]');
      if (confirmBtn) confirmBtn.addEventListener('click', function () {
        if (!state || state.done) return;
        completeTask();
      });
    } else {
      setReadout(tx('codeDescA'));
      setStatus(tx('codeDescA'));
      function fillSlot(value) {
        if (!state || state.done || state.locked) return;
        var idx = state.fill.length;
        if (idx >= state.blanks.length) return;
        var slotPos = state.blanks[idx];
        var expect = state.code[slotPos] + 1;
        if (value === expect) {
          state.fill.push(value);
          var cls = '[data-slot="' + slotPos + '"]';
          var el = stage.querySelector(cls);
          if (el) el.classList.add('filled');
          if (el) el.textContent = value;
          if (CF.audio) CF.audio.play(CF.cues.uiClick, { gain: 0.5 });
          updateProgress();
          if (state.fill.length >= state.blanks.length) completeTask();
        } else {
          flashError();
          setReadout(tx('codeWrong'), 'err');
          if (CF.audio) CF.audio.play(CF.cues.error, { gain: 0.55 });
          state.locked = true;
          addTimer(function () {
            if (state && !state.done) {
              state.locked = false;
              setReadout(tx('codeDescA'));
            }
          }, 480);
        }
      }
      var digs = stage.querySelectorAll('[data-link-digit]');
      for (var k = 0; k < digs.length; k++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            fillSlot(Number(btn.getAttribute('data-link-digit')));
          });
        })(digs[k]);
      }
      state.linkFill = fillSlot;
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
      if (state.type === 'link') {
        if (state.link && state.link.mode === 'code' && state.link.role === 'action' && /^Digit[1-9]$/.test(e.code)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (state.linkFill) state.linkFill(Number(e.code.slice(-1)));
          return;
        }
        if (state.link && state.link.mode === 'orbs' && state.link.role === 'action' && /^Digit[1-3]$/.test(e.code)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          var orb = layer && layer.querySelector('[data-link-orb="' + (Number(e.code.slice(-1)) - 1) + '"]');
          if (orb) orb.click();
          return;
        }
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
    else if (type === 'link') {
      var link = opts.link || {};
      if (link.mode === 'code') buildLinkCode(stage);
      else buildLinkOrbs(stage);
    }
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
