(function () {
  'use strict';

  var CF = window.CF = window.CF || {};
  var t = function (k) { return CF.i18n.t(k); };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function portal(action, color, label, extraClass) {
    return '<button class="portal-btn ' + (extraClass || '') + '" data-action="' + action + '" data-portal="' + color + '" data-label="' + esc(label) + '" aria-label="' + esc(label) + '">' +
      '<canvas width="320" height="160" aria-hidden="true"></canvas>' +
      '</button>';
  }

  function settingKey(key) {
    return key.indexOf('settings.') === 0 ? key.slice(9) : key;
  }

  function toggle(id, key, checked) {
    return '<label class="switch"><input type="checkbox" id="' + id + '" data-setting="' + settingKey(key) + '" ' + (checked ? 'checked' : '') + '><span>' + esc(t(key)) + '</span></label>';
  }

  function slider(id, key, value) {
    return '<div class="setting"><div class="setting-head"><label for="' + id + '">' + esc(t(key)) + '</label><output id="' + id + '-out">' + Math.round(value * 100) + '%</output></div>' +
      '<input type="range" id="' + id + '" min="0" max="1" step="0.01" value="' + value + '" data-setting="' + settingKey(key) + '"></div>';
  }

  function applyFullscreen(on) {
    try {
      if (on) {
        var el = document.documentElement;
        var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (req) req.call(el);
      } else if (document.fullscreenElement || document.webkitFullscreenElement) {
        var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
        if (exit) exit.call(document);
      }
    } catch (e) {}
  }

  function render(container, onDone) {
    var s = CF.store.settings;
    var lang = CF.i18n.getLang();
    var html = '' +
      '<div class="screen"><div class="menu">' +
      '<div class="menu-top">' +
        '<button class="btn btn--ghost btn--sm" data-action="settings-back" data-i18n="common.back">' + esc(t('common.back')) + '</button>' +
        '<div style="text-align:center"><h1 class="menu-title">' + esc(t('settings.title')) + '</h1><p class="menu-sub">' + esc(t('settings.subtitle')) + '</p></div>' +
        '<span style="width:60px"></span>' +
      '</div>' +
      '<div class="menu-body"><div class="menu-panel">' +
        '<div class="settings-grid">' +
          '<div class="settings-col">' +
            '<div class="section-label">' + esc(t('settings.audio')) + '</div>' +
            slider('set-master', 'settings.master', s.master) +
            slider('set-music', 'settings.music', s.music) +
            slider('set-sfx', 'settings.sfx', s.sfx) +
            '<div class="field-hint">' + esc(t('settings.audioNote')) + '</div>' +
            '<div class="divider"></div>' +
            '<div class="section-label">' + esc(t('settings.access')) + '</div>' +
            toggle('set-scan', 'settings.scanlines', s.scanlines) +
            toggle('set-shake', 'settings.shake', s.shake) +
            toggle('set-motion', 'settings.reduceMotion', s.reduceMotion) +
            '<div class="field-hint">' + esc(t('settings.accessNote')) + '</div>' +
          '</div>' +
          '<div class="settings-col">' +
            '<div class="section-label">' + esc(t('settings.graphics')) + '</div>' +
            '<div class="setting"><div class="setting-head"><label for="set-quality">' + esc(t('settings.quality')) + '</label></div>' +
              '<select id="set-quality" data-setting="quality">' +
                '<option value="low" ' + (s.quality === 'low' ? 'selected' : '') + '>' + esc(t('common.low')) + '</option>' +
                '<option value="medium" ' + (s.quality === 'medium' ? 'selected' : '') + '>' + esc(t('common.medium')) + '</option>' +
                '<option value="high" ' + (s.quality === 'high' ? 'selected' : '') + '>' + esc(t('common.high')) + '</option>' +
              '</select></div>' +
            '<div class="setting"><div class="setting-head"><label for="set-screen">' + esc(t('settings.screen')) + '</label></div>' +
              '<select id="set-screen" data-setting="fullscreen">' +
                '<option value="window" ' + (!s.fullscreen ? 'selected' : '') + '>' + esc(t('common.window')) + '</option>' +
                '<option value="full" ' + (s.fullscreen ? 'selected' : '') + '>' + esc(t('common.fullscreen')) + '</option>' +
              '</select></div>' +
            '<div class="divider"></div>' +
            '<div class="section-label">' + esc(t('settings.language')) + '</div>' +
            '<div class="seg" data-lang-seg>' +
              '<button data-lang="es" class="' + (lang === 'es' ? 'on' : '') + '">ESPAÑOL</button>' +
              '<button data-lang="en" class="' + (lang === 'en' ? 'on' : '') + '">ENGLISH</button>' +
              '<button data-lang="pt" class="' + (lang === 'pt' ? 'on' : '') + '">PORTUGUÊS</button>' +
            '</div>' +
            '<div class="field-hint">' + esc(t('settings.langNote')) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="menu-actions" style="margin-top:18px">' +
          '<button class="btn btn--ghost" data-action="settings-back" data-i18n="common.back">' + esc(t('common.back')) + '</button>' +
          portal('settings-done', '#57ffa8', t('common.done')) +
        '</div>' +
      '</div></div></div></div>';

    container.innerHTML = html;
    CF.i18n.applyDom(container);

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      applicationDone();
      if (onDone) onDone();
    }
    function applicationDone() {
      var st = CF.store.settings;
      CF.store.saveSettings(st);
      CF.store.applyToDom();
      CF.audio.setVolumes({ master: st.master, music: st.music, sfx: st.sfx });
      applyFullscreen(!!st.fullscreen);
      if (CF.app && CF.app.toast) CF.app.toast(t('settings.saved'), 'ok');
    }

    container.querySelectorAll('[data-setting]').forEach(function (el) {
      var key = el.getAttribute('data-setting');
      var evt = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
      el.addEventListener(evt, function () {
        var value;
        if (el.type === 'checkbox') value = el.checked;
        else if (el.type === 'range') value = parseFloat(el.value);
        else if (key === 'fullscreen') value = el.value === 'full';
        else value = el.value;
        CF.store.saveSettings({ [key]: value });
        CF.store.applyToDom();
        if (el.type === 'range') {
          var out = document.getElementById(el.id + '-out');
          if (out) out.textContent = Math.round(value * 100) + '%';
        }
        if (key === 'master' || key === 'music' || key === 'sfx') {
          CF.audio.setVolumes({
            master: CF.store.settings.master,
            music: CF.store.settings.music,
            sfx: CF.store.settings.sfx
          });
        }
        if (key === 'fullscreen') applyFullscreen(!!CF.store.settings.fullscreen);
        if (key === 'quality' && CF.game && CF.game.initAmbient) CF.game.initAmbient();
      });
    });

    container.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang2 = btn.getAttribute('data-lang');
        CF.i18n.setLang(lang2);
        document.documentElement.lang = lang2;
        CF.store.saveSettings({ lang: lang2 });
        CF.audio.play(CF.cues.uiClick, { gain: 0.6 });
        render(container, onDone);
      });
    });

    container.querySelectorAll('[data-action="settings-done"]').forEach(function (b) {
      b.addEventListener('click', finish);
    });
    container.querySelectorAll('[data-action="settings-back"]').forEach(function (b) {
      b.addEventListener('click', function () {
        CF.audio.play(CF.cues.uiBack, { gain: 0.5 });
        applicationDone();
        if (onDone) onDone();
      });
    });
    container.querySelectorAll('[data-portal]').forEach(function (cv) {
      var canvas = cv.querySelector('canvas');
      if (canvas) CF.portal.bind(canvas, cv.getAttribute('data-portal'));
    });
  }

  window.CF.settingsUI = { render: render, applyFullscreen: applyFullscreen };
})();

