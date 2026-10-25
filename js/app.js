/* FRECUENCIA ROTA · controlador de la aplicación */
(function () {
  'use strict';

  var CF = window.CF;
  var R = CF.Rules;

  var A = {
    me: { id: CF.pid(), name: '', charId: 'vigia' },
    state: null,
    pub: null,
    priv: { hand: [], words: [] },
    isHost: false,
    mode: 'home',
    code: null,
    offset: 0,
    lastStateAt: 0,
    lastVault: null,
    sel: {},
    lastPhase: null,
    lastRound: 0,
    lastErrorAt: 0,
    seen: {},
    loops: { tick: null, beat: null, watch: null, clock: null },
    lastSecond: -1,
    joinTimer: null,
    myCard: null,
    myCardRound: 0
  };

  var UI = null;

  /* ---------- arranque ---------- */
  function boot() {
    UI = CF.UI;
    var profile = CF.loadProfile();
    if (profile) {
      A.me.name = profile.name || '';
      A.me.charId = profile.charId || 'vigia';
    }
    UI.init(handlers);
    UI.setHomeProfile({ name: A.me.name, charId: A.me.charId });
    UI.updateSound();
    UI.setNet('idle');

    var m = /^#\/([A-Za-z]{4})$/.exec(window.location.hash || '');
    if (m) {
      var codeInput = document.getElementById('in-code');
      codeInput.value = m[1].toUpperCase();
      UI.homeMsg('Pulsa Entrar para unirte a la mesa ' + m[1].toUpperCase() + '.');
    }
    UI.show('home');
    window.CF.app = A;
  }

  var handlers = {
    create: function (name, charId) {
      createRoom(name, charId);
    },
    join: function (codeRaw, name, charId) {
      joinRoom(codeRaw, name, charId);
    },
    char: function (charId) {
      A.me.charId = charId;
      saveProfile();
      if (A.isHost && A.state && A.state.phase === 'lobby') {
        R.addPlayer(A.state, A.me);
        refreshHost(true);
      } else if (A.code && !A.isHost) {
        CF.Net.sendHello(A.me);
      }
    },
    start: function () {
      doAction({ type: 'start' });
    },
    leave: leaveTable,
    menu: function () {
      var ok = window.confirm('¿Salir de la mesa? La partida seguirá sin ti.');
      if (ok) leaveTable();
    },
    pickCard: function (id) {
      var notAllowed = !canPickCard(id);
      if (notAllowed) return;
      A.sel.card = A.sel.card === id ? null : id;
      refreshUI();
    },
    pickWord: function (w) {
      if (!canPickWord()) return;
      A.sel.word = A.sel.word === w ? null : w;
      refreshUI();
    },
    vote: function (cardId) {
      doAction({ type: 'vote', cardId: cardId });
    },
    action: function (type) {
      if (type === 'narrate') {
        if (!A.sel.card || !A.sel.word) return;
        doAction({ type: 'narrate', cardId: A.sel.card, word: A.sel.word });
        A.sel.card = null;
        A.sel.word = null;
      } else if (type === 'submit') {
        if (!A.sel.card) return;
        var id = A.sel.card;
        A.sel.card = null;
        A.myCard = id;
        A.myCardRound = A.pub ? A.pub.round : 0;
        doAction({ type: 'submit', cardId: id });
      }
    },
    pickTradeWord: function (w) {
      A.sel.offerWord = A.sel.offerWord === w ? null : w;
      refreshUI();
    },
    pickTarget: function (pid) {
      A.sel.target = A.sel.target === pid ? null : pid;
      refreshUI();
    },
    pickTake: function (w) {
      A.sel.take = A.sel.take === w ? null : w;
      refreshUI();
    },
    tradeSend: function () {
      if (!A.sel.offerWord || !A.sel.target) return;
      doAction({ type: 'tradeOffer', to: A.sel.target, give: A.sel.offerWord });
      A.sel.offerWord = null;
      A.sel.target = null;
    },
    tradeAccept: function () {
      if (!A.sel.take) return;
      var take = A.sel.take;
      A.sel.take = null;
      doAction({ type: 'tradeAccept', take: take });
    },
    tradeDecline: function () {
      doAction({ type: 'tradeDecline' });
    },
    tradeReady: function () {
      doAction({ type: 'tradeReady' });
    },
    again: function () {
      doAction({ type: 'again' });
    }
  };

  function canPickCard(id) {
    if (!A.pub || !A.priv) return false;
    var p = A.pub;
    var mine = myPlayer();
    var isNarr = p.narrator === A.me.id;
    if (p.phase === 'clue' && isNarr) return (A.priv.hand || []).indexOf(id) >= 0;
    if (p.phase === 'submit' && !isNarr && mine && !mine.submitted) return (A.priv.hand || []).indexOf(id) >= 0;
    return false;
  }

  function canPickWord() {
    if (!A.pub) return false;
    return A.pub.phase === 'clue' && A.pub.narrator === A.me.id;
  }

  function myPlayer() {
    if (!A.pub) return null;
    return (A.pub.players || []).filter(function (p) { return p.id === A.me.id; })[0] || null;
  }

  /* ---------- perfil ---------- */
  function saveProfile() {
    CF.saveProfile({ name: A.me.name, charId: A.me.charId });
  }

  function setIdentity(name, charId) {
    A.me.name = String(name || '').trim().slice(0, 14) || 'JUGADOR';
    A.me.charId = charId || A.me.charId || 'vigia';
    saveProfile();
  }

  /* ---------- crear / unirse ---------- */
  function createRoom(name, charId) {
    setIdentity(name, charId);
    var code = CF.code();
    A.code = code;
    A.mode = 'host';
    A.isHost = true;
    A.state = R.create(code, A.me.id);
    A.state.rev = 1;
    R.addPlayer(A.state, { id: A.me.id, name: A.me.name, charId: A.me.charId });
    A.seen[A.me.id] = Date.now();
    A.priv = R.privateFor(A.state, A.me.id);
    A.sel = {};
    A.pub = R.publicState(A.state);
    A.pub.serverNow = Date.now();
    A.offset = 0;
    setHash(code);
    UI.setJoinBusy(true);

    setupNet();
    CF.Net.joinRoom(code, A.me, true);

    startHostLoops();
    refreshUI();
    UI.setJoinBusy(false);
    UI.setNet(CF.Net.status());
  }

  function joinRoom(codeRaw, name, charId) {
    var code = String(codeRaw || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    if (code.length !== 4) {
      UI.homeMsg('El código tiene que tener 4 letras.', 'warn');
      return;
    }
    setIdentity(name, charId);
    A.code = code;
    A.mode = 'join';
    A.isHost = false;
    A.state = null;
    A.priv = { hand: [], words: [] };
    A.lastVault = null;
    A.sel = {};
    A.pub = {
      v: 2, code: code, hostId: null, phase: 'lobby', round: 0, rounds: CF.ROUNDS, cells: CF.CELLS,
      players: [{
        id: A.me.id, name: A.me.name, charId: A.me.charId, seat: 0, connected: true, ready: false,
        points: 0, cell: 0, prevCell: 0, lastGain: 0, handCount: 0, wordCount: 0,
        submitted: false, voted: false
      }],
      table: [], trades: [], tradeDone: [], winners: [], log: []
    };
    setHash(code);
    UI.setJoinBusy(true);
    UI.homeMsg('Conectando con la mesa ' + code + '…');

    setupNet();
    CF.Net.joinRoom(code, A.me, false);

    if (A.joinTimer) clearTimeout(A.joinTimer);
    A.joinTimer = setTimeout(function () {
      if (!A.pub || !A.pub.hostId) {
        UI.setJoinBusy(false);
        UI.homeMsg('No encuentro la mesa ' + code + '. Comprueba el código y que el anfitrión siga dentro.', 'warn');
      }
    }, 9000);

    refreshUI();
    UI.setNet(CF.Net.status());
  }

  function setHash(code) {
    try { history.replaceState(null, '', '#/' + code); } catch (e) {}
  }
  function clearHash() {
    try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
  }

  /* ---------- red ---------- */
  function setupNet() {
    CF.Net.init({
      status: function (st) {
        UI.setNet(st);
        if (st === 'online') {
          if (A.isHost && A.state) {
            refreshHost(true);
            startHostLoops();
          } else if (A.code) {
            CF.Net.sendHello(A.me);
          }
        }
      },
      connect: function () {
        if (A.isHost && A.state) {
          refreshHost(true);
          startHostLoops();
        } else if (A.code) {
          CF.Net.sendHello(A.me);
        }
      },
      state: function (pub) {
        A.lastStateAt = Date.now();
        if (typeof pub.serverNow === 'number') A.offset = pub.serverNow - Date.now();
        if (A.isHost) return;
        if (pub.hostId === A.me.id) {
          adoptHost(A.lastVault);
          return;
        }
        A.pub = pub;
        if (A.joinTimer) { clearTimeout(A.joinTimer); A.joinTimer = null; }
        UI.setJoinBusy(false);
        UI.homeMsg('');
        prepareSelection();
        refreshUI();
      },
      vault: function (full) {
        A.lastVault = full;
      },
      private: function (msg, pid) {
        if (pid !== A.me.id || !msg) return;
        if (msg.error && msg.errorAt && msg.errorAt > A.lastErrorAt) {
          A.lastErrorAt = msg.errorAt;
          UI.toast(msg.error, 'warn');
        }
        if (msg.hand || msg.words) {
          A.priv = { hand: msg.hand || [], words: msg.words || [] };
          prepareSelection();
          refreshUI();
        }
      },
      hello: function (msg) {
        if (!A.isHost || !A.state) return;
        if (!msg || !msg.pid || msg.pid === A.me.id) return;
        var before = R.get(A.state, msg.pid);
        var wasConnected = !!(before && before.connected);
        var r = R.addPlayer(A.state, { id: msg.pid, name: msg.name, charId: msg.charId });
        if (!r.ok) {
          CF.Net.sendError(msg.pid, r.error);
          return;
        }
        A.seen[msg.pid] = Date.now();
        if (!r.rejoined) UI.toast(r.player.name + ' se sienta en la mesa.', 'ok');
        else if (!wasConnected) UI.toast(r.player.name + ' vuelve a la mesa.', 'ok');
        refreshHost(true);
      },
      presence: function (msg) {
        if (!A.isHost || !A.state || !msg || !msg.pid) return;
        if (msg.pid === A.me.id) return;
        A.seen[msg.pid] = Date.now();
        var p = R.get(A.state, msg.pid);
        if (p && !p.connected) {
          R.setConnected(A.state, msg.pid, true);
          refreshHost(true);
        }
      },
      action: function (msg, pid) {
        if (!A.isHost || !A.state) return;
        applyHost(pid, msg);
      },
      bye: function (msg) {
        if (!A.isHost || !A.state || !msg || !msg.pid) return;
        if (A.state.phase === 'lobby') R.removePlayer(A.state, msg.pid);
        else R.setConnected(A.state, msg.pid, false);
        delete A.seen[msg.pid];
        refreshHost(true);
      },
      error: function (msg) {
        if (msg && msg.error) UI.toast(msg.error, 'warn');
      }
    });
  }

  /* ---------- host ---------- */
  function startHostLoops() {
    if (A.loops.tick) return;
    A.loops.tick = setInterval(hostTick, 250);
    A.loops.beat = setInterval(hostBeat, 2400);
    A.loops.prune = setInterval(hostPrune, 3000);
  }

  function stopHostLoops() {
    ['tick', 'beat', 'prune'].forEach(function (k) {
      if (A.loops[k]) { clearInterval(A.loops[k]); A.loops[k] = null; }
    });
  }

  function hostTick() {
    if (!A.isHost || !A.state) return;
    if (A.state.phase === 'lobby' || A.state.phase === 'results') return;
    if (R.tick(A.state)) {
      refreshHost(true);
    }
  }

  function hostBeat() {
    if (!A.isHost || !A.state || !A.pub) return;
    if (CF.Net.status() !== 'online') return;
    A.pub = R.publicState(A.state);
    A.pub.serverNow = Date.now();
    CF.Net.publishState(A.pub, null);
  }

  function hostPrune() {
    if (!A.isHost || !A.state) return;
    var now = Date.now();
    var changed = false;
    A.state.players.forEach(function (p) {
      if (p.id === A.me.id) return;
      var seen = A.seen[p.id] || 0;
      if (p.connected && now - seen > CF.broker.dropAfter) {
        R.setConnected(A.state, p.id, false);
        changed = true;
      }
    });
    if (changed) refreshHost(true);
  }

  function refreshHost(withVault) {
    if (!A.isHost || !A.state) return;
    A.state.rev = (A.state.rev || 0) + 1;
    A.pub = R.publicState(A.state);
    A.pub.serverNow = Date.now();
    A.lastStateAt = Date.now();
    A.priv = R.privateFor(A.state, A.me.id) || A.priv;
    CF.Net.publishState(A.pub, withVault ? R.fullState(A.state) : null);
    pushPrivates();
    prepareSelection();
    refreshUI();
  }

  function pushPrivates() {
    if (!A.isHost || !A.state) return;
    A.state.players.forEach(function (p) {
      if (p.id === A.me.id) return;
      if (p.connected) {
        var data = R.privateFor(A.state, p.id);
        if (data) CF.Net.publishPrivate(p.id, data);
      }
    });
  }

  function applyHost(pid, action) {
    if (!A.state) return;
    var r = R.apply(A.state, pid, action);
    if (!r.ok) {
      if (pid === A.me.id) UI.toast(r.error, 'warn');
      else CF.Net.sendError(pid, r.error);
      if (action.type === 'again' || action.type === 'start') refreshHost(false);
      return;
    }
    refreshHost(true);
  }

  function doAction(action) {
    CF.Sfx.unlock();
    if (A.isHost) {
      applyHost(A.me.id, action);
    } else {
      CF.Net.sendAction(action);
    }
  }

  /* ---------- relevo de anfitrión ---------- */
  function watchHost() {
    if (A.isHost || !A.pub || !A.code) return;
    if (!A.lastStateAt || Date.now() - A.lastStateAt < CF.broker.hostSilenceLimit) return;
    if (!A.lastVault) return;
    var list = (A.pub.players || []).filter(function (p) {
      return p.connected && p.id !== A.pub.hostId;
    }).sort(function (a, b) { return a.seat - b.seat; });
    if (!list.length || list[0].id !== A.me.id) return;
    if (A.claiming) return;
    A.claiming = true;
    adoptHost(A.lastVault);
    A.claiming = false;
  }

  function adoptHost(full) {
    if (!full) return;
    stopHostLoops();
    var oldHost = full.hostId;
    A.isHost = true;
    A.state = JSON.parse(JSON.stringify(full));
    A.state.hostId = A.me.id;
    A.state.rev = (A.state.rev || 0) + 1;
    var now = Date.now();
    A.state.players.forEach(function (p) { A.seen[p.id] = now; });
    A.state.players.forEach(function (p) {
      if (p.id === oldHost && p.id !== A.me.id) p.connected = false;
    });
    A.seen[A.me.id] = now;
    if (A.state.phase === 'clue' && A.state.narrator && !R.get(A.state, A.state.narrator).connected) {
      R.narratorLeft(A.state);
    }
    CF.Net.claimHost();
    startHostLoops();
    refreshHost(true);
    UI.toast('Has tomado el relevo de la mesa.', 'ok');
  }

  /* ---------- selección / render ---------- */
  function prepareSelection() {
    if (!A.pub) return;
    if (A.lastPhase !== A.pub.phase || A.lastRound !== A.pub.round) {
      A.sel = {};
    }
    A.lastPhase = A.pub.phase;
    A.lastRound = A.pub.round;
    var mine = myPlayer();
    var isNarr = A.pub.narrator === A.me.id;
    var hand = (A.priv && A.priv.hand) || [];
    var words = (A.priv && A.priv.words) || [];
    var canCard = (A.pub.phase === 'clue' && isNarr) ||
      (A.pub.phase === 'submit' && !isNarr && mine && !mine.submitted);
    if (A.sel.card && (!canCard || hand.indexOf(A.sel.card) < 0)) A.sel.card = null;
    if (A.sel.word && (!(A.pub.phase === 'clue' && isNarr) || words.indexOf(A.sel.word) < 0)) A.sel.word = null;
    if (A.sel.offerWord && words.indexOf(A.sel.offerWord) < 0) A.sel.offerWord = null;
    if (A.sel.take && words.indexOf(A.sel.take) < 0) A.sel.take = null;
    if (A.sel.target) {
      var target = (A.pub.players || []).filter(function (p) { return p.id === A.sel.target && p.connected; })[0];
      if (!target) A.sel.target = null;
    }
  }

  function refreshUI() {
    if (!A.pub) return;
    if (A.pub.phase === 'lobby') {
      UI.show('lobby');
      UI.renderLobby(A.pub, A.me, A.isHost);
    } else if (A.pub.phase === 'results') {
      UI.show('results');
      UI.renderResults(A.pub, A.me);
    } else {
      UI.show('table');
      var ownCard = A.myCardRound === A.pub.round ? A.myCard : null;
      UI.renderTable(A.pub, A.priv, A.me, { sel: A.sel, isHost: A.isHost, ownCard: ownCard });
    }
    updateClock();
  }

  function updateClock() {
    if (!A.pub) return;
    var total = durationFor(A.pub.phase);
    var remaining = 0;
    if (A.pub.deadline) {
      remaining = (A.pub.deadline - (Date.now() + A.offset)) / 1000;
    }
    UI.setTimer(remaining, total, A.pub.phase);
    var secs = Math.max(0, Math.ceil(remaining));
    if (secs !== A.lastSecond) {
      A.lastSecond = secs;
      if (secs <= 10 && secs > 0 && total > 0 && A.pub.phase !== 'score') {
        CF.Sfx.tick(secs <= 3);
      }
    }
  }

  function durationFor(phase) {
    var t = CF.timers();
    return t[phase] || 0;
  }

  function clockLoop() {
    if (!A.loops.clock) {
      A.loops.clock = setInterval(updateClock, 120);
    }
    if (!A.loops.watch) {
      A.loops.watch = setInterval(watchHost, 1200);
    }
  }

  /* ---------- salir ---------- */
  function leaveTable() {
    var wasHost = A.isHost;
    if (wasHost && A.state) {
      var list = A.state.players.filter(function (p) { return p.connected && p.id !== A.me.id; })
        .sort(function (a, b) { return a.seat - b.seat; });
      if (list.length) {
        A.state.hostId = list[0].id;
        A.state.rev++;
        R.removePlayer(A.state, A.me.id);
        var pub = R.publicState(A.state);
        pub.serverNow = Date.now();
        CF.Net.publishState(pub, R.fullState(A.state));
        A.state.players.forEach(function (p) {
          if (p.id === A.me.id) return;
          var data = R.privateFor(A.state, p.id);
          if (data) CF.Net.publishPrivate(p.id, data);
        });
      } else {
        R.removePlayer(A.state, A.me.id);
      }
    } else if (A.code) {
      CF.Net.sendAction({ type: 'leave' });
    }
    CF.Net.leaveRoom();
    stopHostLoops();
    if (A.joinTimer) { clearTimeout(A.joinTimer); A.joinTimer = null; }
    A.isHost = false;
    A.state = null;
    A.pub = null;
    A.code = null;
    A.priv = { hand: [], words: [] };
    A.lastVault = null;
    A.lastStateAt = 0;
    A.sel = {};
    A.lastPhase = null;
    A.lastRound = 0;
    A.seen = {};
    UI.resetCaches();
    UI.setJoinBusy(false);
    UI.homeMsg('');
    clearHash();
    UI.show('home');
  }

  /* ---------- utilidades de test / depuración ---------- */
  A.force = function (what) {
    if (!A.isHost || !A.state) return false;
    var r = R.force(A.state, what);
    if (r) refreshHost(true);
    return r;
  };
  A.snapshot = function () {
    return { pub: A.pub, priv: A.priv, isHost: A.isHost, code: A.code, me: A.me };
  };
  A.myId = function () { return A.me.id; };
  A.cardOf = function (ownerId) {
    if (!A.state) return null;
    var t = A.state.table.filter(function (x) { return x.owner === ownerId; })[0];
    return t ? t.id : null;
  };
  A.wordsOf = function (pid) {
    if (!A.state) return null;
    var p = R.get(A.state, pid);
    return p ? p.words.slice() : null;
  };
  A.ownCard = function () {
    return A.myCardRound && A.pub && A.pub.round === A.myCardRound ? A.myCard : null;
  };

  document.addEventListener('DOMContentLoaded', function () {
    boot();
    clockLoop();
  });

  window.addEventListener('beforeunload', function () {
    if (A.code) {
      try { CF.Net.sendAction({ type: 'leave' }); } catch (e) {}
    }
  });
})();
