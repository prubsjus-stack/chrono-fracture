(function () {
  'use strict';

  var CF = window.CF = window.CF || {};

  var S = {
    ctx: null,
    master: null,
    musicBus: null,
    sfxBus: null,
    volumes: { master: 0.8, music: 0.65, sfx: 0.8 },
    buffers: {},
    manifest: null,
    loadingManifest: false,
    musicSource: null,
    musicGain: null,
    currentMusic: null,
    unlocked: false,
    enabled: true
  };

  function clamp01(v) {
    v = Number(v);
    if (!isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
  }

  function ensureContext() {
    if (S.ctx) return S.ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      S.ctx = new AC();
      S.master = S.ctx.createGain();
      S.musicBus = S.ctx.createGain();
      S.sfxBus = S.ctx.createGain();
      S.musicBus.connect(S.master);
      S.sfxBus.connect(S.master);
      S.master.connect(S.ctx.destination);
      applyVolumes();
    } catch (e) {
      S.ctx = null;
    }
    return S.ctx;
  }

  function applyVolumes() {
    if (!S.ctx) return;
    var now = S.ctx.currentTime;
    var m = clamp01(S.volumes.master);
    S.master.gain.setTargetAtTime(m * m, now, 0.03);
    S.musicBus.gain.setTargetAtTime(clamp01(S.volumes.music), now, 0.03);
    S.sfxBus.gain.setTargetAtTime(clamp01(S.volumes.sfx), now, 0.03);
  }

  function setVolumes(v) {
    if (!v) return;
    if (v.master != null) S.volumes.master = clamp01(v.master);
    if (v.music != null) S.volumes.music = clamp01(v.music);
    if (v.sfx != null) S.volumes.sfx = clamp01(v.sfx);
    applyVolumes();
  }

  function unlock() {
    var ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    S.unlocked = true;
  }

  function loadManifest() {
    if (S.manifest || S.loadingManifest) return;
    S.loadingManifest = true;
    fetch(CF.audioManifestUrl, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) {
        if (json && (json.music || json.sfx)) {
          S.manifest = json;
          prefetch();
        }
      })
      .catch(function () { /* no audio assets yet: silent by design */ })
      .then(function () { S.loadingManifest = false; });
  }

  function urlFor(cue) {
    if (!S.manifest) return null;
    if (S.manifest.sfx && S.manifest.sfx[cue]) return S.manifest.sfx[cue];
    if (S.manifest.music && S.manifest.music[cue]) return S.manifest.music[cue];
    return null;
  }

  function loadBuffer(url) {
    var ctx = ensureContext();
    if (!ctx) return Promise.resolve(null);
    if (S.buffers[url]) return Promise.resolve(S.buffers[url]);
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('audio ' + r.status);
        return r.arrayBuffer();
      })
      .then(function (data) {
        return new Promise(function (resolve, reject) {
          ctx.decodeAudioData(data, resolve, reject);
        });
      })
      .then(function (buf) {
        S.buffers[url] = buf;
        return buf;
      })
      .catch(function () { return null; });
  }

  function prefetch() {
    if (!S.manifest) return;
    var all = [];
    ['sfx', 'music'].forEach(function (kind) {
      if (!S.manifest[kind]) return;
      Object.keys(S.manifest[kind]).forEach(function (k) {
        all.push(loadBuffer(S.manifest[kind][k]));
      });
    });
    return Promise.all(all);
  }

  function play(cue, opts) {
    if (!S.enabled) return;
    var url = urlFor(cue);
    if (!url) return;
    var ctx = ensureContext();
    if (!ctx) return;
    opts = opts || {};
    loadBuffer(url).then(function (buf) {
      if (!buf) return;
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = !!opts.loop;
      var gain = ctx.createGain();
      gain.gain.value = opts.gain != null ? opts.gain : 1;
      src.connect(gain);
      gain.connect(opts.bus === 'music' ? S.musicBus : S.sfxBus);
      try { src.start(0); } catch (e) { return; }
    });
  }

  function music(cue) {
    if (S.currentMusic === cue) return;
    S.currentMusic = cue;
    stopMusic();
    var url = urlFor(cue);
    if (!url) return;
    var ctx = ensureContext();
    if (!ctx) return;
    loadBuffer(url).then(function (buf) {
      if (!buf) return;
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      var g = ctx.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
      src.connect(g);
      g.connect(S.musicBus);
      try { src.start(0); } catch (e) { return; }
      S.musicSource = src;
      S.musicGain = g;
    });
  }

  function stopMusic() {
    if (S.musicSource) {
      var src = S.musicSource;
      var g = S.musicGain;
      S.musicSource = null;
      S.musicGain = null;
      try {
        if (g && S.ctx) g.gain.setTargetAtTime(0, S.ctx.currentTime, 0.25);
        setTimeout(function () { try { src.stop(); } catch (e) {} }, 700);
      } catch (e) {}
    }
    S.currentMusic = null;
  }

  function initUnlock() {
    var handler = function () {
      unlock();
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
    };
    window.addEventListener('pointerdown', handler, { passive: true });
    window.addEventListener('keydown', handler);
    window.addEventListener('touchstart', handler, { passive: true });
    loadManifest();
  }

  window.CF.audio = {
    init: initUnlock,
    unlock: unlock,
    setVolumes: setVolumes,
    play: play,
    music: music,
    stopMusic: stopMusic,
    get context() { return S.ctx; },
    get manifest() { return S.manifest; },
    get hasAudio() { return !!(S.manifest && (S.manifest.sfx || S.manifest.music)); },
    loadManifest: loadManifest
  };
})();
