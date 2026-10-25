"""Pruebas del motor de reglas (sin red, sin interfaz).

Ejecuta CF.Rules dentro de la página para comprobar el reparto, el recuento
de votos, el avance de casillas, el trueque y las condiciones de victoria.

Uso:  python tests/rules.py
"""
from playwright.sync_api import sync_playwright
import http.server
import os
import socketserver
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8124


class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, *a):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


JS = r"""
() => {
  const R = CF.Rules;
  const out = {};

  function setup() {
    const s = R.create('TEST', 'a');
    R.addPlayer(s, { id: 'a', name: 'Ana', charId: 'vigia' });
    R.addPlayer(s, { id: 'b', name: 'Bea', charId: 'sonar' });
    R.addPlayer(s, { id: 'c', name: 'Carla', charId: 'glifo' });
    R.apply(s, 'a', { type: 'start' });
    return s;
  }
  function cardOf(s, owner) {
    const t = s.table.find(x => x.owner === owner);
    return t ? t.id : null;
  }
  function toVote(s) {
    const narr = s.narrator;
    const np = R.get(s, narr);
    R.apply(s, narr, { type: 'narrate', cardId: np.hand[0], word: np.words[0] });
    s.players.filter(p => p.id !== narr).forEach(p => {
      R.apply(s, p.id, { type: 'submit', cardId: p.hand[0] });
    });
    return narr;
  }
  function row(s, name) {
    return s.roundResult.rows.find(r => r.name === name);
  }
  function deltas(s) {
    const o = {};
    s.roundResult.rows.forEach(r => { o[r.name] = r.delta; });
    return o;
  }

  // 1. Reparto inicial
  {
    const s = setup();
    out.setup = {
      phase: s.phase,
      round: s.round,
      hands: s.players.map(p => p.hand.length),
      words: s.players.map(p => p.words.length),
      narrator: s.narrator
    };
  }

  // 2. Un acierto de dos: narrador +3, votos +1, acierto +3
  {
    const s = setup();
    const narr = toVote(s);
    const others = s.players.filter(p => p.id !== narr);
    out.table = { size: s.table.length, ghosts: s.table.filter(t => t.ghost).length };
    R.apply(s, others[0].id, { type: 'vote', cardId: cardOf(s, others[1].id) });
    R.apply(s, others[1].id, { type: 'vote', cardId: cardOf(s, narr) });
    out.partial = {
      deltas: deltas(s),
      rows: s.roundResult.rows.map(r => ({ name: r.name, votes: r.votes, correct: r.correct })),
      phase: s.phase,
      cells: s.players.map(p => ({ name: p.name, cell: p.cell, points: p.points }))
    };
  }

  // 3. Todos aciertan: narrador 0, resto +2 y +3
  {
    const s = setup();
    const narr = toVote(s);
    const others = s.players.filter(p => p.id !== narr);
    others.forEach(p => R.apply(s, p.id, { type: 'vote', cardId: cardOf(s, narr) }));
    out.allCorrect = { deltas: deltas(s), allCorrect: s.roundResult.allCorrect };
  }

  // 4. Nadie acierta: narrador 0, resto +2 y +1 por voto
  {
    const s = setup();
    const narr = toVote(s);
    const others = s.players.filter(p => p.id !== narr);
    R.apply(s, others[0].id, { type: 'vote', cardId: cardOf(s, others[1].id) });
    R.apply(s, others[1].id, { type: 'vote', cardId: cardOf(s, others[0].id) });
    out.noneCorrect = { deltas: deltas(s), anyCorrect: s.roundResult.anyCorrect };
  }

  // 5. Voto a fantasma
  {
    const s = setup();
    toVote(s);
    const ghost = s.table.find(t => t.ghost).id;
    const voter = s.players.find(p => p.id !== s.narrator);
    const others = s.players.filter(p => p.id !== s.narrator && p.id !== voter.id);
    R.apply(s, voter.id, { type: 'vote', cardId: ghost });
    R.apply(s, others[0].id, { type: 'vote', cardId: cardOf(s, s.narrator) });
    out.ghost = { ghostVotes: s.roundResult.ghostVotes, phase: s.phase };
  }

  // 6. Victoria al llegar a la casilla 30
  {
    const s = setup();
    const narr = toVote(s);
    const others = s.players.filter(p => p.id !== narr);
    others[0].cell = 26; others[0].points = 26;
    R.apply(s, others[0].id, { type: 'vote', cardId: cardOf(s, narr) });
    R.apply(s, others[1].id, { type: 'vote', cardId: cardOf(s, others[0].id) });
    out.win = {
      pendingFinish: s.pendingFinish,
      cell: others[0].cell,
      points: others[0].points
    };
    R.force(s, 'score');
    out.win.phase = s.phase;
    out.win.winners = s.winners.map(id => R.get(s, id).name);
  }

  // 7. Quinta ronda sin llegar a 30: gana quien más lejos está
  {
    const s = setup();
    s.round = 5;
    s.players.forEach((p, i) => { p.cell = 10 + i * 3; p.points = p.cell; });
    s.phase = 'trade';
    R.force(s, 'trade');
    out.lastRound = {
      phase: s.phase,
      winners: s.winners.map(id => R.get(s, id).name),
      cells: s.players.map(p => p.cell)
    };
  }

  // 8. Empate: comparten victoria
  {
    const s = setup();
    s.round = 5;
    s.players.forEach(p => { p.cell = 12; p.points = 12; });
    s.phase = 'trade';
    R.force(s, 'trade');
    out.tie = { phase: s.phase, winners: s.winners.map(id => R.get(s, id).name) };
  }

  // 9. El narrador se desconecta en la ronda de pista
  {
    const s = setup();
    const old = s.narrator;
    R.setConnected(s, old, false);
    out.narratorLeft = { old: old, now: s.narrator, phase: s.phase, round: s.round };
  }

  // 10. Trueque: oferta, aceptación e intercambio
  {
    const s = setup();
    const narr = toVote(s);
    const others = s.players.filter(p => p.id !== narr);
    others.forEach(p => R.apply(s, p.id, { type: 'vote', cardId: cardOf(s, narr) }));
    R.force(s, 'score'); // score -> trade
    const a = others[0], b = others[1];
    const give = a.words[0], take = b.words[0];
    R.apply(s, a.id, { type: 'tradeOffer', to: b.id, give: give });
    const accepted = R.apply(s, b.id, { type: 'tradeAccept', take: take });
    out.trade = {
      accepted: accepted.ok,
      aHas: R.get(s, a.id).words.indexOf(take) >= 0,
      bHas: R.get(s, b.id).words.indexOf(give) >= 0,
      done: Object.keys(s.tradeDone).length
    };
  }

  // 11. Pista escrita a mano: no gasta palabra de la mano
  {
    const s = setup();
    const narr = s.narrator, p = R.get(s, narr);
    const before = p.words.length;
    const r = R.apply(s, narr, { type: 'narrate', cardId: p.hand[0], word: 'zafiro' });
    out.customClue = { ok: r.ok, before: before, after: p.words.length, word: s.clue.word, phase: s.phase };
  }

  // 12. Pista inválida (dos palabras): se rechaza
  {
    const s = setup();
    const narr = s.narrator, p = R.get(s, narr);
    const r = R.apply(s, narr, { type: 'narrate', cardId: p.hand[0], word: 'dos palabras' });
    out.badClue = { ok: r.ok, phase: s.phase, clue: s.clue };
  }

  // 13. Palabra de la mano: sí se gasta
  {
    const s = setup();
    const narr = s.narrator, p = R.get(s, narr);
    const w = p.words[0];
    R.apply(s, narr, { type: 'narrate', cardId: p.hand[0], word: w });
    out.handClue = { used: w, left: p.words.indexOf(w), count: p.words.length, word: s.clue.word };
  }

  // 14. Mazo ampliado
  {
    out.deck = {
      cards: CF.Deck.illus.length,
      neutral: CF.Deck.neutral.length,
      words: CF.Deck.words.length,
      unique: new Set(CF.Deck.allIllustrationIds).size
    };
  }

  return out;
}
"""


