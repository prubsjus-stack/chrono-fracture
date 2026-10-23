(function () {
  'use strict';

  var CF = window.CF = window.CF || {};
  var E = CF.engine;
  var t = function (k, v) { return CF.i18n.t(k, v); };

  var overlay = document.getElementById('overlay');
  var cover = document.getElementById('coverCanvas');
  var gameCanvas = document.getElementById('gameCanvas');
  var ctx = gameCanvas.getContext('2d');
  var coverCtx = cover.getContext('2d');
  var game = null;
  var booted = false;
  var last = performance.now();
  var coverStars = [];
  var coverShards = [];
  var coverSize = { w: 0, h: 0 };
  var lastHover = null;

  var state = {
    screen: 'boot',
    selectedChar: 'p1',
    difficulty: 'normal',
    coop: false,
    region: 'america',
    levelIndex: 0,
    crystals: 0,
    onlineMode: false,
    onlineCtx: null,
    rooms: [],
    roomsLoading: false,
    joinSelected: null,
    joinBusy: false,
    createBusy: false,
    startBusy: false,
    identityName: '',
    identityChar: 'p1',
    identityRegion: 'america',
    creditsBack: null,
    settingsBack: null,
    introContinue: null,
    victoryShown: false,
    victoryReported: false,
    lobbyBuilt: false,
    lobbyRoomCode: null,
    lobbyWasHost: false,
    lastMode: 'solo',
    lastCfg: null
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function toast(msg, type, ms) {
    var layer = document.getElementById('toastLayer');
    if (!layer || !msg) return;
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    layer.appendChild(el);
    while (layer.children.length > 3) layer.removeChild(layer.firstChild);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 380);
    }, ms || 3000);
  }

  function portal(action, color, label, sub, cls) {
    var aria = label + (sub ? ' - ' + sub : '');
    return '<button class="portal-btn ' + (cls || '') + '" data-action="' + action + '" data-portal="' + color + '" data-label="' + esc(label) + '"' +
      (sub ? ' data-sub="' + esc(sub) + '"' : '') + ' aria-label="' + esc(aria) + '">' +
      '<canvas width="320" height="160" aria-hidden="true"></canvas>' +
      '</button>';
  }

  function bindPortals(root) {
    $$('[data-portal]', root || overlay).forEach(function (btn) {
      var cv = btn.querySelector('canvas');
      if (cv) CF.portal.bind(cv, btn.getAttribute('data-portal'));
    });
  }

  function clearOverlay() {
    CF.creditsUI.stop();
    overlay.innerHTML = '';
  }

  function setScreen(html, name) {
    clearOverlay();
    state.screen = name;
    overlay.innerHTML = html;
    CF.i18n.applyDom(overlay);
    bindPortals(overlay);
  }

  function stopGame() {
    if (game && game.running) game.destroy();
    game = null;
    if (CF.online) CF.online.detachGame();
    gameCanvas.style.display = '';
    document.body.classList.remove('is-game');
    document.body.classList.add('is-cover');
  }

  function setCover() {
    document.body.classList.add('is-cover');
    document.body.classList.remove('is-game');
  }

  function setGame() {
    document.body.classList.add('is-game');
    document.body.classList.remove('is-cover');
  }

  function backButton(action, label) {
    return '<button class="btn btn--ghost btn--sm" data-action="' + action + '">' + esc(label || t('common.back')) + '</button>';
  }

  function header(title, subtitle, backAction) {
    return '<div class="menu-top">' +
      backButton(backAction || 'back-cover', t('common.back')) +
      '<div style="text-align:center"><h1 class="menu-title">' + esc(title) + '</h1>' +
      (subtitle ? '<p class="menu-sub">' + esc(subtitle) + '</p>' : '') + '</div>' +
      '<span style="width:60px"></span>' +
      '</div>';
  }

  function coverMarkup() {
    return '<div class="screen"><div class="cover">' +
      '<div class="cover-head">' +
        '<div class="kicker cover-kicker">' + esc(t('cover.kicker')) + '</div>' +
        '<h1 class="game-title"><span>BROKEN</span><span>FREQUENCY</span></h1>' +
        '<p class="cover-tagline">' + esc(t('cover.tagline')) + '</p>' +
      '</div>' +
      '<div class="cover-portals">' +
        portal('goto-play', '#3fa9ff', t('cover.play'), t('cover.play.sub')) +
        portal('goto-settings', '#b98bff', t('cover.settings'), t('cover.settings.sub')) +
        portal('goto-credits', '#52f0e6', t('cover.credits'), t('cover.credits.sub')) +
      '</div>' +
      '<div class="cover-foot">' +
        '<span>' + esc(t('cover.footer')) + '</span>' +
        '<span class="dot">v' + esc(CF.VERSION) + '</span>' +
        '<span>' + esc(t('cover.footer2')) + '</span>' +
      '</div>' +
    '</div></div>';
  }

  function showCover() {
    CF.online.unwatchRooms();
    if (CF.online.room) CF.online.leaveRoom(true);
    stopGame();
    setCover();
    state.onlineMode = false;
    state.victoryShown = false;
    state.onlineCtx = null;
    clearOverlay();
    setScreen(coverMarkup(), 'cover');
    CF.audio.music(CF.cues.musicMenu);
  }

  function showPlay() {
    setCover();
    var status = connectionLabel();
    var flex = '<div class="screen"><div class="menu">' +
      header(t('play.title'), t('play.subtitle'), 'back-cover') +
      '<div class="menu-body">' +
        '<div class="cover-portals">' +
          portal('goto-offline', '#52f0e6', t('play.offline'), t('play.offline.sub')) +
          portal('goto-online', '#57ffa8', t('play.online'), t('play.online.sub')) +
        '</div>' +
        '<div class="panel-note" data-conn-note style="text-align:center;max-width:620px">' + esc(status) + '</div>' +
      '</div>' +
    '</div></div>';
    setScreen(flex, 'play');
  }

  function connectionLabel() {
    var s = CF.online.status;
    if (s === 'connected') return t('online.conn.ready');
    if (s === 'connecting' || s === 'reconnecting') return t('online.conn.wait');
    if (s === 'error' || s === 'disconnected') return t('online.conn.fail');
    return t('online.conn.wait');
  }

  function connectionDot() {
    var s = CF.online.status;
    var cls = s === 'connected' ? 'live' : s === 'error' || s === 'disconnected' ? 'warn' : '';
    return '<span class="' + cls + '">' + esc(connectionLabel()) + '</span>';
  }

  function charCards(selected, compact) {
    return '<div class="char-grid">' + CF.characters.map(function (ch) {
      var on = ch.id === selected ? ' selected' : '';
      var locked = compact && state.onlineMode ? '' : '';
      return '<button class="char-card' + on + locked + '" data-action="select-char" data-char="' + ch.id + '" style="--ch:' + ch.accent + '">' +
        '<div class="char-portrait"><canvas width="260" height="195"></canvas>' +
          '<span class="char-temp">' + esc(t('offline.temp')) + '</span>' +
          '<span class="char-slot">P' + ch.slot + '</span>' +
          '<span class="char-check">' + (on ? '✓' : '') + '</span>' +
        '</div>' +
        '<div class="char-name">' + esc(t(ch.nameKey)) + '</div>' +
        '<div class="char-role">' + esc(t(ch.roleKey)) + '</div>' +
        '<p class="char-desc">' + esc(t(ch.descKey)) + '</p>' +
        '<div class="char-ability">' + esc(t(ch.abilityKey)) + ' — ' + esc(t(ch.abilityDescKey)) + '</div>' +
      '</button>';
    }).join('') + '</div>';
  }

  function drawCharPortraits(root) {
    $$('.char-portrait canvas', root || overlay).forEach(function (cv, i) {
      var card = cv.closest('[data-char]');
      var id = card ? card.getAttribute('data-char') : (CF.characters[i] && CF.characters[i].id);
      if (id) E.drawPortrait(cv, id);
    });
  }

  function showOffline() {
    setCover();
    state.coop = false;
    var diffOptions = ['easy', 'normal', 'hard'].map(function (id) {
      return '<button data-action="set-difficulty" data-diff="' + id + '" class="' + (state.difficulty === id ? 'on' : '') + '">' + esc(t(CF.difficulties[id].key)) + '</button>';
    }).join('');
    var d = CF.difficulties[state.difficulty] || CF.difficulties.normal;
    var diffDesc = t('diff.' + d.id + '.desc');
    var html = '<div class="screen"><div class="menu">' +
      header(t('offline.title'), t('offline.subtitle'), 'goto-play') +
      '<div class="menu-body"><div class="menu-panel">' +
        '<div class="panel-head"><div><h2>' + esc(t('offline.choose')) + '</h2><div class="panel-note">' + esc(t('offline.chooseDesc')) + '</div></div>' +
          '<span class="badge">' + esc(t('common.optional')) + '</span></div>' +
        charCards(state.selectedChar, false) +
        '<div class="divider" style="margin:16px 0"></div>' +
        '<div class="row">' +
          '<div class="field"><label>' + esc(t('common.difficulty')) + '</label><div class="seg" data-diff-seg>' + diffOptions + '</div>' +
            '<div class="diff-desc" data-diff-desc>' + esc(diffDesc) + '</div></div>' +
          '<div class="field">' +
            '<label class="switch"><input type="checkbox" id="coop-toggle" data-coop><span>' + esc(t('offline.coop')) + '</span></label>' +
            '<div class="field-hint">' + esc(t('offline.coopDesc')) + '</div></div>' +
        '</div>' +
        '<div class="menu-actions" style="margin-top:18px">' +
          backButton('goto-play', t('common.back')) +
          portal('start-offline', '#57ffa8', t('offline.start'), '') +
        '</div>' +
      '</div></div></div></div>';
    setScreen(html, 'offline');
    drawCharPortraits(overlay);
    var coop = $('[data-coop]', overlay);
    if (coop) coop.checked = state.coop;
  }

  function selectChar(id) {
    if (['p1', 'p2', 'p3'].indexOf(id) < 0) return;
    state.selectedChar = id;
    if (state.screen === 'offline') {
      $$('.char-card', overlay).forEach(function (c) {
        var on = c.getAttribute('data-char') === id;
        c.classList.toggle('selected', on);
        var check = $('.char-check', c);
        if (check) check.textContent = on ? '✓' : '';
      });
      CF.audio.play(CF.cues.uiClick, { gain: 0.5 });
    }
  }

  function startOffline() {
    state.onlineMode = false;
    state.lastMode = state.coop ? 'coop' : 'solo';
    state.victoryShown = false;
    state.crystals = 0;
    setGame();
    startOfflineLevel(0, false);
  }

  function makeOfflineCfg(index) {
    return {
      mode: state.coop ? 'coop' : 'solo',
      levelIndex: index,
      difficulty: state.difficulty,
      startChar: state.selectedChar,
      name: CF.store.profile().name,
      onPause: function () { showPause(); },
      onComplete: function (data) {
        if (game) game.pause(true);
        state.crystals = data.crystals;
        state.levelIndex = data.levelIndex;
        showComplete(false);
      },
      onVictory: function () {
        if (game) game.pause(true);
        showVictory(false);
      }
    };
  }

  function startOfflineLevel(index, skipIntro) {
    state.onlineMode = false;
    state.levelIndex = index;
    state.lastMode = state.coop ? 'coop' : 'solo';
    setGame();
    if (!game) game = CF.game;
    game.start(makeOfflineCfg(index));
    state.lastCfg = makeOfflineCfg(index);
    state.screen = 'game';
    if (skipIntro) {
      clearOverlay();
      game.pause(false);
    } else {
      game.pause(true);
      showIntro(index, function () {
        if (!game || !game.running) return;
        state.screen = 'game';
        clearOverlay();
        game.pause(false);
      });
    }
    CF.audio.music(index === 0 ? CF.cues.musicEra1 : index === 1 ? CF.cues.musicEra2 : CF.cues.musicEra3);
    fitGame();
  }

  function playersFromContext(ctx) {
    if (ctx && ctx.players && ctx.players.length) return ctx.players;
    return CF.online.players || [];
  }

  function charsFor(players, myId) {
    var mine = null;
    players.forEach(function (p) {
      if (p.id === myId) mine = p;
    });
    var list = mine ? ((mine.chars && mine.chars.length ? mine.chars : [mine.char]).filter(Boolean)) : ['p1'];
    return list.length ? [list[0]] : ['p1'];
  }

  function playerNamesMap(players) {
    var out = {};
    players.forEach(function (p) {
      out[p.id] = { name: p.name, chars: (p.chars && p.chars.length ? p.chars : [p.char]).filter(Boolean) };
    });
    return out;
  }

  function makeOnlineCfg(index) {
    var players = playersFromContext(state.onlineCtx);
    var isHost = CF.online.isHost;
    var myId = CF.online.myId;
    var locals = charsFor(players, myId);
    var me = players.filter(function (p) { return p.id === myId; })[0];
    return {
      mode: 'online',
      levelIndex: index,
      difficulty: (state.onlineCtx && state.onlineCtx.difficulty) || CF.online.difficulty || 'normal',
      startChar: me && me.char ? me.char : locals[0],
      localChars: locals,
      name: CF.online.myName || CF.store.profile().name,
      online: {
        isHost: isHost,
        myId: myId,
        players: players,
        playerNames: playerNamesMap(players),
        ping: CF.online.ping,
        positions: CF.online.positions,
        send: CF.online.send,
        markDirty: CF.online.markDirty
      },
      onPause: function () { showPause(); },
      onComplete: function () {
        if (game) game.pause(true);
        state.levelIndex = index;
        showComplete(!CF.online.isHost);
      },
      onVictory: function () {
        if (!CF.online.isHost) return;
        if (game) game.pause(true);
        if (!state.victoryReported) {
          state.victoryReported = true;
          CF.online.sendVictory();
        }
        showVictory(false);
      }
    };
  }

  function beginOnlineLevel(index, ctx) {
    if (ctx) state.onlineCtx = ctx;
    if (!state.onlineCtx) state.onlineCtx = { players: CF.online.players, levelIndex: index };
    state.onlineMode = true;
    state.lastMode = 'online';
    state.levelIndex = index;
    state.victoryShown = false;
    state.victoryReported = false;
    setGame();
    if (!game) game = CF.game;
    var cfg = makeOnlineCfg(index);
    state.lastCfg = cfg;
    game.start(cfg);
    CF.online.attachGame(game);
    state.screen = 'game';
    game.pause(true);
    showIntro(index, function () {
      if (!game || !game.running) return;
      state.screen = 'game';
      clearOverlay();
      game.pause(false);
    });
    CF.audio.music(index === 0 ? CF.cues.musicEra1 : index === 1 ? CF.cues.musicEra2 : CF.cues.musicEra3);
    fitGame();
  }

  function showIntro(index, onContinue) {
    var level = CF.levels[index];
    if (!level) { if (onContinue) onContinue(); return; }
    state.introContinue = onContinue;
    var html = '<div class="cinematic">' +
      '<div class="cine-era">' + esc(t('hud.era')) + ' ' + (index + 1) + ' / 3</div>' +
      '<div class="cine-line"></div>' +
      '<h2>' + esc(t(level.nameKey)) + '</h2>' +
      '<p style="color:#8ea2c7;margin-bottom:8px">' + esc(t(level.whenKey)) + '</p>' +
      '<p>' + esc(t(level.storyKey)) + '</p>' +
      '<div class="menu-actions">' + portal('continue-intro', '#57ffa8', t('offline.start'), '') + '</div>' +
      '<div class="cine-key">' + esc(t('cover.footer2')) + '</div>' +
    '</div>';
    clearOverlay();
    state.screen = 'intro';
    overlay.innerHTML = html;
    CF.i18n.applyDom(overlay);
    bindPortals(overlay);
  }

  function continueIntro() {
    var cb = state.introContinue;
    state.introContinue = null;
    if (cb) cb();
  }

  function showPause() {
    if (!game || !game.running) return;
    if (game) game.pause(true);
    var controls = state.lastMode === 'coop'
      ? 'P1 A/D · W · Q    P2 F/H · T · R    P3 J/L · I · U'
      : 'A/D o ←/→ · W/↑/ESPACIO · E interactuar/escanear';
    var online = state.onlineMode;
    var host = CF.online.isHost;
    var html = '<div class="screen"><div class="cinematic pause-screen">' +
      '<div class="cine-era">' + esc(t('msg.pause')) + '</div>' +
      '<div class="cine-line"></div>' +
      '<h2>' + esc(t('msg.pause')) + '</h2>' +
      '<p>' + esc(t('msg.controls')) + '<br><span style="color:#a9dfff">' + esc(controls) + '</span></p>' +
      '<div class="menu-actions">' +
        '<button class="btn btn--green" data-action="resume">' + esc(t('msg.resume')) + '</button>' +
        '<button class="btn btn--ghost" data-action="pause-settings">' + esc(t('settings.title')) + '</button>' +
        (online ? '' : '<button class="btn btn--ghost" data-action="restart-level">' + esc(t('msg.reset')) + '</button>') +
        '<button class="btn btn--red" data-action="exit-game">' + esc(t('msg.exitMenu')) + '</button>' +
      '</div>' +
      (online ? '<div class="cine-key">' + esc(host ? t('online.lobby.youAreHost') : t('online.lobby.waitingHost')) + '</div>' : '') +
    '</div></div>';
    setScreen(html, 'pause');
  }

  function resumeGame() {
    if (!game || !game.running) { showCover(); return; }
    state.screen = 'game';
    clearOverlay();
    game.pause(false);
  }

  function showComplete(waiting) {
    if (!game) return;
    game.pause(true);
    var online = state.onlineMode;
    var host = CF.online.isHost;
    var html = '<div class="screen"><div class="cinematic">' +
      '<div class="cine-era">' + esc(t('msg.shardAll')) + '</div>' +
      '<div class="cine-line"></div>' +
      '<h2>' + esc(t('msg.levelClear')) + '</h2>' +
      '<p>' + esc(t(waiting ? 'msg.waitHost' : 'msg.shardAll')) + '</p>' +
      '<div class="menu-actions">' +
        (!waiting ? '<button class="btn btn--green" data-action="next-level">' + esc(t('msg.nextEra')) + '</button>' : '') +
        '<button class="btn btn--ghost" data-action="exit-game">' + esc(t('msg.exitMenu')) + '</button>' +
      '</div>' +
      (waiting ? '<div class="cine-key">' + esc(t('online.lobby.waitingHost')) + '</div>' : '') +
    '</div></div>';
    setScreen(html, 'complete');
  }

  function nextLevel() {
    var next = state.levelIndex + 1;
    if (next >= CF.levels.length) { showVictory(false); return; }
    if (state.onlineMode) {
      if (!CF.online.isHost) { showComplete(true); return; }
      CF.online.sendLevel(next);
      beginOnlineLevel(next, state.onlineCtx);
    } else {
      setGame();
      startOfflineLevel(next, false);
    }
  }

  function showVictory(remote) {
    if (!game) return;
    if (state.victoryShown) return;
    state.victoryShown = true;
    game.pause(true);
    var html = '<div class="screen"><div class="cinematic">' +
      '<div class="cine-era">' + esc(t('msg.victory')) + '</div>' +
      '<div class="cine-line"></div>' +
      '<h2>' + esc(t('msg.victory')) + '</h2>' +
      '<p>' + esc(t('msg.victoryDesc')) + '</p>' +
      '<p style="color:#8ea2c7">' + esc(t('msg.ending')) + '</p>' +
      '<div class="menu-actions">' +
        '<button class="btn" data-action="victory-credits">' + esc(t('cover.credits')) + '</button>' +
        '<button class="btn btn--green" data-action="victory-menu">' + esc(t('msg.menu')) + '</button>' +
      '</div>' +
      (remote ? '<div class="cine-key">' + esc(t('common.online')) + '</div>' : '') +
    '</div></div>';
    setScreen(html, 'victory');
    CF.audio.play(CF.cues.victory, { gain: 0.9 });
  }

  function showSettings(back) {
    state.settingsBack = back || function () { showCover(); };
    clearOverlay();
    state.screen = 'settings';
    CF.settingsUI.render(overlay, function () {
      var cb = state.settingsBack;
      state.settingsBack = null;
      if (cb) cb();
    });
  }

  function showCredits(back) {
    state.creditsBack = back || function () { showCover(); };
    clearOverlay();
    state.screen = 'credits';
    CF.creditsUI.render(overlay, function () {
      var cb = state.creditsBack;
      state.creditsBack = null;
      if (cb) cb();
      else showCover();
    });
  }

  function showOnlineIdentity() {
    CF.online.unwatchRooms();
    if (CF.online.room) {
      CF.online.leaveRoom(true);
    }
    setCover();
    state.onlineMode = true;
    state.identityName = CF.store.profile().name;
    state.identityChar = state.selectedChar;
    state.identityRegion = CF.online.region || state.region || 'america';
    CF.online.setIdentity({ name: state.identityName, char: state.identityChar, region: state.identityRegion });
    renderIdentity();
    CF.online.connect().then(function () {
      updateConnDom();
    }).catch(function () {
      updateConnDom();
      toast(t('online.conn.fail'), 'err');
    });
  }

  function renderIdentity() {
    var regions = CF.regions.map(function (r) {
      return '<button data-action="select-region" data-region="' + r.id + '" class="' + (state.identityRegion === r.id ? 'on' : '') + '">' + esc(t(r.labelKey)) + '</button>';
    }).join('');
    var html = '<div class="screen"><div class="menu">' +
      header(t('online.identity.title'), t('online.identity.subtitle'), 'back-cover') +
      '<div class="menu-body"><div class="menu-panel">' +
        '<div class="panel-head"><div><h2>' + esc(t('online.name')) + '</h2>' +
          '<div class="panel-note" data-conn>' + connectionDot() + '</div></div>' +
          '<button class="btn btn--ghost btn--sm" data-action="change-name">' + esc(t('online.nameEdit')) + '</button></div>' +
        '<div class="lobby-code" data-identity-name style="font-size:clamp(18px,3vw,32px)">' + esc(state.identityName) + '</div>' +
        '<div class="field-hint center" style="margin-bottom:14px">' + esc(t('online.nameHint')) + '</div>' +
        '<div class="divider"></div>' +
        '<div class="section-label" style="margin:12px 0 8px">' + esc(t('online.char')) + '</div>' +
        charCards(state.identityChar, true) +
        '<div class="divider" style="margin:14px 0"></div>' +
        '<div class="field"><label>' + esc(t('online.region')) + '</label><div class="seg">' + regions + '</div>' +
          '<div class="field-hint">' + esc(t('online.regionHint')) + '</div></div>' +
        '<div class="menu-actions" style="margin-top:18px">' +
          backButton('back-cover', t('common.back')) +
          portal('online-done', '#57ffa8', t('online.done'), '') +
        '</div>' +
      '</div></div></div></div>';
    setScreen(html, 'online-identity');
    drawCharPortraits(overlay);
  }

  function selectIdentityChar(id) {
    state.identityChar = id;
    state.selectedChar = id;
    $$('.char-card', overlay).forEach(function (c) {
      var on = c.getAttribute('data-char') === id;
      c.classList.toggle('selected', on);
      var check = $('.char-check', c);
      if (check) check.textContent = on ? '✓' : '';
    });
  }

  function ensureIdentity(done) {
    var v = CF.store.validateName(state.identityName);
    if (!v.ok) {
      toast(t('online.nameError'), 'err');
      return;
    }
    CF.online.setIdentity({ name: v.name, char: state.identityChar, region: state.identityRegion });
    state.identityName = v.name;
    CF.store.setName(v.name);
    state.selectedChar = state.identityChar;
    state.region = state.identityRegion;
    CF.online.connect().then(function () {
      if (done) done();
    }).catch(function (err) {
      toast(onlineError(err), 'err');
      updateConnDom();
    });
  }

  function showOnlineMenu() {
    CF.online.unwatchRooms();
    setCover();
    state.onlineMode = true;
    var html = '<div class="screen"><div class="menu">' +
      header(t('online.menu.title'), t('online.menu.subtitle'), 'goto-online-identity') +
      '<div class="menu-body">' +
        '<div class="cover-portals">' +
          portal('goto-join-code', '#57ffa8', t('online.menu.join'), t('online.menu.join.desc')) +
          portal('goto-join-list', '#52f0e6', t('online.menu.search'), t('online.menu.search.desc')) +
          portal('goto-create', '#b98bff', t('online.menu.create'), t('online.menu.create.desc')) +
        '</div>' +
        '<div class="panel-note" data-conn style="text-align:center;max-width:680px">' + connectionDot() + '<br>' + esc(t('online.secureNote')) + '</div>' +
      '</div>' +
    '</div></div>';
    setScreen(html, 'online-menu');
  }

  function roomRow(r) {
    var count = (r.players && r.players.length) || 0;
    var full = count >= (r.max || 3);
    var playing = r.status === 'playing';
    var statusTxt = playing ? t('online.room.playing') : t('online.room.lobby');
    var ping = r.ping != null ? r.ping + 'ms' : '—';
    var regionKey = 'online.region.' + (r.region || 'america');
    return '<button class="room ' + (state.joinSelected === r.code ? 'selected' : '') + '" data-action="select-room" data-code="' + esc(r.code) + '">' +
      '<span class="code">' + esc(r.code) + '</span>' +
      '<span class="meta">' + esc(t(regionKey)) + '</span>' +
      '<span>' + esc(r.hostName || '—') + '</span>' +
      '<span class="meta">' + esc(count) + '/' + esc(r.max || 3) + '</span>' +
      '<span class="pill ' + (playing ? 'full' : full ? 'full' : 'ok') + '">' + esc(playing ? statusTxt : full ? t('online.list.full') : statusTxt) + '</span>' +
      '<span class="meta" style="grid-column:1/-1;font-size:6px;opacity:.8">' + esc(ping) + ' · ' + esc(t('online.list.ping')) + '</span>' +
    '</button>';
  }

  function roomRowsHtml() {
    if (state.roomsLoading && !state.rooms.length) return '<div class="empty-state"><span class="loader"></span><br>' + esc(t('online.list.loading')) + '</div>';
    if (!state.rooms.length) return '<div class="empty-state">' + esc(t('online.list.empty')) + '<br>' + esc(t('online.search.hint')) + '</div>';
    return state.rooms.map(roomRow).join('');
  }

  function showJoinList() {
    setCover();
    state.onlineMode = true;
    state.roomsLoading = true;
    state.rooms = [];
    state.joinSelected = null;
    var regionName = t('online.region.' + (state.identityRegion || 'america'));
    var html = '<div class="screen"><div class="menu">' +
      header(t('online.list.title').replace('{region}', regionName), t('online.list.subtitle'), 'goto-online-menu') +
      '<div class="menu-body"><div class="menu-panel">' +
        '<div class="panel-head"><div><h2>' + esc(t('online.list.region')) + '</h2>' +
          '<div class="panel-note">' + esc(regionName) + '</div></div>' +
          '<button class="btn btn--ghost btn--sm" data-action="refresh-rooms">' + esc(t('common.refresh')) + '</button></div>' +
        '<div class="room-head"><span>' + esc(t('online.list.code')) + '</span><span>' + esc(t('online.list.region')) + '</span><span>HOST</span><span>' + esc(t('online.list.players')) + '</span><span>' + esc(t('online.list.status')) + '</span></div>' +
        '<div class="room-list" data-rooms>' + roomRowsHtml() + '</div>' +
        '<div class="field-error" data-join-error></div>' +
        '<div class="menu-actions" style="margin-top:16px">' +
          backButton('goto-online-menu', t('common.back')) +
          '<button class="btn btn--green" data-action="join-selected" data-join-selected ' + (state.joinSelected ? '' : 'disabled') + '>' + esc(t('online.list.join')) + '</button>' +
        '</div>' +
      '</div></div></div></div>';
    setScreen(html, 'join-list');
    CF.online.watchRooms(state.identityRegion, function (rooms, err) {
      state.roomsLoading = false;
      if (err) {
        toast(t('online.list.error'), 'err');
        state.rooms = [];
      } else {
        state.rooms = rooms || [];
      }
      if (state.screen === 'join-list') updateRoomListDom();
    });
  }

  function updateRoomListDom() {
    var box = $('[data-rooms]', overlay);
    if (box) box.innerHTML = roomRowsHtml();
    var btn = $('[data-join-selected]', overlay);
    if (btn) btn.disabled = !state.joinSelected;
    $$('.room', overlay).forEach(function (row) {
      row.classList.toggle('selected', row.getAttribute('data-code') === state.joinSelected);
    });
    var err = $('[data-join-error]', overlay);
    if (err) err.textContent = '';
  }

  function selectRoom(code) {
    state.joinSelected = code;
    $$('.room', overlay).forEach(function (row) {
      row.classList.toggle('selected', row.getAttribute('data-code') === code);
    });
    var btn = $('[data-join-selected]', overlay);
    if (btn) btn.disabled = false;
    CF.audio.play(CF.cues.uiClick, { gain: 0.5 });
  }

  function joinRoom(code) {
    if (state.joinBusy) return;
    var v = CF.store.validateRoomCode(code);
    if (!v.ok) { toast(t('online.err.code'), 'err'); return; }
    state.joinBusy = true;
    state.joinSelected = v.code;
    var errBox = $('[data-join-error]', overlay);
    if (errBox) errBox.textContent = t('online.search.joining');
    toast(t('online.search.joining'), 'info');
    CF.online.joinRoom(v.code).then(function () {
      state.joinBusy = false;
      CF.online.unwatchRooms();
      showLobby();
    }).catch(function (err) {
      state.joinBusy = false;
      var msg = onlineError(err);
      if (errBox) errBox.textContent = msg;
      toast(msg, 'err');
    });
  }

  function showJoinCode() {
    setCover();
    state.onlineMode = true;
    var html = '<div class="screen"><div class="menu">' +
      header(t('online.search.title'), t('online.search.subtitle'), 'goto-online-menu') +
      '<div class="menu-body"><div class="menu-panel" style="max-width:560px">' +
        '<div class="field"><label for="join-code">' + esc(t('online.search.label')) + '</label>' +
          '<input class="input" id="join-code" maxlength="10" autocomplete="off" spellcheck="false" placeholder="CF-XXXX" value="">' +
          '<div class="field-hint">' + esc(t('online.search.hint')) + '</div>' +
          '<div class="field-error" data-join-error></div>' +
        '</div>' +
        '<div class="menu-actions" style="margin-top:18px">' +
          backButton('goto-online-menu', t('common.back')) +
          portal('join-code', '#57ffa8', t('online.list.join'), '') +
        '</div>' +
      '</div></div></div></div>';
    setScreen(html, 'join-code');
    var input = $('#join-code', overlay);
    if (input) {
      input.focus();
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); joinRoom(input.value); }
      });
      input.addEventListener('input', function () {
        input.value = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      });
    }
  }

  function showCreate() {
    setCover();
    state.onlineMode = true;
    var code = CF.store.genRoomCode();
    var diffOptions = ['easy', 'normal', 'hard'].map(function (id) {
      return '<button data-action="set-create-difficulty" data-diff="' + id + '" class="' + (state.difficulty === id ? 'on' : '') + '">' + esc(t(CF.difficulties[id].key)) + '</button>';
    }).join('');
    var html = '<div class="screen"><div class="menu">' +
      header(t('online.create.title'), t('online.create.subtitle'), 'goto-online-menu') +
      '<div class="menu-body"><div class="menu-panel" style="max-width:640px">' +
        '<div class="field"><label for="create-code">' + esc(t('online.create.roomId')) + '</label>' +
          '<div class="row row--tight" style="align-items:stretch"><div style="flex:1 1 220px"><input class="input" id="create-code" maxlength="10" autocomplete="off" spellcheck="false" value="' + esc(code) + '"></div>' +
          '<button class="btn btn--ghost btn--sm" data-action="gen-code" style="flex:0 0 auto">' + esc(t('common.refresh')) + '</button></div>' +
          '<div class="field-hint">' + esc(t('online.create.roomHint')) + '</div>' +
          '<div class="field-error" data-create-error></div>' +
        '</div>' +
        '<div class="divider" style="margin:14px 0"></div>' +
        '<div class="field"><label>' + esc(t('common.difficulty')) + '</label><div class="seg">' + diffOptions + '</div>' +
          '<div class="field-hint">' + esc(t('online.lobby.startHint')) + '</div></div>' +
        '<div class="menu-actions" style="margin-top:18px">' +
          backButton('goto-online-menu', t('common.back')) +
          portal('create-room', '#57ffa8', t('online.create.done'), '') +
        '</div>' +
      '</div></div></div></div>';
    setScreen(html, 'create');
    var input = $('#create-code', overlay);
    if (input) {
      input.addEventListener('input', function () {
        input.value = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); createRoom(input.value); }
      });
    }
  }

  function createRoom(code) {
    if (state.createBusy) return;
    var v = CF.store.validateRoomCode(code);
    var errBox = $('[data-create-error]', overlay);
    if (!v.ok) {
      if (errBox) errBox.textContent = t('online.create.invalid');
      toast(t('online.create.invalid'), 'err');
      return;
    }
    state.createBusy = true;
    if (errBox) errBox.textContent = t('online.create.creating');
    toast(t('online.create.creating'), 'info');
    CF.online.createRoom(v.code, state.difficulty).then(function () {
      state.createBusy = false;
      showLobby();
    }).catch(function (err) {
      state.createBusy = false;
      var msg = onlineError(err);
      if (errBox) errBox.textContent = msg;
      toast(msg, 'err');
    });
  }

  function showLobby() {
    if (!CF.online.room) { showOnlineMenu(); return; }
    setCover();
    state.onlineMode = true;
    state.identityName = CF.online.myName;
    renderLobbyStatic();
    updateLobbyDom();
  }

  function renderLobbyStatic() {
    var room = CF.online.room;
    if (!room) return;
    state.lobbyBuilt = true;
    state.lobbyRoomCode = room.code;
    state.lobbyWasHost = CF.online.isHost;
    var isHost = CF.online.isHost;
    var html = '<div class="screen"><div class="menu">' +
      header(t('online.lobby.title'), room.code, 'leave-room') +
      '<div class="menu-body"><div class="menu-panel" style="max-width:760px">' +
        '<div class="panel-head"><div>' +
          '<div class="section-label">' + esc(t('online.lobby.code')) + '</div>' +
          '<div class="lobby-code" data-lobby-code>' + esc(room.code) + '</div>' +
        '</div><div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn btn--ghost btn--sm" data-action="copy-code">' + esc(t('common.copy')) + '</button>' +
          '<button class="btn btn--ghost btn--sm" data-action="change-name">' + esc(t('online.nameEdit')) + '</button>' +
        '</div></div>' +
        '<div class="panel-note" style="margin-bottom:10px" data-lobby-status>' + esc(t('common.loading')) + '</div>' +
        '<div class="player-list" data-lobby-players></div>' +
        '<div class="divider" style="margin:16px 0"></div>' +
        '<div class="row">' +
          '<div class="field"><label>' + esc(t('common.region')) + '</label><div>' + esc(t('online.region.' + (room.region || 'america'))) + '</div></div>' +
          '<div class="field"><label>' + esc(t('common.difficulty')) + '</label><div>' + esc(t(CF.difficulties[room.difficulty] ? CF.difficulties[room.difficulty].key : 'common.normal')) + '</div></div>' +
        '</div>' +
        '<div class="field-hint" style="margin-top:10px">' + esc(t('online.lobby.publicNote')) + '</div>' +
        '<div class="menu-actions" style="margin-top:16px">' +
          '<button class="btn btn--red" data-action="leave-room">' + esc(t('online.lobby.leave')) + '</button>' +
          (isHost ? portal('start-online', '#57ffa8', t('online.lobby.start'), '') :
            '<span class="badge live">' + esc(t('online.lobby.youAreGuest')) + '</span>') +
        '</div>' +
      '</div></div></div></div>';
    setScreen(html, 'lobby');
  }

  function updateLobbyDom() {
    var room = CF.online.room;
    if (!room || state.screen !== 'lobby') return;
    if (state.lobbyRoomCode !== room.code || state.lobbyWasHost !== CF.online.isHost) {
      renderLobbyStatic();
    }
    var isHost = CF.online.isHost;
    var count = (room.players || []).length;
    var ready = count >= 1;
    var codeEl = $('[data-lobby-code]', overlay);
    if (codeEl) codeEl.textContent = room.code;
    var statusEl = $('[data-lobby-status]', overlay);
    if (statusEl) {
      statusEl.innerHTML = connectionDot() + ' · ' + esc(isHost ? t('online.lobby.youAreHost') : t('online.lobby.youAreGuest')) + ' · ' + esc(t('common.players')) + ' ' + count + '/3' + (ready ? ' · ' + esc(t('online.lobby.soloLink')) : ' · ' + esc(t('online.lobby.waiting')));
    }
    var box = $('[data-lobby-players]', overlay);
    if (box) {
      var players = room.players || [];
      var html = '';
      for (var i = 0; i < 3; i++) {
        var p = players[i];
        if (!p) {
          html += '<div class="player-row slot-empty"><span class="player-dot" style="--ch:#5a6b8d"></span><span class="pname">' + esc(t('online.lobby.slot')) + ' ' + (i + 1) + '</span></div>';
          continue;
        }
        var ch = CF.characters.filter(function (c) { return c.id === p.char; })[0];
        var you = p.id === CF.online.myId;
        html += '<div class="player-row">' +
          '<span class="player-dot" style="--ch:' + (ch ? ch.accent : '#52f0e6') + '"></span>' +
          '<span class="pname">' + esc(p.name) + (you ? ' · ' + esc(t('common.you')) : '') + '</span>' +
          '<span class="pchar">' + esc(ch ? t(ch.nameKey) : '') + '</span>' +
          (p.id === room.hostId ? '<span class="phost">' + esc(t('common.host')) + '</span>' : '') +
          '<span class="ping">' + esc(p.ping != null ? p.ping + 'ms' : '') + '</span>' +
        '</div>';
      }
      box.innerHTML = html;
    }
    var copy = $('[data-action="copy-code"]', overlay);
    if (copy) copy.disabled = false;
    var start = $('[data-action="start-online"]', overlay);
    if (start) {
      start.disabled = state.startBusy || !ready;
      start.title = ready ? '' : t('online.lobby.waiting');
    }
  }

  function copyCode() {
    var code = CF.online.code || state.lobbyRoomCode;
    if (!code) return;
    function done() { toast(t('common.copied'), 'ok'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done).catch(fallback);
    } else fallback();
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      } catch (e) { toast(t('common.copy') + ': ' + code, 'info'); }
    }
  }

  function startOnline() {
    if (!CF.online.isHost || state.startBusy) return;
    if (!CF.online.room || !(CF.online.room.players || []).length) {
      toast(t('online.lobby.needPlayer'), 'err');
      return;
    }
    state.startBusy = true;
    updateLobbyDom();
    CF.online.startGameHost().then(function (payload) {
      state.startBusy = false;
      state.onlineCtx = payload;
      state.victoryReported = false;
      beginOnlineLevel(0, payload);
    }).catch(function (err) {
      state.startBusy = false;
      updateLobbyDom();
      toast(onlineError(err), 'err');
    });
  }

  function onlineError(err) {
    var m = String((err && err.message) || err || '');
    if (m === 'conflict') return t('online.create.conflict');
    if (m === 'invalid') return t('online.create.invalid');
    if (m === 'notfound') return t('online.err.roomGone');
    if (m === 'full') return t('online.err.full');
    if (m === 'char') return t('online.err.char');
    if (m === 'started') return t('online.err.started');
    if (m === 'needThree') return t('online.lobby.needThree');
    if (m === 'needPlayer') return t('online.lobby.soloLink');
    if (m === 'timeout') return t('online.err.timeout');
    if (m === 'host') return t('online.err.host');
    if (m === 'closed') return t('online.lobby.closed');
    return t('online.err.generic');
  }

  function openNameDialog(onSaved) {
    var current = state.identityName || CF.store.profile().name;
    var wrap = document.createElement('div');
    wrap.className = 'dialog-wrap';
    wrap.innerHTML = '<div class="dialog"><h3>' + esc(t('online.nameEdit')) + '</h3>' +
      '<p>' + esc(t('online.nameHint')) + '</p>' +
      '<div class="field"><label for="name-input">' + esc(t('online.name')) + '</label>' +
        '<input class="input" id="name-input" maxlength="18" autocomplete="off" value="' + esc(current) + '">' +
        '<div class="field-error" data-name-error></div>' +
      '</div>' +
      '<div class="menu-actions">' +
        '<button class="btn btn--ghost" data-dialog="cancel">' + esc(t('common.cancel')) + '</button>' +
        '<button class="btn btn--green" data-dialog="save">' + esc(t('common.save')) + '</button>' +
      '</div></div>';
    overlay.appendChild(wrap);
    var input = $('#name-input', wrap);
    var err = $('[data-name-error]', wrap);
    if (input) { input.focus(); input.select(); }
    function close() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }
    function save() {
      var v = CF.store.validateName(input ? input.value : '');
      if (!v.ok) {
        if (err) err.textContent = t('online.nameError');
        return;
      }
      state.identityName = v.name;
      state.selectedChar = state.identityChar;
      CF.store.setName(v.name);
      CF.online.setIdentity({ name: v.name, char: state.identityChar });
      var r = CF.online.updateName(v.name);
      if (r && !r.ok) {
        if (err) err.textContent = t('online.nameError');
        return;
      }
      close();
      toast(t('online.nameSaved'), 'ok');
      if (onSaved) onSaved(v.name);
      if (state.screen === 'online-identity') renderIdentity();
      if (state.screen === 'lobby') updateLobbyDom();
    }
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) close();
    });
    $$('[data-dialog]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('data-dialog') === 'save') save();
        else close();
      });
    });
    if (input) input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
  }

  function updateConnDom() {
    $$('[data-conn]', overlay).forEach(function (el) {
      el.innerHTML = connectionDot();
    });
    var note = $('[data-conn-note]', overlay);
    if (note) note.textContent = connectionLabel();
  }

  function fitGame() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var scale = Math.min(vw / 960, vh / 540);
    var w = Math.round(960 * scale);
    var h = Math.round(540 * scale);
    gameCanvas.style.inset = 'auto';
    gameCanvas.style.position = 'absolute';
    gameCanvas.style.width = w + 'px';
    gameCanvas.style.height = h + 'px';
    gameCanvas.style.left = Math.round((vw - w) / 2) + 'px';
    gameCanvas.style.top = Math.round((vh - h) / 2) + 'px';
    gameCanvas.style.right = 'auto';
    gameCanvas.style.bottom = 'auto';
  }

  function resizeCover() {
    var w = Math.max(320, Math.min(1920, window.innerWidth));
    var h = Math.max(240, Math.min(1080, window.innerHeight));
    if (w === coverSize.w && h === coverSize.h) return;
    coverSize.w = w;
    coverSize.h = h;
    cover.width = w;
    cover.height = h;
    coverStars = [];
    var count = Math.round(w * h / 9000);
    for (var i = 0; i < count; i++) {
      coverStars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: 0.2 + Math.random() * 0.8,
        ph: Math.random() * Math.PI * 2,
        c: Math.random() < 0.18 ? '185,139,255' : Math.random() < 0.5 ? '82,240,230' : '180,205,255'
      });
    }
    coverShards = [];
    for (var j = 0; j < 18; j++) {
      coverShards.push({
        a: Math.random() * Math.PI * 2,
        r: 100 + Math.random() * 190,
        s: 2 + Math.random() * 5,
        sp: (Math.random() - 0.5) * 0.25,
        ph: Math.random() * Math.PI * 2
      });
    }
  }

  function drawCover(time, dt) {
    if (document.body.classList.contains('is-game')) return;
    var w = coverSize.w, h = coverSize.h;
    if (!w) return;
    var reduced = CF.store.settings.reduceMotion;
    var quality = CF.store.settings.quality;
    var c = coverCtx;
    c.clearRect(0, 0, w, h);
    var g = c.createRadialGradient(w * 0.5, h * 0.44, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    g.addColorStop(0, '#0d1a3d');
    g.addColorStop(0.42, '#060b1c');
    g.addColorStop(1, '#02030a');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);

    for (var i = 0; i < coverStars.length; i++) {
      var s = coverStars[i];
      if (!reduced) {
        s.y += s.z * 7 * dt;
        if (s.y > h + 3) { s.y = -3; s.x = Math.random() * w; }
      }
      var a = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(time * (0.5 + s.z) + s.ph));
      c.fillStyle = 'rgba(' + s.c + ',' + a.toFixed(3) + ')';
      var sz = s.z > 0.82 ? 2 : 1;
      c.fillRect(Math.round(s.x), Math.round(s.y), sz, sz);
    }

    var cx = w * 0.5;
    var cy = h * 0.47;
    var pulse = reduced ? 0.5 : 0.5 + Math.sin(time * 0.9) * 0.12;

    c.save();
    c.translate(cx, cy);
    var rg = c.createRadialGradient(0, 0, 4, 0, 0, Math.min(w, h) * 0.42);
    rg.addColorStop(0, 'rgba(82,240,230,' + (0.22 * pulse).toFixed(3) + ')');
    rg.addColorStop(0.4, 'rgba(63,169,255,.08)');
    rg.addColorStop(1, 'rgba(63,169,255,0)');
    c.fillStyle = rg;
    c.fillRect(-w, -h, w * 2, h * 2);

    var rings = quality === 'low' ? 2 : quality === 'medium' ? 3 : 4;
    for (var r = 0; r < rings; r++) {
      var rad = Math.min(w, h) * (0.17 + r * 0.052) + Math.sin(time * 0.6 + r) * 5;
      c.save();
      c.rotate(time * (0.08 + r * 0.04) + r);
      c.strokeStyle = r % 2 ? 'rgba(185,139,255,.25)' : 'rgba(82,240,230,.3)';
      c.lineWidth = 1;
      c.setLineDash([2 + r, 8 + r * 3]);
      c.beginPath();
      c.ellipse(0, 0, rad * 0.62, rad, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }

    c.save();
    c.rotate(-time * 0.16);
    c.strokeStyle = 'rgba(63,169,255,.35)';
    c.lineWidth = 1.5;
    c.setLineDash([50, 34, 8, 22]);
    c.beginPath();
    c.arc(0, 0, Math.min(w, h) * 0.3, 0, Math.PI * 2);
    c.stroke();
    c.restore();

    c.save();
    c.globalCompositeOperation = 'lighter';
    for (var k = 0; k < coverShards.length; k++) {
      var sh = coverShards[k];
      var ang = sh.a + time * sh.sp;
      var x = Math.cos(ang) * sh.r * (w / 1200);
      var y = Math.sin(ang) * sh.r * 0.55 * (h / 700);
      var tw = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time * 2 + sh.ph));
      c.fillStyle = 'rgba(126,247,255,' + tw.toFixed(3) + ')';
      c.shadowColor = '#52f0e6';
      c.shadowBlur = 8;
      c.fillRect(x - sh.s / 2, y - sh.s / 2, sh.s, sh.s * 1.8);
    }
    c.restore();

    var beam = c.createLinearGradient(0, -h * 0.4, 0, h * 0.4);
    beam.addColorStop(0, 'rgba(82,240,230,0)');
    beam.addColorStop(0.5, 'rgba(82,240,230,.12)');
    beam.addColorStop(1, 'rgba(185,139,255,0)');
    c.fillStyle = beam;
    c.fillRect(-1.5, -h * 0.45, 3, h * 0.9);
    c.restore();

    if (!reduced) {
      c.save();
      c.globalAlpha = 0.16;
      for (var b = 0; b < 4; b++) {
        var bx = (w * 0.5) + Math.sin(time * 0.5 + b * 2.1) * (w * 0.18);
        var by = (h * 0.5) + Math.cos(time * 0.4 + b * 1.7) * (h * 0.16);
        var bg = c.createRadialGradient(bx, by, 0, bx, by, 120);
        bg.addColorStop(0, b % 2 ? 'rgba(185,139,255,.5)' : 'rgba(82,240,230,.5)');
        bg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = bg;
        c.fillRect(bx - 120, by - 120, 240, 240);
      }
      c.restore();
    }

    c.save();
    c.globalAlpha = 0.5;
    c.strokeStyle = 'rgba(82,240,230,.18)';
    c.lineWidth = 1;
    var horizon = h * 0.78;
    for (var l = 0; l < 12; l++) {
      var ly = horizon + l * l * 2.6;
      c.beginPath();
      c.moveTo(0, ly);
      c.lineTo(w, ly);
      c.stroke();
    }
    for (var vline = -12; vline <= 12; vline++) {
      c.beginPath();
      c.moveTo(cx + vline * 14, horizon);
      c.lineTo(cx + vline * w * 0.09, h);
      c.stroke();
    }
    c.restore();

    var vg = c.createRadialGradient(cx, h * 0.45, Math.min(w, h) * 0.15, cx, h * 0.5, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.62)');
    c.fillStyle = vg;
    c.fillRect(0, 0, w, h);
  }

  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!document.body.classList.contains('is-game')) drawCover(now / 1000, dt);
    CF.portal.drawAll(dt);
    if (game && game.running) {
      if (game.online) {
        game.online.players = CF.online.players;
        game.online.positions = CF.online.positions;
        if (CF.online.isHost) {
          var pings = (CF.online.players || []).map(function (p) { return p.ping; }).filter(function (v) { return v > 0; });
          game.online.ping = pings.length ? Math.round(pings.reduce(function (a, b) { return a + b; }, 0) / pings.length) : null;
        } else {
          game.online.ping = CF.online.ping;
        }
      }
      game.update(dt);
      game.render(ctx);
      if (state.onlineMode && !CF.online.isHost && game.completed && state.screen === 'game' && !state.victoryShown) {
        showComplete(true);
      }
    }
    requestAnimationFrame(loop);
  }

  function cleanupAndExit() {
    CF.online.unwatchRooms();
    if (CF.online.room) CF.online.leaveRoom(true);
    stopGame();
    state.victoryShown = false;
    showCover();
  }

  function handleAction(action, el) {
    var audio = CF.audio;
    switch (action) {
      case 'goto-play': audio.play(CF.cues.uiClick, { gain: 0.6 }); showPlay(); break;
      case 'goto-offline': audio.play(CF.cues.uiClick, { gain: 0.6 }); showOffline(); break;
      case 'goto-online': audio.play(CF.cues.uiClick, { gain: 0.6 }); showOnlineIdentity(); break;
      case 'goto-settings': audio.play(CF.cues.uiClick, { gain: 0.5 }); showSettings(showCover); break;
      case 'goto-credits': audio.play(CF.cues.uiClick, { gain: 0.5 }); showCredits(showCover); break;
      case 'back-cover': audio.play(CF.cues.uiBack, { gain: 0.5 }); showCover(); break;
      case 'select-char': if (state.screen === 'offline') selectChar(el.getAttribute('data-char')); else selectIdentityChar(el.getAttribute('data-char')); audio.play(CF.cues.uiClick, { gain: 0.4 }); break;
      case 'set-difficulty':
        state.difficulty = el.getAttribute('data-diff');
        $$('[data-action="set-difficulty"]', overlay).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-diff') === state.difficulty); });
        var dd = $('[data-diff-desc]', overlay);
        if (dd && CF.difficulties[state.difficulty]) dd.textContent = t('diff.' + state.difficulty + '.desc');
        audio.play(CF.cues.uiClick, { gain: 0.4 });
        break;
      case 'set-create-difficulty':
        state.difficulty = el.getAttribute('data-diff');
        $$('[data-action="set-create-difficulty"]', overlay).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-diff') === state.difficulty); });
        audio.play(CF.cues.uiClick, { gain: 0.4 });
        break;
      case 'select-region':
        state.identityRegion = el.getAttribute('data-region');
        state.region = state.identityRegion;
        CF.online.setIdentity({ region: state.identityRegion });
        $$('[data-action="select-region"]', overlay).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-region') === state.identityRegion); });
        audio.play(CF.cues.uiClick, { gain: 0.4 });
        break;
      case 'start-offline':
        var coop = $('[data-coop]', overlay);
        state.coop = !!(coop && coop.checked);
        if (game) game.destroy();
        game = null;
        audio.play(CF.cues.portal, { gain: 0.7 });
        startOffline();
        break;
      case 'online-done':
        ensureIdentity(function () {
          showOnlineMenu();
          toast(t('online.conn.ready'), 'ok');
        });
        break;
      case 'change-name':
        openNameDialog(function (name) {
          state.identityName = name;
          if (state.screen === 'online-identity') {
            var nm = $('[data-identity-name]', overlay);
            if (nm) nm.textContent = name;
          }
        });
        break;
      case 'goto-online-menu': CF.online.unwatchRooms(); showOnlineMenu(); break;
      case 'goto-online-identity': showOnlineIdentity(); break;
      case 'goto-join-list': showJoinList(); break;
      case 'goto-join-code': showJoinCode(); break;
      case 'goto-create': showCreate(); break;
      case 'refresh-rooms': CF.online.refreshRooms(); state.roomsLoading = true; updateRoomListDom(); break;
      case 'select-room': selectRoom(el.getAttribute('data-code')); break;
      case 'join-selected': if (state.joinSelected) joinRoom(state.joinSelected); break;
      case 'join-code':
        var jc = $('#join-code', overlay);
        if (jc) joinRoom(jc.value);
        break;
      case 'gen-code':
        var cc = $('#create-code', overlay);
        if (cc) cc.value = CF.store.genRoomCode();
        break;
      case 'create-room':
        var ci = $('#create-code', overlay);
        createRoom(ci ? ci.value : '');
        break;
      case 'copy-code': copyCode(); break;
      case 'leave-room': audio.play(CF.cues.uiBack, { gain: 0.5 }); cleanupAndExit(); showOnlineMenu(); break;
      case 'start-online': startOnline(); break;
      case 'resume': resumeGame(); break;
      case 'pause-settings': showSettings(function () { if (game && game.running) showPause(); else showCover(); }); break;
      case 'restart-level':
        if (state.onlineMode) break;
        startOfflineLevel(state.levelIndex, true);
        break;
      case 'exit-game': cleanupAndExit(); break;
      case 'next-level': nextLevel(); break;
      case 'victory-credits':
        showCredits(function () {
          if (game && game.running) {
            state.victoryShown = false;
            showVictory(false);
          } else {
            showCover();
          }
        });
        break;
      case 'victory-menu': cleanupAndExit(); break;
      case 'continue-intro': continueIntro(); break;
    }
  }

  function bindGlobal() {
    overlay.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (!el || !overlay.contains(el)) return;
      var action = el.getAttribute('data-action');
      if (action === 'skip' || action === 'settings-back' || action === 'settings-done') return;
      if (el.disabled) return;
      handleAction(action, el);
    });
    overlay.addEventListener('pointerover', function (e) {
      var el = e.target.closest('.portal-btn');
      if (!el || el === lastHover) return;
      lastHover = el;
      CF.audio.play(CF.cues.uiHover, { gain: 0.25 });
    });
    overlay.addEventListener('pointerout', function (e) {
      var el = e.target.closest('.portal-btn');
      if (el === lastHover) lastHover = null;
    });
    window.addEventListener('resize', function () {
      resizeCover();
      fitGame();
    });
    document.addEventListener('fullscreenchange', function () {
      var s = CF.store.settings;
      if (s.fullscreen && !document.fullscreenElement) {
        CF.store.saveSettings({ fullscreen: false });
      }
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (state.screen === 'credits') {
          CF.creditsUI.stop();
          var cb = state.creditsBack;
          state.creditsBack = null;
          if (cb) cb(); else showCover();
          e.preventDefault();
        } else if (state.screen === 'pause') {
          resumeGame();
          e.preventDefault();
        } else if (state.screen === 'intro') {
          continueIntro();
          e.preventDefault();
        } else if (state.screen === 'lobby') {
          cleanupAndExit();
          showOnlineMenu();
          e.preventDefault();
        }
      } else if (e.key === 'Enter' && state.screen === 'intro') {
        continueIntro();
        e.preventDefault();
      }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && game && game.running && !game.paused && state.screen === 'game') {
        showPause();
      }
    });
  }

  function bindOnlineCallbacks() {
    CF.online.onRoom = function (room) {
      if (state.screen === 'lobby') updateLobbyDom();
    };
    CF.online.onGameStart = function (payload) {
      if (state.onlineMode && state.screen !== 'lobby') return;
      state.onlineCtx = payload;
      state.victoryReported = false;
      beginOnlineLevel(payload.levelIndex || 0, payload);
    };
    CF.online.onLevel = function (index) {
      if (!state.onlineMode || CF.online.isHost) return;
      if (state.victoryShown) return;
      if (!game || !game.running) return;
      beginOnlineLevel(index, state.onlineCtx);
    };
    CF.online.onVictory = function () {
      if (!state.onlineMode || CF.online.isHost) return;
      if (state.victoryShown) return;
      showVictory(true);
    };
    CF.online.onClosed = function (reason) {
      if (!CF.online.room && !state.onlineMode) return;
      state.onlineMode = false;
      stopGame();
      setCover();
      toast(t(reason === 'closed' ? 'online.room.closed' : 'online.lobby.hostLeft'), 'err');
      showOnlineMenu();
    };
    CF.online.onConnection = function () {
      updateConnDom();
    };
    CF.online.onError = function (kind) {
      toast(onlineError(kind), 'err');
    };
    CF.online.onPlayerLeft = function () {
      toast(t('msg.remoteLeft'), 'info');
    };
    CF.online.onPlayerJoined = function () {
      toast(t('msg.remoteJoined'), 'ok');
    };
  }

  function boot() {
    if (booted) return;
    booted = true;
    CF.i18n.setLang(CF.store.settings.lang);
    document.documentElement.lang = CF.store.settings.lang;
    CF.store.applyToDom();
    CF.i18n.applyDom(document);
    CF.audio.init();
    CF.online.init();
    state.region = 'america';
    state.identityName = CF.store.profile().name;
    state.identityChar = CF.store.profile().char || 'p1';
    state.identityRegion = CF.online.region || 'america';
    CF.online.setIdentity({ name: state.identityName, char: state.identityChar, region: state.identityRegion });
    bindGlobal();
    bindOnlineCallbacks();
    resizeCover();
    fitGame();
    showCover();
    requestAnimationFrame(loop);

    var hideBoot = function () {
      var b = document.getElementById('boot');
      if (b) b.classList.add('hide');
    };
    E.load().then(hideBoot).catch(hideBoot);
    setTimeout(hideBoot, 9000);
  }

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();

  CF.app = {
    state: state,
    toast: toast,
    showCover: showCover,
    showPlay: showPlay,
    showSettings: showSettings,
    showCredits: showCredits,
    cleanup: cleanupAndExit
  };
})();
