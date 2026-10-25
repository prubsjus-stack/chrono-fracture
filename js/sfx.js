/* FRECUENCIA ROTA · sonido sintetizado (sin archivos externos) */
(function () {
  'use strict';

  var CF = window.CF = window.CF || {};

  var ctx = null;
  var master = null;
  var noiseBuf = null;
  var enabled = true;
  var volume = 0.5;

  try {
    var saved = window.localStorage.getItem('fr.v2.sound');
    if (saved === '0') enabled = false;
  } catch (e) {}

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
      return ctx;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume * 0.5;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.35), ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function gate() {
    return enabled && ensure() ? ctx : null;
  }

  function tone(freq, dur, opts) {
    var c = gate();
    if (!c) return;
    opts = opts || {};
    var t0 = c.currentTime + (opts.delay || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + dur);
    var peak = (opts.gain == null ? 0.18 : opts.gain);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, opts) {
    var c = gate();
    if (!c) return;
    opts = opts || {};
    var t0 = c.currentTime + (opts.delay || 0);
    var src = c.createBufferSource();
    src.buffer = noiseBuf;
    var f = c.createBiquadFilter();
    f.type = opts.filter || 'bandpass';
    f.frequency.value = opts.freq || 900;
    f.Q.value = opts.q == null ? 1.1 : opts.q;
    var g = c.createGain();
    g.gain.setValueAtTime(opts.gain == null ? 0.12 : opts.gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  var Sfx = {
    unlock: function () {
      var c = ensure();
      if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} }
    },
    enabled: function () { return enabled; },
    setEnabled: function (v) {
      enabled = !!v;
      try { window.localStorage.setItem('fr.v2.sound', enabled ? '1' : '0'); } catch (e) {}
      if (enabled) { ensure(); }
    },
    click: function () { tone(520, 0.06, { type: 'triangle', gain: 0.08 }); },
    deal: function (i) {
      noise(0.09, { freq: 1600 + (i || 0) * 120, gain: 0.05, q: 0.7 });
      tone(360 + (i || 0) * 40, 0.05, { type: 'triangle', gain: 0.035 });
    },
    flip: function () {
      noise(0.13, { freq: 2200, gain: 0.08, q: 0.6 });
      tone(420, 0.1, { type: 'triangle', gain: 0.05, to: 620 });
    },
    step: function (i) {
      var n = (i || 0) % 4;
      noise(0.055, { freq: 720 + n * 120, gain: 0.055, q: 1.4 });
      tone(120 + n * 18, 0.09, { type: 'sine', gain: 0.09, to: 70 });
    },
    vote: function () {
      tone(880, 0.09, { type: 'sine', gain: 0.08 });
      tone(1320, 0.12, { type: 'sine', gain: 0.05, delay: 0.06 });
    },
    correct: function () {
      tone(660, 0.12, { type: 'triangle', gain: 0.09 });
      tone(990, 0.18, { type: 'triangle', gain: 0.07, delay: 0.09 });
    },
    wrong: function () {
      tone(220, 0.18, { type: 'sawtooth', gain: 0.045, to: 160 });
    },
    trade: function () {
      tone(740, 0.09, { type: 'triangle', gain: 0.06 });
      tone(980, 0.1, { type: 'triangle', gain: 0.05, delay: 0.07 });
    },
    tick: function (urgent) {
      tone(urgent ? 1180 : 820, 0.05, { type: 'square', gain: urgent ? 0.045 : 0.025 });
    },
    win: function () {
      var seq = [523.25, 659.25, 783.99, 1046.5];
      for (var i = 0; i < seq.length; i++) {
        tone(seq[i], 0.5, { type: 'triangle', gain: 0.075, delay: i * 0.13 });
        tone(seq[i] / 2, 0.5, { type: 'sine', gain: 0.03, delay: i * 0.13 });
      }
    },
    lose: function () {
      tone(392, 0.3, { type: 'sine', gain: 0.06 });
      tone(311, 0.4, { type: 'sine', gain: 0.05, delay: 0.14 });
    }
  };

  CF.Sfx = Sfx;
})();
