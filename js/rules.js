/* FRECUENCIA ROTA · motor de reglas (autoritativo en el anfitrión) */
(function () {
  'use strict';

  var CF = window.CF = window.CF || {};
  var clock = function () { return Date.now(); };

  var PH = {
    LOBBY: 'lobby', CLUE: 'clue', SUBMIT: 'submit', VOTE: 'vote',
    SCORE: 'score', TRADE: 'trade', RESULTS: 'results'
  };

  function timers() { return CF.timers(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function nowMs() { return clock(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function get(s, pid) {
    for (var i = 0; i < s.players.length; i++) if (s.players[i].id === pid) return s.players[i];
    return null;
  }

  function connected(s) {
    return s.players.filter(function (p) { return p.connected; });
  }

  function log(s, text) {
    s.log.push({ t: nowMs(), text: String(text) });
    if (s.log.length > 24) s.log = s.log.slice(-24);
  }

  function freshDecks() {
    return {
      ill: CF.Deck.shuffle(CF.Deck.allIllustrationIds),
      discard: [],
      neutral: CF.Deck.shuffle(CF.Deck.neutralIds),
      word: CF.Deck.shuffle(CF.Deck.words.slice()),
      wordDiscard: []
    };
  }

  function drawIll(s) {
    if (!s.decks.ill.length) {
      s.decks.ill = CF.Deck.shuffle(s.decks.discard.concat(CF.Deck.allIllustrationIds));
      s.decks.discard = [];
    }
    return s.decks.ill.pop();
  }

  function drawWord(s) {
    if (!s.decks.word.length) {
      s.decks.word = CF.Deck.shuffle(s.decks.wordDiscard.concat(CF.Deck.words.slice()));
      s.decks.wordDiscard = [];
    }
    return s.decks.word.pop();
  }

  function drawNeutral(s) {
    if (!s.decks.neutral.length) s.decks.neutral = CF.Deck.shuffle(CF.Deck.neutralIds);
    return s.decks.neutral.pop();
  }

  function refill(s, p) {
    while (p.hand.length < CF.HAND_CARDS) {
      var id = drawIll(s);
      if (!id) break;
      p.hand.push(id);
    }
    while (p.words.length < CF.HAND_WORDS) {
      var w = drawWord(s);
      if (w == null) break;
      p.words.push(w);
    }
  }

  function refillAll(s) {
    s.players.forEach(function (p) { if (p.connected) refill(s, p); });
  }

  function addLog(s, text) { log(s, text); }

  function seatFree(s, seat) {
    return !s.players.some(function (p) { return p.seat === seat; });
  }

  function nextSeat(s) {
    for (var i = 0; i < CF.MAX_PLAYERS; i++) if (seatFree(s, i)) return i;
    return -1;
  }

  function charTaken(s, charId, exceptPid) {
    return s.players.some(function (p) { return p.id !== exceptPid && p.charId === charId; });
  }

  function freeChar(s) {
    for (var i = 0; i < CF.characters.length; i++) {
      if (!charTaken(s, CF.characters[i].id, null)) return CF.characters[i].id;
    }
    return CF.characters[0].id;
  }

  function uniqueName(s, base, exceptPid) {
    var name = base;
    var i = 2;
    while (s.players.some(function (p) { return p.id !== exceptPid && p.name === name; })) {
      name = base.slice(0, 11) + ' ' + i;
      i++;
      if (i > 12) break;
    }
    return name.slice(0, 14);
  }

  function create(code, hostId) {
    return {
      v: 2,
      rev: 0,
      code: code,
      hostId: hostId,
      phase: PH.LOBBY,
      round: 0,
      narratorIdx: -1,
      narrator: null,
      clue: null,
      deadline: 0,
      players: [],
      order: [],
      table: [],
      submissions: {},
      votes: {},
      trades: [],
      tradeDone: {},
      roundResult: null,
      pendingFinish: false,
      winners: [],
      finished: false,
      seq: 0,
      startedAt: 0,
      log: [],
      decks: freshDecks()
    };
  }

  function addPlayer(s, info) {
    var existing = get(s, info.id);
    if (existing) {
      existing.connected = true;
      if (info.name) existing.name = uniqueName(s, String(info.name).trim().slice(0, 14) || existing.name, existing.id);
      if (info.charId && info.charId !== existing.charId && !charTaken(s, info.charId, existing.id)) {
        existing.charId = info.charId;
      }
      return { ok: true, player: existing, rejoined: true };
    }
    if (s.phase !== PH.LOBBY) return { ok: false, error: 'La partida ya ha empezado.' };
    if (s.players.length >= CF.MAX_PLAYERS) return { ok: false, error: 'La mesa está completa (8).' };
    var seat = nextSeat(s);
    if (seat < 0) return { ok: false, error: 'No hay sitio libre.' };
    var charId = info.charId && !charTaken(s, info.charId, null) ? info.charId : freeChar(s);
    var name = uniqueName(s, String(info.name || '').trim().slice(0, 14) || ('JUGADOR ' + (seat + 1)), null);
    var p = {
      id: info.id,
      name: name,
      charId: charId,
      seat: seat,
      connected: true,
      ready: false,
      points: 0,
      cell: 0,
      prevCell: 0,
      lastGain: 0,
      hand: [],
      words: [],
      usedWords: 0,
      guesses: 0
    };
    s.players.push(p);
    s.players.sort(function (a, b) { return a.seat - b.seat; });
    s.order = s.players.map(function (q) { return q.id; });
    log(s, name + ' se sienta en la mesa.');
    return { ok: true, player: p, rejoined: false };
  }

  function removePlayer(s, pid) {
    var p = get(s, pid);
    if (!p) return;
    if (s.phase === PH.LOBBY) {
      s.players = s.players.filter(function (q) { return q.id !== pid; });
      s.order = s.players.map(function (q) { return q.id; });
      log(s, p.name + ' deja la mesa.');
    } else {
      p.connected = false;
      log(s, p.name + ' se ha desconectado.');
      if (pid === s.narrator && s.phase === PH.CLUE) narratorLeft(s);
    }
  }

  function narratorLeft(s) {
    var list = s.order.filter(function (pid) { return get(s, pid); });
    if (!list.length) { finish(s); return; }
    var idx = list.indexOf(s.narrator);
    var found = null;
    for (var i = 1; i <= list.length; i++) {
      var cand = get(s, list[(idx + i) % list.length]);
      if (cand && cand.connected) { found = cand; break; }
    }
    if (!found) { finish(s); return; }
    s.narrator = found.id;
    s.narratorIdx = list.indexOf(found.id);
    s.clue = null;
    s.clueCardId = null;
    s.table = [];
    s.phase = PH.CLUE;
    s.deadline = nowMs() + timers().clue * 1000;
    refill(s, found);
    log(s, 'El narrador se ha ido: narra ' + found.name + '.');
  }

  function setConnected(s, pid, val) {
    var p = get(s, pid);
    if (!p || p.connected === !!val) return false;
    p.connected = !!val;
    log(s, p.name + (val ? ' vuelve a la mesa.' : ' se ha desconectado.'));
    if (!val && pid === s.narrator && s.phase === PH.CLUE) narratorLeft(s);
    return true;
  }

  function resetRoundFields(s) {
    s.clue = null;
    s.clueCardId = null;
    s.table = [];
    s.submissions = {};
    s.votes = {};
    s.trades = [];
    s.tradeDone = {};
    s.roundResult = null;
    s.pendingFinish = false;
    s.deadline = 0;
  }

  function startGame(s) {
    if (s.phase !== PH.LOBBY) return { ok: false, error: 'La partida ya está en marcha.' };
    var n = connected(s).length;
    if (n < CF.MIN_PLAYERS) return { ok: false, error: 'Hacen falta al menos 3 jugadores.' };
    s.players.forEach(function (p) {
      p.points = 0; p.cell = 0; p.prevCell = 0; p.lastGain = 0;
      p.hand = []; p.words = []; p.usedWords = 0; p.guesses = 0; p.ready = false;
    });
    s.decks = freshDecks();
    s.round = 0;
    s.narratorIdx = -1;
    s.narrator = null;
    s.finished = false;
    s.winners = [];
    s.startedAt = nowMs();
    s.log = [];
    refillAll(s);
    log(s, 'La mesa despierta. Cinco rondas, treinta casillas.');
    beginRound(s);
    return { ok: true };
  }

  function beginRound(s) {
    s.round += 1;
    resetRoundFields(s);
    if (s.round > CF.ROUNDS) { finish(s); return; }
    var list = s.order.filter(function (pid) { return get(s, pid); });
    if (!list.length) { finish(s); return; }

    var found = null;
    var tries = 0;
    while (tries < list.length) {
      s.narratorIdx = (s.narratorIdx + 1) % list.length;
      var cand = get(s, list[s.narratorIdx]);
      if (cand && cand.connected) { found = cand; break; }
      tries++;
    }
    if (!found) { finish(s); return; }

    s.narrator = found.id;
    refillAll(s);
    s.phase = PH.CLUE;
    s.deadline = nowMs() + timers().clue * 1000;
    log(s, 'Ronda ' + s.round + '. Narra ' + found.name + '.');
  }

  function narrate(s, pid, cardId, word) {
    if (s.phase !== PH.CLUE) return { ok: false, error: 'No es el momento de narrar.' };
    if (pid !== s.narrator) return { ok: false, error: 'No eres el narrador.' };
    var p = get(s, pid);
    if (!p) return { ok: false, error: 'Jugador desconocido.' };
    var i = p.hand.indexOf(cardId);
    if (i < 0) return { ok: false, error: 'Esa carta no está en tu mano.' };
    var j = p.words.indexOf(word);
    if (j < 0) return { ok: false, error: 'Esa palabra no está en tu mano.' };
    p.hand.splice(i, 1);
    p.words.splice(j, 1);
    p.usedWords++;
    s.decks.discard.push(cardId);
    s.clue = { word: word, pid: pid };
    s.clueCardId = cardId;
    s.table = [{ id: cardId, owner: pid, ghost: false }];
    s.decks.wordDiscard.push(word);
    s.phase = PH.SUBMIT;
    s.deadline = nowMs() + timers().submit * 1000;
    log(s, p.name + ' da la pista: «' + word + '».');
    return { ok: true };
  }

  function submit(s, pid, cardId) {
    if (s.phase !== PH.SUBMIT) return { ok: false, error: 'No es el momento de enviar carta.' };
    if (pid === s.narrator) return { ok: false, error: 'El narrador no envía carta.' };
    var p = get(s, pid);
    if (!p || !p.connected) return { ok: false, error: 'Jugador desconocido.' };
    if (s.submissions[pid]) return { ok: false, error: 'Ya has enviado una carta.' };
    var i = p.hand.indexOf(cardId);
    if (i < 0) return { ok: false, error: 'Esa carta no está en tu mano.' };
    p.hand.splice(i, 1);
    s.submissions[pid] = cardId;
    s.decks.discard.push(cardId);
    log(s, p.name + ' desliza una carta.');
    if (allSubmitted(s)) reveal(s);
    return { ok: true };
  }

  function allSubmitted(s) {
    var voters = connected(s).filter(function (p) { return p.id !== s.narrator; });
    if (!voters.length) return false;
    return voters.every(function (p) { return !!s.submissions[p.id]; });
  }

  function reveal(s) {
    var table = [];
    if (s.clueCardId) table.push({ id: s.clueCardId, owner: s.narrator, ghost: false });
    Object.keys(s.submissions).forEach(function (pid) {
      table.push({ id: s.submissions[pid], owner: pid, ghost: false });
    });
    var guard = 0;
    while (table.length < CF.TABLE_CARDS && guard < 20) {
      table.push({ id: drawNeutral(s), owner: null, ghost: true });
      guard++;
    }
    s.table = CF.Deck.shuffle(table);
    s.phase = PH.VOTE;
    s.deadline = nowMs() + timers().vote * 1000;
    log(s, 'Se revelan ' + s.table.length + ' cartas. Votad.');
  }

  function vote(s, pid, cardId) {
    if (s.phase !== PH.VOTE) return { ok: false, error: 'No es el momento de votar.' };
    if (pid === s.narrator) return { ok: false, error: 'El narrador no vota.' };
    var p = get(s, pid);
    if (!p || !p.connected) return { ok: false, error: 'Jugador desconocido.' };
    if (Object.prototype.hasOwnProperty.call(s.votes, pid)) return { ok: false, error: 'Ya has votado.' };
    var target = null;
    for (var i = 0; i < s.table.length; i++) {
      if (s.table[i].id === cardId) { target = s.table[i]; break; }
    }
    if (!target) return { ok: false, error: 'Esa carta no está en la mesa.' };
    if (target.owner === pid) return { ok: false, error: 'No puedes votar tu propia carta.' };
    s.votes[pid] = target.owner;
    log(s, p.name + ' deposita su gema.');
    if (allVoted(s)) score(s);
    return { ok: true };
  }

  function allVoted(s) {
    var voters = connected(s).filter(function (p) { return p.id !== s.narrator; });
    if (!voters.length) return false;
    return voters.every(function (p) { return Object.prototype.hasOwnProperty.call(s.votes, p.id); });
  }

  function score(s) {
    var narr = get(s, s.narrator);
    if (!narr) { finish(s); return; }
    var voters = connected(s).filter(function (p) { return p.id !== s.narrator; });
    var rows = {};
    s.players.forEach(function (p) {
      rows[p.id] = { pid: p.id, votes: 0, correct: false, delta: 0, votedFor: null };
    });
    Object.keys(s.votes).forEach(function (vpid) {
      var owner = s.votes[vpid];
      var row = rows[vpid];
      if (!row) return;
      row.votedFor = owner;
      if (owner && rows[owner]) rows[owner].votes += 1;
      if (owner === s.narrator) row.correct = true;
    });
    var correctCount = voters.filter(function (p) { return rows[p.id].correct; }).length;
    var total = voters.length;
    var anyCorrect = correctCount > 0;
    var allCorrect = total > 0 && correctCount === total;

    if (anyCorrect && !allCorrect) {
      rows[narr.id].delta += 3;
    } else if (total > 0) {
      voters.forEach(function (p) { rows[p.id].delta += 2; });
    }
    s.players.forEach(function (p) {
      if (p.id === s.narrator) return;
      if (p.connected || rows[p.id].votes > 0) rows[p.id].delta += rows[p.id].votes;
    });
    voters.forEach(function (p) {
      if (rows[p.id].correct) rows[p.id].delta += 3;
    });

    var resultRows = [];
    s.players.forEach(function (p) {
      var delta = rows[p.id].delta;
      p.prevCell = p.cell;
      p.cell = clamp(p.cell + delta, 0, CF.CELLS);
      p.points += delta;
      p.lastGain = delta;
      if (rows[p.id].correct) p.guesses += 1;
      resultRows.push({
        pid: p.id,
        name: p.name,
        delta: delta,
        votes: rows[p.id].votes,
        correct: rows[p.id].correct,
        cell: p.cell,
        points: p.points
      });
    });

    s.roundResult = {
      rows: resultRows,
      narrator: s.narrator,
      narratorCard: s.table.filter(function (t) { return t.owner === s.narrator; }).map(function (t) { return t.id; })[0] || null,
      clue: s.clue ? s.clue.word : '',
      anyCorrect: anyCorrect,
      allCorrect: allCorrect,
      ghostVotes: Object.keys(s.votes).filter(function (k) { return !s.votes[k]; }).length
    };
    s.phase = PH.SCORE;
    s.deadline = nowMs() + timers().score * 1000;
    var maxCell = Math.max.apply(null, s.players.map(function (p) { return p.cell; }));
    s.pendingFinish = maxCell >= CF.CELLS;
    log(s, 'Recuento de la ronda ' + s.round + '.');
  }

  function toTrade(s) {
    if (s.pendingFinish) { finish(s); return; }
    s.phase = PH.TRADE;
    s.deadline = nowMs() + timers().trade * 1000;
    s.trades = [];
    s.tradeDone = {};
    log(s, 'Veinte segundos de trueque.');
  }

  function tradeOffer(s, pid, to, give) {
    if (s.phase !== PH.TRADE) return { ok: false, error: 'No es el momento de negociar.' };
    var from = get(s, pid);
    var target = get(s, to);
    if (!from || !target || !from.connected || !target.connected) return { ok: false, error: 'Jugador no disponible.' };
    if (pid === to) return { ok: false, error: 'No puedes negociar contigo.' };
    if (s.tradeDone[pid]) return { ok: false, error: 'Ya has cerrado tu trueque.' };
    if (from.words.indexOf(give) < 0) return { ok: false, error: 'Esa palabra no está en tu mano.' };
    if (s.trades.some(function (t) { return t.status === 'pending' && (t.from === pid || t.to === pid); })) {
      return { ok: false, error: 'Hay un trueque pendiente.' };
    }
    var offer = { id: 't' + (++s.seq), from: pid, to: to, give: give, status: 'pending', at: nowMs() };
    s.trades.push(offer);
    log(s, from.name + ' ofrece «' + give + '» a ' + target.name + '.');
    return { ok: true };
  }

  function tradeAccept(s, pid, take) {
    if (s.phase !== PH.TRADE) return { ok: false, error: 'No es el momento de negociar.' };
    var target = get(s, pid);
    if (!target || !target.connected) return { ok: false, error: 'Jugador no disponible.' };
    var offer = null;
    for (var i = 0; i < s.trades.length; i++) {
      if (s.trades[i].to === pid && s.trades[i].status === 'pending') { offer = s.trades[i]; break; }
    }
    if (!offer) return { ok: false, error: 'No tienes ofertas.' };
    var from = get(s, offer.from);
    if (!from || !from.connected) { offer.status = 'gone'; return { ok: false, error: 'Ese jugador se ha ido.' }; }
    if (s.tradeDone[pid]) return { ok: false, error: 'Ya has cerrado tu trueque.' };
    var j = target.words.indexOf(take);
    if (j < 0) return { ok: false, error: 'Esa palabra no está en tu mano.' };
    var k = from.words.indexOf(offer.give);
    if (k < 0) { offer.status = 'gone'; return { ok: false, error: 'La oferta ya no vale.' }; }
    target.words.splice(j, 1);
    from.words.splice(k, 1);
    target.words.push(offer.give);
    from.words.push(take);
    offer.status = 'accepted';
    offer.take = take;
    s.tradeDone[pid] = true;
    s.tradeDone[offer.from] = true;
    log(s, from.name + ' y ' + target.name + ' intercambian palabras.');
    if (allTradeDone(s)) nextRound(s);
    return { ok: true };
  }

  function tradeDecline(s, pid) {
    if (s.phase !== PH.TRADE) return { ok: false, error: 'No es el momento.' };
    var offer = null;
    for (var i = 0; i < s.trades.length; i++) {
      if (s.trades[i].to === pid && s.trades[i].status === 'pending') { offer = s.trades[i]; break; }
    }
    if (!offer) return { ok: false, error: 'No tienes ofertas.' };
    offer.status = 'declined';
    var p = get(s, pid);
    var from = get(s, offer.from);
    log(s, (p ? p.name : '?') + ' rechaza la palabra de ' + (from ? from.name : '?') + '.');
    return { ok: true };
  }

  function tradeReady(s, pid) {
    if (s.phase !== PH.TRADE) return { ok: false, error: 'No es el momento.' };
    s.tradeDone[pid] = true;
    if (allTradeDone(s)) nextRound(s);
    return { ok: true };
  }

  function allTradeDone(s) {
    var list = connected(s);
    if (!list.length) return false;
    return list.every(function (p) { return !!s.tradeDone[p.id]; });
  }

  function nextRound(s) {
    if (s.pendingFinish) { finish(s); return; }
    if (s.round >= CF.ROUNDS) { finish(s); return; }
    beginRound(s);
  }

  function finish(s) {
    s.phase = PH.RESULTS;
    s.finished = true;
    s.deadline = 0;
    s.clue = null;
    if (!s.players.length) { s.winners = []; return; }
    var maxCell = Math.max.apply(null, s.players.map(function (p) { return p.cell; }));
    var ahead = s.players.filter(function (p) { return p.cell === maxCell; });
    var maxPts = Math.max.apply(null, ahead.map(function (p) { return p.points; }));
    s.winners = ahead.filter(function (p) { return p.points === maxPts; }).map(function (p) { return p.id; });
    log(s, 'La partida termina.');
  }

  function rank(s) {
    return s.players.slice().sort(function (a, b) {
      if (b.cell !== a.cell) return b.cell - a.cell;
      if (b.points !== a.points) return b.points - a.points;
      return a.seat - b.seat;
    });
  }

  function tradeFor(s, pid) {
    return s.trades.filter(function (t) { return t.status === 'pending' && (t.from === pid || t.to === pid); });
  }

  function apply(s, pid, action) {
    if (!action || !action.type) return { ok: false, error: 'Acción vacía.' };
    var type = action.type;
    if (type === 'start') {
      if (pid !== s.hostId) return { ok: false, error: 'Solo el anfitrión reparte.' };
      return startGame(s);
    }
    if (type === 'narrate') return narrate(s, pid, action.cardId, action.word);
    if (type === 'submit') return submit(s, pid, action.cardId);
    if (type === 'vote') return vote(s, pid, action.cardId);
    if (type === 'tradeOffer') return tradeOffer(s, pid, action.to, action.give);
    if (type === 'tradeAccept') return tradeAccept(s, pid, action.take);
    if (type === 'tradeDecline') return tradeDecline(s, pid);
    if (type === 'tradeReady') return tradeReady(s, pid);
    if (type === 'again') {
      if (pid !== s.hostId) return { ok: false, error: 'Solo el anfitrión puede reiniciar.' };
      if (s.phase !== PH.RESULTS) return { ok: false, error: 'La partida sigue.' };
      s.phase = PH.LOBBY;
      s.finished = false;
      s.round = 0;
      s.narratorIdx = -1;
      s.winners = [];
      s.startedAt = 0;
      s.table = [];
      s.roundResult = null;
      s.log = [];
      s.players.forEach(function (p) {
        p.ready = false;
        p.hand = [];
        p.words = [];
        p.cell = 0;
        p.prevCell = 0;
        p.points = 0;
        p.lastGain = 0;
      });
      log(s, 'Nueva partida. La mesa espera.');
      return { ok: true };
    }
    if (type === 'leave') {
      removePlayer(s, pid);
      return { ok: true };
    }
    return { ok: false, error: 'Acción desconocida.' };
  }

  function autoNarrate(s) {
    var p = get(s, s.narrator);
    if (!p) { beginRound(s); return; }
    if (!p.hand.length || !p.words.length) { refill(s, p); }
    var cardId = p.hand[Math.floor(Math.random() * p.hand.length)];
    var word = p.words[Math.floor(Math.random() * p.words.length)];
    if (narrationIncomplete(s)) narrate(s, s.narrator, cardId, word);
  }

  function narrationIncomplete(s) {
    return s.phase === PH.CLUE && !s.clue;
  }

  function autoSubmitAll(s) {
    var list = connected(s).filter(function (p) { return p.id !== s.narrator && !s.submissions[p.id]; });
    list.forEach(function (p) {
      if (!p.hand.length) refill(s, p);
      if (!p.hand.length) return;
      var id = p.hand[Math.floor(Math.random() * p.hand.length)];
      submit(s, p.id, id);
    });
  }

  function autoVoteAll(s) {
    var list = connected(s).filter(function (p) {
      return p.id !== s.narrator && !Object.prototype.hasOwnProperty.call(s.votes, p.id);
    });
    list.forEach(function (p) {
      var options = s.table.filter(function (t) { return t.owner !== p.id; });
      if (!options.length) return;
      var pick = options[Math.floor(Math.random() * options.length)];
      vote(s, p.id, pick.id);
    });
  }

  function tick(s) {
    if (!s || s.phase === PH.LOBBY || s.phase === PH.RESULTS) return false;
    var changed = false;
    var guard = 0;
    while (guard++ < 8) {
      var t = nowMs();
      var before = s.phase + '|' + Object.keys(s.submissions).length + '|' + Object.keys(s.votes).length;

      if (s.phase === PH.CLUE) {
        if (!s.clue && s.deadline && t >= s.deadline) {
          autoNarrate(s);
          changed = true;
        }
      } else if (s.phase === PH.SUBMIT) {
        if (s.deadline && t >= s.deadline) {
          autoSubmitAll(s);
          changed = true;
        }
        if (s.phase === PH.SUBMIT && (!connected(s).filter(function (p) { return p.id !== s.narrator; }).length || allSubmitted(s))) {
          reveal(s);
          changed = true;
        }
      } else if (s.phase === PH.VOTE) {
        if (s.deadline && t >= s.deadline) {
          autoVoteAll(s);
          changed = true;
        }
        if (s.phase === PH.VOTE && (!connected(s).filter(function (p) { return p.id !== s.narrator; }).length || allVoted(s))) {
          score(s);
          changed = true;
        }
      } else if (s.phase === PH.SCORE) {
        if (t >= s.deadline) {
          if (s.pendingFinish) finish(s); else toTrade(s);
          changed = true;
        }
      } else if (s.phase === PH.TRADE) {
        if (t >= s.deadline) {
          nextRound(s);
          changed = true;
        } else if (allTradeDone(s)) {
          nextRound(s);
          changed = true;
        }
      }

      var after = s.phase + '|' + Object.keys(s.submissions).length + '|' + Object.keys(s.votes).length;
      if (before === after && changed) break;
      if (!changed) break;
      if (s.phase === PH.LOBBY || s.phase === PH.RESULTS) break;
    }
    return changed;
  }

  /* acciones automáticas inmediatas (tests y anfitrión) */
  function force(s, what) {
    if (what === 'narrate') { autoNarrate(s); return true; }
    if (what === 'submit') { autoSubmitAll(s); if (s.phase === PH.SUBMIT && allSubmitted(s)) reveal(s); return true; }
    if (what === 'vote') { autoVoteAll(s); if (s.phase === PH.VOTE && allVoted(s)) score(s); return true; }
    if (what === 'score') { if (s.phase === PH.SCORE) { if (s.pendingFinish) finish(s); else toTrade(s); } return true; }
    if (what === 'trade') { if (s.phase === PH.TRADE) nextRound(s); return true; }
    return false;
  }

  function publicState(s) {
    var hideOwners = s.phase === PH.CLUE || s.phase === PH.SUBMIT || s.phase === PH.VOTE;
    var hideVotes = s.phase === PH.VOTE || s.phase === PH.SUBMIT || s.phase === PH.CLUE;
    var out = {
      v: s.v,
      rev: s.rev,
      code: s.code,
      hostId: s.hostId,
      phase: s.phase,
      round: s.round,
      rounds: CF.ROUNDS,
      cells: CF.CELLS,
      narrator: s.narrator,
      clue: s.clue ? { word: s.clue.word, pid: s.clue.pid } : null,
      deadline: s.deadline,
      serverNow: nowMs(),
      players: s.players.map(function (p) {
        return {
          id: p.id, name: p.name, charId: p.charId, seat: p.seat,
          connected: p.connected, ready: p.ready,
          points: p.points, cell: p.cell, prevCell: p.prevCell, lastGain: p.lastGain,
          handCount: p.hand.length, wordCount: p.words.length,
          submitted: !!s.submissions[p.id],
          voted: Object.prototype.hasOwnProperty.call(s.votes, p.id)
        };
      }),
      table: s.table.map(function (t) {
        return { id: t.id, ghost: t.ghost, owner: hideOwners ? null : t.owner, revealed: !hideOwners };
      }),
      trades: s.trades.filter(function (t) { return t.status === 'pending'; }).map(function (t) {
        return { id: t.id, from: t.from, to: t.to, give: t.give, at: t.at };
      }),
      tradeDone: Object.keys(s.tradeDone).filter(function (k) { return s.tradeDone[k]; }),
      roundResult: s.roundResult,
      pendingFinish: s.pendingFinish,
      winners: s.winners,
      finished: s.finished,
      log: s.log.slice(-8)
    };
    if (!hideVotes) {
      out.votes = s.votes;
    } else {
      out.votes = {};
    }
    return out;
  }

  function privateFor(s, pid) {
    var p = get(s, pid);
    if (!p) return null;
    return {
      hand: p.hand.slice(),
      words: p.words.slice(),
      narrator: s.narrator === pid,
      clueCard: s.narrator === pid && s.table.length ? s.table[0].id : null,
      tradeDone: !!s.tradeDone[pid],
      offer: tradeFor(s, pid).map(function (t) {
        return { id: t.id, from: t.from, to: t.to, give: t.give };
      })
    };
  }

  function fullState(s) { return clone(s); }

  CF.Rules = {
    PH: PH,
    create: create,
    addPlayer: addPlayer,
    removePlayer: removePlayer,
    setConnected: setConnected,
    startGame: startGame,
    apply: apply,
    tick: tick,
    force: force,
    finish: finish,
    beginRound: beginRound,
    narratorLeft: narratorLeft,
    publicState: publicState,
    privateFor: privateFor,
    fullState: fullState,
    rank: rank,
    get: get,
    connected: connected,
    setClock: function (fn) { clock = fn || function () { return Date.now(); }; },
    now: nowMs
  };
})();
