/* FRECUENCIA ROTA · interfaz de la mesa */
(function () {
  'use strict';

  var CF = window.CF = window.CF || {};
  var esc = CF.esc;

  var h = {};
  var el = {};
  var cache = { chars: '', seats: '', hand: '', words: '', reveal: '', actions: '', trade: '', log: '', result: '' };
  var tokens = {};
  var tokenCells = {};
  var walkTimers = {};
  var jumpTimers = {};
  var lastPhase = null;
  var lastRound = 0;
  var lastScoreRound = 0;
  var lastVoteKey = '';
  var screen = 'home';

  function $(id) { return document.getElementById(id); }

  function init(handlers) {
    h = handlers || {};
    el = {
      home: $('screen-home'),
      lobby: $('screen-lobby'),
      table: $('screen-table'),
      results: $('screen-results'),
      toasts: $('toasts')
    };
    bind();
    buildRail();
  }

  function bind() {
    $('btn-create').onclick = function () {
      CF.Sfx.unlock();
      h.create && h.create(readName(), readChar());
    };
    $('btn-join').onclick = function () {
      CF.Sfx.unlock();
      h.join && h.join($('in-code').value, readName(), readChar());
    };
    $('in-code').addEventListener('input', function () {
      this.value = this.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    });
    $('in-code').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('btn-join').click();
    });
    $('in-name').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('btn-create').focus();
    });
    $('char-picker').addEventListener('click', function (e) {
      var b = e.target.closest('[data-char]');
      if (!b) return;
      CF.Sfx.click();
      renderChars(b.getAttribute('data-char'));
      h.char && h.char(b.getAttribute('data-char'));
    });
    $('btn-rules').onclick = function () { openRules(); };
    $('btn-sound').onclick = function () {
      CF.Sfx.setEnabled(!CF.Sfx.enabled());
      updateSound();
      CF.Sfx.click();
    };
    $('btn-copy').onclick = function () {
      var code = $('lobby-code').textContent || '';
      copyText(code);
    };
    $('btn-lobby-back').onclick = function () { h.leave && h.leave(); };
    $('btn-start').onclick = function () { CF.Sfx.unlock(); h.start && h.start(); };
    $('btn-table-menu').onclick = function () { h.menu && h.menu(); };
    $('btn-again').onclick = function () { h.again && h.again(); };
    $('btn-results-exit').onclick = function () { h.leave && h.leave(); };
    $('modal-close').onclick = closeModal;
    $('modal').addEventListener('click', function (e) {
      if (e.target === $('modal')) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });

    $('hand').addEventListener('click', function (e) {
      var b = e.target.closest('[data-card]');
      if (!b) return;
      if (b.disabled) return;
      CF.Sfx.click();
      h.pickCard && h.pickCard(b.getAttribute('data-card'));
    });
    $('words').addEventListener('click', function (e) {
      var b = e.target.closest('[data-word]');
      if (!b || b.disabled) return;
      CF.Sfx.click();
      h.pickWord && h.pickWord(b.getAttribute('data-word'));
    });
    $('actions').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      h.action && h.action(b.getAttribute('data-act'));
    });
    $('reveal').addEventListener('click', function (e) {
      var b = e.target.closest('[data-card]');
      if (!b) return;
      if (b.getAttribute('data-votable') !== '1') return;
      CF.Sfx.vote();
      h.vote && h.vote(b.getAttribute('data-card'));
    });
    $('trade-panel').addEventListener('click', function (e) {
      var b = e.target.closest('[data-trade-act]');
      var w = e.target.closest('[data-offer-word]');
      var t = e.target.closest('[data-target]');
      var k = e.target.closest('[data-take]');
      if (w) { h.pickTradeWord && h.pickTradeWord(w.getAttribute('data-offer-word')); return; }
      if (t) { h.pickTarget && h.pickTarget(t.getAttribute('data-target')); return; }
      if (k) { h.pickTake && h.pickTake(k.getAttribute('data-take')); return; }
      if (!b) return;
      var act = b.getAttribute('data-trade-act');
      if (act === 'send') h.tradeSend && h.tradeSend();
      if (act === 'accept') h.tradeAccept && h.tradeAccept();
      if (act === 'decline') h.tradeDecline && h.tradeDecline();
      if (act === 'ready') h.tradeReady && h.tradeReady();
    });
  }

  function readName() {
    return ($('in-name').value || '').trim().slice(0, 14);
  }
  function readChar() {
    var active = document.querySelector('#char-picker .char-option.active');
    return active ? active.getAttribute('data-char') : 'vigia';
  }

  function renderChars(selected) {
    var html = CF.characters.map(function (c) {
      var short = c.name.replace('ECO · ', '');
      return '<button class="char-option' + (c.id === selected ? ' active' : '') + '" data-char="' + c.id +
        '" style="--accent:' + c.accent + '" title="' + esc(c.name + ' · ' + c.role) + '">' +
        '<span class="char-pic"><img src="' + CF.sprite(c.id) + '" alt="" style="filter:hue-rotate(' + c.hue + 'deg)"></span>' +
        '<span class="char-name">' + esc(short) + '</span>' +
        '</button>';
    }).join('');
    $('char-picker').innerHTML = html;
    var sel = CF.character(selected || 'vigia');
    $('char-hint').textContent = sel.role;
  }

  function setHomeProfile(profile) {
    if (!profile) return;
    if (profile.name) $('in-name').value = profile.name;
    renderChars(profile.charId || 'vigia');
  }

  function updateSound() {
    $('btn-sound').textContent = 'Sonido: ' + (CF.Sfx.enabled() ? 'sí' : 'no');
  }

  function show(name) {
    screen = name;
    ['home', 'lobby', 'table', 'results'].forEach(function (k) {
      var node = el[k];
      if (!node) return;
      node.classList.toggle('hidden', k !== name);
    });
    if (name !== 'table') {
      Object.keys(tokens).forEach(function (p) { tokens[p].style.opacity = '0'; });
    }
  }

  function setNet(status) {
    var node = $('net-status');
    var map = {
      idle: 'sin conexión',
      connecting: 'conectando…',
      online: 'en línea',
      offline: 'reconectando…',
      error: 'sin conexión'
    };
    node.textContent = map[status] || status;
    node.className = 'net-dot net-' + status;
    var l = $('lobby-status');
    if (l) {
      l.textContent = map[status] || status;
      l.className = 'net-dot net-' + status;
    }
  }

  function homeMsg(text, kind) {
    var n = $('home-msg');
    n.textContent = text || '';
    n.className = 'home-msg' + (kind ? ' ' + kind : '');
  }

  function setJoinBusy(busy) {
    $('btn-create').disabled = !!busy;
    $('btn-join').disabled = !!busy;
  }

  var dots = '';
  for (var di = 0; di < 3; di++) dots += '<i></i>';

  /* ---------------- vestíbulo ---------------- */
  function renderLobby(pub, me, isHost) {
    $('lobby-code').textContent = pub.code;
    var players = pub.players || [];
    var n = players.filter(function (p) { return p.connected; }).length;
    var html = players.map(function (p) {
      var c = CF.character(p.charId);
      var tags = '';
      if (p.id === pub.hostId) tags += '<em class="tag host">ANFITRIÓN</em>';
      if (p.id === me.id) tags += '<em class="tag you">TÚ</em>';
      if (!p.connected) tags += '<em class="tag off">SIN CONEXIÓN</em>';
      return '<div class="lobby-player' + (p.connected ? '' : ' off') + '" style="--accent:' + c.accent + '">' +
        '<span class="lp-pic"><img src="' + CF.sprite(p.charId) + '" alt="" style="filter:hue-rotate(' + c.hue + 'deg)"></span>' +
        '<span class="lp-info"><b>' + esc(p.name) + '</b><i>' + esc(c.name) + '</i></span>' +
        '<span class="lp-tags">' + tags + '</span></div>';
    }).join('');
    for (var i = players.length; i < CF.MIN_PLAYERS; i++) {
      html += '<div class="lobby-player ghost"><span class="lp-pic">?</span><span class="lp-info"><b>asiento libre</b><i>invita a alguien</i></span></div>';
    }
    $('lobby-players').innerHTML = html;
    $('lobby-caption').textContent = n + ' / ' + CF.MAX_PLAYERS + ' en la mesa · mínimo ' + CF.MIN_PLAYERS;
    var can = isHost && n >= CF.MIN_PLAYERS;
    $('btn-start').disabled = !can;
    $('btn-start').classList.toggle('hidden', !isHost);
    $('btn-start').textContent = n < CF.MIN_PLAYERS ? 'Faltan jugadores (' + n + '/' + CF.MIN_PLAYERS + ')' : 'Empezar la partida';
    $('lobby-wait').classList.toggle('hidden', isHost);
    $('lobby-wait').textContent = isHost
      ? 'Comparte el código. La partida empezará cuando pulses el botón.'
      : 'Esperando a que el anfitrión empiece…';
  }

  function copyText(text) {
    var done = function () { toast('Código copiado: ' + text, 'ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch (e) {
      toast('Copia el código a mano: ' + text, 'warn');
    }
  }

  /* ---------------- mesa ---------------- */
  function buildRail() {
    var n = CF.CELLS + 1;
    var html = '';
    for (var i = 0; i < n; i++) {
      var pos = cellPos(i);
      var cls = 'cell';
      if (i === 0) cls += ' start';
      if (i === CF.CELLS) cls += ' finish';
      if (i > 0 && i % 5 === 0) cls += ' milestone';
      var label = i === 0 ? 'SALIDA' : String(i);
      html += '<div class="' + cls + '" data-cell="' + i + '" style="left:' + pos.x.toFixed(3) + '%;top:' + pos.y.toFixed(3) + '%">' +
        '<span>' + label + '</span></div>';
    }
    $('rail').innerHTML = html;
  }

  function cellPos(cell) {
    var n = CF.CELLS + 1;
    var a = Math.PI / 2 + (cell / n) * Math.PI * 2;
    return { x: 52.5 + 39.8 * Math.cos(a), y: 51 + 37.8 * Math.sin(a) };
  }

  function nameOf(pub, pid) {
    var p = (pub.players || []).filter(function (q) { return q.id === pid; })[0];
    return p ? p.name : '?';
  }
  function seatOf(pub, pid) {
    var p = (pub.players || []).filter(function (q) { return q.id === pid; })[0];
    return p ? p.seat : 0;
  }
  function mePlayer(pub, me) {
    return (pub.players || []).filter(function (p) { return p.id === me.id; })[0] || null;
  }

  function renderTable(pub, priv, me, ctx) {
    var mine = mePlayer(pub, me);
    var isNarr = pub.narrator === me.id;
    var canClue = pub.phase === 'clue' && isNarr;
    var canSubmit = pub.phase === 'submit' && !isNarr && mine && !mine.submitted;
    var canVote = pub.phase === 'vote' && !isNarr && mine && !mine.voted;
    var canTrade = pub.phase === 'trade';

    $('round-label').innerHTML = Math.max(1, pub.round) + '<span>/' + pub.rounds + '</span>';
    $('phase-label').textContent = CF.phaseLabels[pub.phase] || '';

    renderSeats(pub, me, ctx);
    renderReveal(pub, me, ctx, canVote);
    renderHand(pub, priv, ctx, canClue || canSubmit);
    renderWords(pub, priv, ctx, canClue);
    renderActions(pub, priv, me, ctx, canClue, canSubmit, canVote, canTrade);
    renderClue(pub, ctx, canClue);
    renderHint(pub, me, canClue, canSubmit, canVote, canTrade);
    renderResult(pub);
    renderLog(pub);
    renderTrade(pub, priv, me, ctx, canTrade);
    renderTokens(pub);

    var voteKey = pub.phase + '|' + (pub.table || []).length + '|' + pub.round;
    if (pub.phase === 'vote' && lastVoteKey !== voteKey) {
      CF.Sfx.flip();
    }
    lastVoteKey = voteKey;

    if (pub.phase === 'score' && lastPhase !== 'score') {
      CF.Sfx.correct();
    }
    if (pub.phase === 'results' && lastPhase !== 'results') {
      CF.Sfx.win();
    }

    lastPhase = pub.phase;
    lastRound = pub.round;
  }

  function renderSeats(pub, me, ctx) {
    var list = pub.players || [];
    var key = list.map(function (p) {
      return p.id + ':' + p.cell + ':' + p.points + ':' + p.connected + ':' + p.voted + ':' + p.submitted;
    }).join('|') + '|' + pub.narrator + '|' + pub.phase + '|' + (pub.trades || []).length;
    if (key === cache.seats) return;
    cache.seats = key;
    $('seats').innerHTML = list.map(function (p) {
      var c = CF.character(p.charId);
      var narr = pub.narrator === p.id;
      var cls = 'seat' + (p.id === me.id ? ' me' : '') + (narr ? ' narr' : '') + (p.connected ? '' : ' off');
      var badge = '';
      if (narr) badge += '<span class="crown" title="Narrador">♛</span>';
      if (p.id === pub.hostId) badge += '<span class="host-pip" title="Anfitrión">◆</span>';
      var gem = p.voted ? '<i class="gem mini" style="--g:' + CF.seatColor(p.seat) + '"></i>' : '';
      return '<div class="' + cls + '" style="--seat:' + CF.seatColor(p.seat) + ';--accent:' + c.accent + '">' +
        '<span class="seat-pic"><img src="' + CF.sprite(p.charId) + '" alt="" style="filter:hue-rotate(' + c.hue + 'deg)"></span>' +
        '<span class="seat-txt">' +
        '<b>' + esc(p.name) + '</b>' +
        '<i>' + esc(c.name) + '</i>' +
        '<em><span class="seat-cell">' + p.cell + '</span>/' + CF.CELLS + ' · ' + p.points + ' pts' + gem + '</em>' +
        '</span>' + badge + '</div>';
    }).join('');
  }

  function stars(n) { return n; }

  function slotBack() {
    return '<div class="slot-card back"><span>FR</span></div>';
  }

  function slotHTML(t, i, pub, canVote, ownCard) {
    var fronts = pub.phase === 'vote' || pub.phase === 'score' || pub.phase === 'trade';
    if (!t) {
      return '<div class="slot empty" data-slot="' + i + '">' + slotBack() + '</div>';
    }
    var c = CF.Deck.card(t.id);
    if (!c) return '<div class="slot empty" data-slot="' + i + '">' + slotBack() + '</div>';
    var reveal = fronts;
    var own = !!ownCard && t.id === ownCard;
    var cls = 'slot' + (reveal ? ' revealed' : '') + (own ? ' own' : '');
    var style = '--delay:' + (i * 90) + 'ms';
    var gems = '';
    if (reveal && (pub.phase === 'score' || pub.phase === 'trade') && pub.votes) {
      Object.keys(pub.votes).forEach(function (v) {
        var owner = pub.votes[v];
        var match = t.ghost ? owner === null : owner === t.owner;
        if (match) {
          gems += '<i class="gem" style="--g:' + CF.seatColor(seatOf(pub, v)) + '" title="' + esc(nameOf(pub, v)) + '"></i>';
        }
      });
    }
    var tag = '';
    if (reveal && pub.phase !== 'vote') {
      if (t.ghost) tag = '<span class="slot-tag ghost">FANTASMA</span>';
      else if (t.owner === pub.narrator) tag = '<span class="slot-tag narr">NARRADOR</span>';
      else tag = '<span class="slot-tag">' + esc(nameOf(pub, t.owner)) + '</span>';
    } else if (own) {
      tag = '<span class="slot-tag own">TU CARTA</span>';
    }
    if (reveal && t.ghost) cls += ' ghost';
    if (reveal && t.owner === pub.narrator && pub.phase !== 'vote') cls += ' is-narr';
    var votable = canVote && reveal && !own ? '1' : '0';
    var content = '<div class="slot-card"><div class="card-3d">' +
      '<div class="card-face">' + c.svg + '</div>' +
      '<div class="card-back"><span>FR</span></div>' +
      '</div></div>' + gems + tag;
    return '<div class="' + cls + '" data-slot="' + i + '" data-card="' + t.id + '" data-votable="' + votable + '" style="' + style + '">' + content + '</div>';
  }

  function renderReveal(pub, me, ctx, canVote) {
    var table = pub.table || [];
    var hidden = pub.phase === 'clue' || pub.phase === 'submit';
    var key = pub.phase + '|' + table.map(function (t) { return t.id; }).join(',') + '|' +
      Object.keys(pub.votes || {}).length + '|' + pub.round + '|' + (canVote ? 1 : 0) + '|' + (ctx.ownCard || '');
    if (key === cache.reveal) return;
    cache.reveal = key;
    var html = '';
    if (hidden || !table.length) {
      for (var i = 0; i < CF.TABLE_CARDS; i++) html += slotHTML(null, i, pub, false, null);
    } else {
      for (var j = 0; j < table.length; j++) html += slotHTML(table[j], j, pub, canVote, ctx.ownCard);
    }
    $('reveal').innerHTML = html;
  }

  function cardFaceHTML(id) {
    var c = CF.Deck.card(id);
    if (!c) return '';
    return c.svg;
  }

  function renderHand(pub, priv, ctx, interactive) {
    var ids = (priv && priv.hand) || [];
    var key = ids.join(',') + '|' + (ctx.sel.card || '') + '|' + (interactive ? 1 : 0) + '|' + pub.phase;
    if (key === cache.hand) return;
    cache.hand = key;
    var n = ids.length;
    var html = ids.map(function (id, i) {
      var mid = (n - 1) / 2;
      var rot = (i - mid) * (n > 1 ? 3.1 : 0);
      var dy = Math.abs(i - mid) * Math.abs(i - mid) * 1.6;
      var sel = ctx.sel.card === id ? ' selected' : '';
      return '<button class="hand-card' + sel + '" data-card="' + id + '"' + (interactive ? '' : ' disabled') +
        ' style="--rot:' + rot.toFixed(2) + 'deg;--dy:' + dy.toFixed(1) + 'px;--i:' + i + '">' +
        '<span class="hand-inner">' + cardFaceHTML(id) + '</span></button>';
    }).join('');
    $('hand').innerHTML = html || '<div class="hand-empty">La mano llegará al empezar la ronda.</div>';
  }

  function renderWords(pub, priv, ctx, canClue) {
    var words = (priv && priv.words) || [];
    var key = words.join(',') + '|' + (ctx.sel.word || '') + '|' + (canClue ? 1 : 0) + '|' + pub.phase;
    if (key === cache.words) return;
    cache.words = key;
    var html = words.map(function (w) {
      var sel = ctx.sel.word === w ? ' sel' : '';
      return '<button class="word-ticket' + sel + '" data-word="' + esc(w) + '"' + (canClue ? '' : ' disabled') + '>' +
        esc(w) + '</button>';
    }).join('');
    $('words').innerHTML = html || '<span class="words-empty">sin palabras</span>';
    $('words-wrap').classList.toggle('selectable', !!canClue);
  }

  function renderClue(pub, ctx, canClue) {
    var word = pub.clue && pub.clue.word ? pub.clue.word : '';
    if (canClue && ctx.sel.word) word = ctx.sel.word;
    $('clue-word').textContent = word || '· · ·';
    $('clue-label').textContent = canClue ? (ctx.sel.word ? 'TU PALABRA' : 'ELIGE UNA PALABRA') : 'PISTA';
    $('clue-box').classList.toggle('waiting', !word);
    $('clue-box').classList.toggle('picking', !!canClue && !ctx.sel.word);
    $('clue-box').classList.toggle('mine', !!canClue && !!ctx.sel.word);
  }

  function renderHint(pub, me, canClue, canSubmit, canVote, canTrade) {
    var narrName = nameOf(pub, pub.narrator);
    var text = '';
    if (pub.phase === 'clue') {
      text = canClue ? 'Elige una de tus cartas y una sola palabra de tu mano.' : narrName + ' elige una carta y una palabra…';
    } else if (pub.phase === 'submit') {
      text = canSubmit ? 'Elige una carta que encaje con «' + (pub.clue ? pub.clue.word : '') + '».' : 'Esperando las cartas de la mesa…';
    } else if (pub.phase === 'vote') {
      text = canVote ? 'Toca la carta que crees que jugó ' + narrName + '.' : 'La mesa vota en secreto…';
    } else if (pub.phase === 'score') {
      text = 'Cada punto es una casilla. Los personajes avanzan.';
    } else if (pub.phase === 'trade') {
      text = 'Un trueque por persona: ofrece una palabra y recibe otra.';
    }
    $('phase-hint').textContent = text;
    $('phase-hint').classList.toggle('urgent', pub.phase === 'vote' && canVote);
  }

  function renderActions(pub, priv, me, ctx, canClue, canSubmit, canVote, canTrade) {
    var html = '';
    if (pub.phase === 'clue' && canClue) {
      var ready = ctx.sel.card && ctx.sel.word;
      html = '<button class="btn btn-primary" data-act="narrate"' + (ready ? '' : ' disabled') + '>Dar la pista</button>' +
        '<span class="action-note">' + (ready ? '«' + esc(ctx.sel.word) + '»' : 'carta + palabra') + '</span>';
    } else if (pub.phase === 'submit' && canSubmit) {
      html = '<button class="btn btn-primary" data-act="submit"' + (ctx.sel.card ? '' : ' disabled') + '>Enviar carta</button>' +
        '<span class="action-note">' + (ctx.sel.card ? 'carta elegida' : 'elige una carta') + '</span>';
    } else if (pub.phase === 'clue') {
      html = '<span class="waiting">' + esc(nameOf(pub, pub.narrator)) + ' está pensando…</span>';
    } else if (pub.phase === 'submit') {
      var p = mePlayer(pub, me);
      html = '<span class="waiting">' + (p && p.submitted ? 'Carta enviada. ' : '') + 'Esperando a los demás…</span>';
    } else if (pub.phase === 'vote') {
      html = '<span class="waiting">' + (canVote ? 'Toca una carta para votar.' : 'Votación en curso…') + '</span>';
    } else if (pub.phase === 'trade') {
      html = '<span class="waiting">Trueque abierto · 20 s</span>';
    } else if (pub.phase === 'score') {
      html = '<span class="waiting">Recuento…</span>';
    }
    if (html !== cache.actions) {
      cache.actions = html;
      $('actions').innerHTML = html;
    }
  }

  function renderResult(pub) {
    if (!(pub.phase === 'score' || pub.phase === 'trade') || !pub.roundResult) {
      if (cache.result) { cache.result = ''; $('round-result').innerHTML = ''; }
      return;
    }
    var rr = pub.roundResult;
    var key = pub.round + '|' + rr.rows.map(function (r) { return r.pid + r.delta; }).join(',') + '|' + rr.anyCorrect + rr.allCorrect;
    if (key === cache.result) return;
    cache.result = key;
    var chips = rr.rows.map(function (r) {
      var cls = 'result-chip' + (r.correct ? ' good' : '') + (r.pid === pub.narrator ? ' narr' : '') + (r.delta === 0 ? ' zero' : '');
      return '<span class="' + cls + '" style="--seat:' + CF.seatColor(seatOf(pub, r.pid)) + '">' +
        '<b>' + esc(r.name) + '</b>' +
        '<span>+' + r.delta + '</span>' +
        '<i>' + (r.votes ? r.votes + ' voto' + (r.votes > 1 ? 's' : '') : '—') + (r.correct ? ' · acierta' : '') + '</i>' +
        '</span>';
    }).join('');
    var verdict = rr.allCorrect ? 'Todos aciertan: +2 para el resto.' :
      (rr.anyCorrect ? 'Algunos aciertan: narrador +3.' : 'Nadie acierta: +2 para el resto.');
    $('round-result').innerHTML = '<div class="rr-verdict">' + verdict + '</div><div class="rr-chips">' + chips + '</div>';
  }

  function renderLog(pub) {
    var log = pub.log || [];
    var last = log.length ? log[log.length - 1].text : '';
    if (last === cache.log) return;
    cache.log = last;
    $('felt-log').textContent = last;
  }

  /* ---------------- trueque ---------------- */
  function renderTrade(pub, priv, me, ctx, canTrade) {
    var panel = $('trade-panel');
    if (!canTrade) {
      panel.classList.add('hidden');
      cache.trade = '';
      return;
    }
    panel.classList.remove('hidden');
    var words = (priv && priv.words) || [];
    var offers = (pub.trades || []).filter(function (t) { return t.to === me.id || t.from === me.id; });
    var incoming = offers.filter(function (t) { return t.to === me.id; })[0];
    var outgoing = offers.filter(function (t) { return t.from === me.id; })[0];
    var done = (pub.tradeDone || []).indexOf(me.id) >= 0;
    var key = [words.join(','), done, incoming ? incoming.id : '', outgoing ? outgoing.id : '',
      ctx.sel.offerWord || '', ctx.sel.target || '', ctx.sel.take || '', pub.round].join('|');
    if (key === cache.trade) return;
    cache.trade = key;

    var body = '';
    if (done) {
      body = '<div class="trade-done">Trueque cerrado.<br><span>Esperando al resto de la mesa…</span></div>';
    } else if (incoming) {
      var from = nameOf(pub, incoming.from);
      body = '<div class="trade-offer">' +
        '<span class="trade-from">' + esc(from) + ' te ofrece</span>' +
        '<strong class="trade-word">' + esc(incoming.give) + '</strong>' +
        '<span class="trade-from">y quiere una de tus palabras:</span>' +
        '<div class="trade-takes">' + words.map(function (w) {
          return '<button class="word-ticket small' + (ctx.sel.take === w ? ' sel' : '') + '" data-take="' + esc(w) + '">' + esc(w) + '</button>';
        }).join('') + '</div>' +
        '<div class="trade-btns">' +
        '<button class="btn btn-primary" data-trade-act="accept"' + (ctx.sel.take ? '' : ' disabled') + '>Aceptar</button>' +
        '<button class="btn btn-ghost" data-trade-act="decline">Rechazar</button>' +
        '</div></div>';
    } else if (outgoing) {
      body = '<div class="trade-wait">Ofreces <strong>«' + esc(outgoing.give) + '»</strong> a ' +
        esc(nameOf(pub, outgoing.to)) + '. Esperando respuesta…</div>';
    } else {
      var others = (pub.players || []).filter(function (p) { return p.id !== me.id && p.connected; });
      body = '<div class="trade-step"><span>1 · ofrece una palabra</span>' +
        '<div class="trade-words">' + words.map(function (w) {
          return '<button class="word-ticket small' + (ctx.sel.offerWord === w ? ' sel' : '') + '" data-offer-word="' + esc(w) + '">' + esc(w) + '</button>';
        }).join('') + '</div></div>' +
        '<div class="trade-step"><span>2 · elige a quién</span>' +
        '<div class="trade-targets">' + others.map(function (p) {
          return '<button class="target' + (ctx.sel.target === p.id ? ' sel' : '') + '" data-target="' + p.id + '" style="--seat:' + CF.seatColor(p.seat) + '">' +
            esc(p.name) + '</button>';
        }).join('') + '</div></div>' +
        '<button class="btn btn-primary" data-trade-act="send"' + (ctx.sel.offerWord && ctx.sel.target ? '' : ' disabled') + '>Ofrecer palabra</button>';
    }
    body += done ? '' : '<button class="btn btn-ghost trade-ready" data-trade-act="ready">Listo, no cambio más</button>';
    panel.innerHTML = '<div class="trade-head"><h3>TRUEQUE</h3><span class="trade-clock" id="trade-clock">20 s</span></div>' + body;
  }

  /* ---------------- fichas del sendero ---------------- */
  function ensureToken(p) {
    if (tokens[p.id]) return tokens[p.id];
    var c = CF.character(p.charId);
    var node = document.createElement('div');
    node.className = 'token';
    node.style.setProperty('--accent', c.accent);
    node.style.setProperty('--seat', CF.seatColor(p.seat));
    node.innerHTML = '<span class="token-shadow"></span>' +
      '<img src="' + CF.sprite(p.charId) + '" alt="" style="filter:hue-rotate(' + c.hue + 'deg)">' +
      '<span class="token-name">' + esc(p.name) + '</span>';
    $('tokens').appendChild(node);
    tokens[p.id] = node;
    tokenCells[p.id] = -1;
    return node;
  }

  function positionToken(p) {
    var node = tokens[p.id];
    if (!node) return;
    var cell = tokenCells[p.id];
    if (cell < 0) cell = 0;
    var pos = cellPos(cell);
    var mates = Object.keys(tokenCells).filter(function (k) {
      return k !== p.id && tokenCells[k] === cell && tokens[k] && tokens[k].style.opacity !== '0';
    }).sort(function (a, b) {
      var pa = currentPlayers[a], pb = currentPlayers[b];
      return (pa ? pa.seat : 0) - (pb ? pb.seat : 0);
    });
    var total = mates.length + 1;
    var idx = 0;
    for (var m = 0; m < mates.length; m++) {
      var pm = currentPlayers[mates[m]];
      if (pm && pm.seat < p.seat) idx++;
    }
    var dx = 0, dy = 0;
    if (total > 1) {
      dx = (idx - (total - 1) / 2) * 14;
      dy = -Math.abs(idx - (total - 1) / 2) * 4;
    }
    if (cell === 0) dy -= 15;
    node.style.left = pos.x + '%';
    node.style.top = pos.y + '%';
    node.style.transform = 'translate(-50%,-50%) translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
  }

  function positionAll() {
    (Object.keys(tokens)).forEach(function (pid) {
      var p = currentPlayers[pid];
      if (p) positionToken(p);
    });
  }

  var currentPlayers = {};

  function renderTokens(pub) {
    var visible = pub.phase === 'score' || pub.phase === 'trade';
    (pub.players || []).forEach(function (p) {
      currentPlayers[p.id] = p;
      var node = ensureToken(p);
      node.style.opacity = visible ? '1' : '0';
      node.classList.toggle('off', !p.connected);
    });
    if (!visible) {
      Object.keys(walkTimers).forEach(function (k) { clearInterval(walkTimers[k]); delete walkTimers[k]; });
      Object.keys(tokenCells).forEach(function (k) { tokenCells[k] = -1; });
      return;
    }
    if (pub.phase === 'score' && lastScoreRound !== pub.round) {
      lastScoreRound = pub.round;
      (pub.players || []).forEach(function (p, i) {
        tokenCells[p.id] = p.prevCell;
        positionAll();
        var node = tokens[p.id];
        if (node) {
          node.classList.add('jump');
          clearTimeout(jumpTimers[p.id]);
          jumpTimers[p.id] = setTimeout(function () { node.classList.remove('jump'); }, 600);
        }
        var target = p.cell;
        var delay = 420 + i * 110;
        (function (pl, tg, d) {
          setTimeout(function () {
            walk(pl.id, tg);
          }, d);
        })(p, target, delay);
      });
    } else if (pub.phase === 'trade') {
      (pub.players || []).forEach(function (p) {
        if (tokenCells[p.id] == null || tokenCells[p.id] < 0) tokenCells[p.id] = p.cell;
        positionToken(p);
      });
    } else {
      positionAll();
    }
  }

  function walk(pid, target) {
    if (!tokens[pid]) return;
    if (walkTimers[pid]) { clearInterval(walkTimers[pid]); delete walkTimers[pid]; }
    var cur = tokenCells[pid];
    if (cur == null || cur < 0) cur = 0;
    if (cur >= target) {
      tokenCells[pid] = target;
      positionAll();
      return;
    }
    var count = 0;
    walkTimers[pid] = setInterval(function () {
      cur += 1;
      count++;
      tokenCells[pid] = cur;
      positionAll();
      CF.Sfx.step(count);
      if (cur >= target) {
        clearInterval(walkTimers[pid]);
        delete walkTimers[pid];
      }
    }, 240);
  }

  /* ---------------- temporizador ---------------- */
  var TAU = Math.PI * 2 * 27;

  function setTimer(remaining, total, phase) {
    var ring = $('timer-ring');
    var text = $('timer-text');
    if (!ring) return;
    var pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
    ring.style.strokeDasharray = TAU.toFixed(1);
    ring.style.strokeDashoffset = (TAU * (1 - pct)).toFixed(1);
    var secs = Math.max(0, Math.ceil(remaining));
    text.textContent = secs;
    var wrap = $('timer');
    wrap.classList.toggle('urgent', remaining <= 10 && phase !== 'score' && phase !== 'lobby');
    wrap.classList.toggle('idle', !total);
    var tradeClock = $('trade-clock');
    if (tradeClock) tradeClock.textContent = secs + ' s';
  }

  /* ---------------- resultados ---------------- */
  function renderResults(pub, me) {
    var rank = (pub.players || []).slice().sort(function (a, b) {
      if (b.cell !== a.cell) return b.cell - a.cell;
      if (b.points !== a.points) return b.points - a.points;
      return a.seat - b.seat;
    });
    var winners = pub.winners || [];
    var winNames = rank.filter(function (p) { return winners.indexOf(p.id) >= 0; }).map(function (p) { return p.name; });
    var iWin = winners.indexOf(me.id) >= 0;
    $('results-title').textContent = winners.length > 1
      ? 'VICTORIA COMPARTIDA'
      : (iWin ? 'HAS GANADO' : 'GANA ' + (winNames[0] || '—'));
    $('results-sub').textContent = winners.length > 1
      ? winNames.join(' · ') + ' llegan a la misma casilla.'
      : (iWin ? 'Tu personaje ha recorrido el sendero más lejos.' : winNames[0] + ' ha recorrido el sendero más lejos.');
    $('results-list').innerHTML = rank.map(function (p, i) {
      var c = CF.character(p.charId);
      var win = winners.indexOf(p.id) >= 0;
      return '<div class="result-row' + (win ? ' win' : '') + (p.id === me.id ? ' me' : '') + '" style="--accent:' + c.accent + '">' +
        '<span class="rank">' + (i + 1) + '</span>' +
        '<span class="res-pic"><img src="' + CF.sprite(p.charId) + '" alt="" style="filter:hue-rotate(' + c.hue + 'deg)"></span>' +
        '<span class="res-name"><b>' + esc(p.name) + '</b><i>' + esc(c.name) + (p.id === me.id ? ' · tú' : '') + '</i></span>' +
        '<span class="res-cell"><b>' + p.cell + '</b>/' + CF.CELLS + '</span>' +
        '<span class="res-pts">' + p.points + ' pts</span>' +
        (win ? '<span class="res-crown">♛</span>' : '') +
        '</div>';
    }).join('');
    var host = pub.hostId === me.id;
    $('btn-again').classList.toggle('hidden', !host);
    $('btn-again').textContent = 'Otra partida';
  }

  /* ---------------- avisos y modales ---------------- */
  function toast(text, kind) {
    if (!el.toasts) return;
    while (el.toasts.children.length >= 3) {
      el.toasts.removeChild(el.toasts.firstChild);
    }
    var n = document.createElement('div');
    n.className = 'toast' + (kind ? ' ' + kind : '');
    n.textContent = text;
    el.toasts.appendChild(n);
    setTimeout(function () { n.classList.add('out'); }, 2100);
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 2700);
  }

  function openRules() {
    var body = '<h2 class="modal-title">CÓMO SE JUEGA</h2>' +
      '<ol class="rules-list">' +
      '<li><b>3 a 8 personas.</b> Cada una lleva un personaje, 6 cartas ilustradas y 5 palabras.</li>' +
      '<li><b>El narrador rota.</b> Elige una carta y da la pista con <b>una sola palabra</b> de su mano. Nada de texto libre.</li>' +
      '<li><b>Los demás</b> eligen en secreto una carta que encaje con esa palabra.</li>' +
      '<li><b>Se revelan todas</b> (se añaden cartas fantasma hasta 5) y cada jugador vota la que cree del narrador.</li>' +
      '<li><b>Puntos:</b> narrador +3 si algunos pero no todos aciertan; +1 por cada voto recibido; +3 si aciertas; +2 para todos si aciertan todos o nadie.</li>' +
      '<li><b>Cada punto es una casilla.</b> Los personajes caminan por un sendero de 30 casillas. Gana quien esté más lejos tras 5 rondas, o quien llegue a la 30.</li>' +
      '<li><b>Trueque:</b> tras puntuar, 20 segundos para cambiar una palabra con otra persona.</li>' +
      '</ol>' +
      '<p class="rules-foot">Sala de 4 letras · misma mesa en todos los navegadores.</p>';
    $('modal-body').innerHTML = body;
    $('modal').classList.remove('hidden');
  }

  function closeModal() { $('modal').classList.add('hidden'); }

  function resetCaches() {
    Object.keys(cache).forEach(function (k) { cache[k] = ''; });
    lastPhase = null;
    lastRound = 0;
    lastScoreRound = 0;
    lastVoteKey = '';
    cache.chars = '';
    $('reveal').innerHTML = '';
    $('hand').innerHTML = '';
    $('words').innerHTML = '';
    $('seats').innerHTML = '';
    $('round-result').innerHTML = '';
    $('felt-log').textContent = '';
    $('trade-panel').classList.add('hidden');
    Object.keys(tokens).forEach(function (k) {
      if (tokens[k].parentNode) tokens[k].parentNode.removeChild(tokens[k]);
      delete tokens[k];
      delete tokenCells[k];
    });
    currentPlayers = {};
    Object.keys(walkTimers).forEach(function (k) { clearInterval(walkTimers[k]); delete walkTimers[k]; });
  }

  CF.UI = {
    init: init,
    show: show,
    setNet: setNet,
    setHomeProfile: setHomeProfile,
    updateSound: updateSound,
    homeMsg: homeMsg,
    setJoinBusy: setJoinBusy,
    renderChars: renderChars,
    renderLobby: renderLobby,
    renderTable: renderTable,
    renderResults: renderResults,
    setTimer: setTimer,
    toast: toast,
    openRules: openRules,
    resetCaches: resetCaches,
    readName: readName,
    readChar: readChar,
    screen: function () { return screen; }
  };
})();
