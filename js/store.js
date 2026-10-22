(function () {
  'use strict';

  var CF = window.CF = window.CF || {};

  var SETTINGS_KEY = 'cf.settings.v1';
  var PROFILE_KEY = 'cf.profile.v1';
  var SESSION_KEY = 'cf.session.v1';

  var DEFAULTS = {
    master: 0.8,
    music: 0.65,
    sfx: 0.8,
    quality: 'high',
    scanlines: false,
    shake: true,
    reduceMotion: false,
    fullscreen: false,
    lang: 'es'
  };

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      var obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clamp01(v, d) {
    v = Number(v);
    if (!isFinite(v)) return d;
    return Math.max(0, Math.min(1, v));
  }

  function sanitizeSettings(obj) {
    obj = obj || {};
    var quality = ['low', 'medium', 'high'].indexOf(obj.quality) >= 0 ? obj.quality : DEFAULTS.quality;
    var lang = ['es', 'en', 'pt'].indexOf(obj.lang) >= 0 ? obj.lang : DEFAULTS.lang;
    return {
      master: clamp01(obj.master, DEFAULTS.master),
      music: clamp01(obj.music, DEFAULTS.music),
      sfx: clamp01(obj.sfx, DEFAULTS.sfx),
      quality: quality,
      scanlines: !!obj.scanlines,
      shake: obj.shake !== false,
      reduceMotion: !!obj.reduceMotion,
      fullscreen: !!obj.fullscreen,
      lang: lang
    };
  }

  var settings = sanitizeSettings(readJSON(SETTINGS_KEY, DEFAULTS));

  function saveSettings(patch) {
    if (patch) {
      for (var k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) settings[k] = patch[k];
      }
      settings = sanitizeSettings(settings);
    }
    writeJSON(SETTINGS_KEY, settings);
    return settings;
  }

  function genId(prefix) {
    var rand;
    try {
      var arr = new Uint8Array(8);
      (window.crypto || window.msCrypto).getRandomValues(arr);
      rand = Array.prototype.map.call(arr, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    } catch (e) {
      rand = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
    }
    return (prefix || 'cf') + '_' + rand.slice(0, 12);
  }

  function genRoomCode() {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    for (var i = 0; i < 6; i++) {
      out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return out;
  }

  function profile() {
    var p = readJSON(PROFILE_KEY, null);
    if (!p || !p.id) {
      p = { id: genId('sci'), name: 'CIENTÍFICO-' + Math.floor(1000 + Math.random() * 9000) };
      writeJSON(PROFILE_KEY, p);
    }
    if (!p.name) p.name = 'CIENTÍFICO-' + p.id.slice(-4).toUpperCase();
    return p;
  }

  function setName(name) {
    var p = profile();
    p.name = name;
    writeJSON(PROFILE_KEY, p);
    return p;
  }

  function normCode(code) {
    return String(code || '').trim().replace(/\s+/g, '');
  }

  function validateRoomCode(code) {
    var c = normCode(code);
    if (c.length < 4 || c.length > 10) return { ok: false, reason: 'length' };
    if (!/^[A-Za-z0-9_-]+$/.test(c)) return { ok: false, reason: 'chars' };
    return { ok: true, code: c };
  }

  function cleanName(raw) {
    var s = String(raw == null ? '' : raw).replace(/[\u0000-\u001F\u007F]/g, '').trim();
    s = s.replace(/\s+/g, ' ');
    return s;
  }

  function validateName(raw) {
    var s = cleanName(raw);
    var len = Array.from(s).length;
    if (len < 2 || len > 18) return { ok: false, reason: 'length' };
    if (!/^[\p{L}\p{N} _-]+$/u.test(s)) return { ok: false, reason: 'chars' };
    return { ok: true, name: s };
  }

  function readSession() {
    try {
      var raw = window.sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : null;
    } catch (e) { return null; }
  }

  function session() {
    var s = readSession();
    if (!s || !s.pid) {
      s = { pid: genId('p'), name: profile().name };
      writeSession(s);
    }
    return s;
  }

  function setSession(patch) {
    var s = session();
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) s[k] = patch[k];
    }
    writeSession(s);
    return s;
  }

  function writeSession(value) {
    try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  function applyToDom() {
    var body = document.body;
    body.classList.toggle('scanlines', !!settings.scanlines);
    body.classList.toggle('reduce-motion', !!settings.reduceMotion);
    CF.audio.setVolumes({ master: settings.master, music: settings.music, sfx: settings.sfx });
  }

  window.CF.store = {
    defaults: DEFAULTS,
    get settings() { return settings; },
    saveSettings: saveSettings,
    sanitizeSettings: sanitizeSettings,
    applyToDom: applyToDom,
    profile: profile,
    setName: setName,
    session: session,
    setSession: setSession,
    genId: genId,
    genRoomCode: genRoomCode,
    validateRoomCode: validateRoomCode,
    validateName: validateName,
    normCode: normCode
  };
})();