def main():
    srv = Server(('127.0.0.1', PORT), Quiet)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = 'http://127.0.0.1:%d/' % PORT

    with sync_playwright() as p:
        b = p.chromium.launch(channel='msedge', headless=True)
        pg = b.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.goto(url)
        pg.wait_for_function("() => window.CF && CF.Rules && CF.Deck")
        out = pg.evaluate(JS)
        b.close()
    srv.shutdown()

    fails = []
    eq = lambda a, b, msg: None if a == b else fails.append('%s: %r != %r' % (msg, a, b))

    eq(out['setup']['hands'], [6, 6, 6], 'manos iniciales')
    eq(out['setup']['words'], [5, 5, 5], 'palabras iniciales')
    eq(out['setup']['round'], 1, 'ronda inicial')
    eq(out['setup']['phase'], 'clue', 'fase inicial')

    eq(out['table']['size'], 5, 'cartas en mesa')
    eq(out['table']['ghosts'], 2, 'cartas fantasma')
    eq(out['partial']['deltas'], {'Ana': 3, 'Bea': 0, 'Carla': 4}, 'puntuación parcial')
    eq(out['partial']['phase'], 'score', 'fase de recuento')
    for c in out['partial']['cells']:
        eq(c['cell'], c['points'], 'casilla = puntos (%s)' % c['name'])

    eq(out['allCorrect']['deltas'], {'Ana': 0, 'Bea': 5, 'Carla': 5}, 'todos aciertan')
    eq(out['allCorrect']['allCorrect'], True, 'marca allCorrect')
    eq(out['noneCorrect']['deltas'], {'Ana': 0, 'Bea': 3, 'Carla': 3}, 'nadie acierta')
    eq(out['noneCorrect']['anyCorrect'], False, 'marca anyCorrect')
    eq(out['ghost']['ghostVotes'], 1, 'votos fantasma')

    eq(out['win']['pendingFinish'], True, 'fin pendiente a 30')
    eq(out['win']['cell'], 30, 'casilla tope 30')
    eq(out['win']['phase'], 'results', 'pasa a resultados')
    eq(out['win']['winners'], ['Bea'], 'ganador único')

    eq(out['lastRound']['phase'], 'results', 'fin de partida')
    eq(out['lastRound']['winners'], ['Carla'], 'gana el más lejano')

    eq(out['tie']['winners'], ['Ana', 'Bea', 'Carla'], 'victoria compartida')

    eq(out['narratorLeft']['phase'], 'clue', 'sigue la pista')
    if out['narratorLeft']['now'] == out['narratorLeft']['old']:
        fails.append('el narrador no cambió al desconectarse')

    eq(out['trade']['accepted'], True, 'trueque aceptado')
    eq(out['trade']['aHas'], True, 'A recibe la palabra')
    eq(out['trade']['bHas'], True, 'B recibe la palabra')
    eq(out['trade']['done'], 2, 'trueque cerrado en ambos')

    eq(out['customClue']['ok'], True, 'pista escrita aceptada')
    eq(out['customClue']['after'], out['customClue']['before'], 'la pista escrita no gasta palabra')
    eq(out['customClue']['word'], 'zafiro', 'se guarda la pista escrita')
    eq(out['customClue']['phase'], 'submit', 'la pista escrita abre el envío')

    eq(out['badClue']['ok'], False, 'pista con espacios rechazada')
    eq(out['badClue']['phase'], 'clue', 'sigue en la fase de pista')
    eq(out['badClue']['clue'], None, 'no se guarda una pista inválida')

    eq(out['handClue']['left'], -1, 'la palabra elegida se gasta')
    eq(out['handClue']['count'], 4, 'quedan 4 palabras en la mano')
    eq(out['handClue']['word'], out['handClue']['used'], 'se guarda la palabra de la mano')

    eq(out['deck']['cards'], 208, 'ilustraciones del mazo')
    eq(out['deck']['unique'], 208, 'identificadores únicos')
    eq(out['deck']['neutral'], 18, 'cartas fantasma')
    eq(out['deck']['words'], 48, 'palabras de pista')

    if errors:
        fails.append('errores JS: %r' % errors)

    if fails:
        print('FALLOS:')
        for f in fails:
            print(' -', f)
        raise SystemExit(1)
    print('OK: reglas, recuento, victoria y trueque')


if __name__ == '__main__':
    main()
