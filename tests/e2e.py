"""Prueba de extremo a extremo con tres pestañas y una partida completa.

Comprueba: crear mesa, unirse con código, cinco rondas, votos, recuento,
trueque de palabras, avance de casillas y pantalla final.

Uso:  python tests/e2e.py
"""
from playwright.sync_api import sync_playwright
import http.server
import os
import socketserver
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8125
URL = 'http://127.0.0.1:%d/?v=2.1.0' % PORT


class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, *a):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def wait_phase(pg, phase, timeout=25000):
    pg.wait_for_function(
        "ph => { const s = CF.app.snapshot(); return s.pub && s.pub.phase === ph; }",
        arg=phase, timeout=timeout)


def wait_any(pg, phases, timeout=25000):
    pg.wait_for_function(
        "ps => { const s = CF.app.snapshot(); return s.pub && ps.indexOf(s.pub.phase) >= 0; }",
        arg=phases, timeout=timeout)


def pub(pg):
    return pg.evaluate('CF.app.snapshot().pub')


def main():
    srv = Server(('127.0.0.1', PORT), Quiet)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    with sync_playwright() as p:
        b = p.chromium.launch(channel='msedge', headless=True)
        pages, logs = [], []
        for name, ch in [('ANA', 'vigia'), ('BEA', 'sonar'), ('CARLA', 'glifo')]:
            ctx = b.new_context(viewport={'width': 1280, 'height': 720})
            pg = ctx.new_page()
            pg.on('pageerror', lambda e: logs.append(('pageerror', str(e))))
            pg.on('console', lambda m: logs.append((m.type, m.text)) if m.type == 'error' else None)
            pg.goto(URL)
            pg.wait_for_timeout(300)
            pg.fill('#in-name', name)
            pg.click('[data-char="%s"]' % ch)
            pages.append(pg)

        host = pages[0]
        host.click('#btn-create')
        host.wait_for_selector('#screen-lobby:not(.hidden)')
        code = host.inner_text('#lobby-code').strip()
        assert len(code) == 4, code
        for pg in pages[1:]:
            pg.fill('#in-code', code)
            pg.click('#btn-join')
        host.wait_for_function(
            "() => CF.app.snapshot().pub && CF.app.snapshot().pub.players.filter(p => p.connected).length === 3",
            timeout=30000)
        host.click('#btn-start')

        host.wait_for_selector('#screen-table:not(.hidden)', timeout=20000)
        assert host.locator('#rail .cell').count() == 31, 'sendero de 31 marcas'
        assert host.locator('#rail .rail-arrow').count() == 6, 'flechas del sendero'
        assert host.locator('#rail .cell.milestone').count() == 6, 'hitos cada 5 casillas'
        assert host.locator('#rail .cell.finish').inner_text().strip() == 'META', 'meta rotulada'
        assert '1 PUNTO = 1 CASILLA' in host.inner_text('.board-key').upper(), 'leyenda del tablero'

        for rnd in range(1, 6):
            for pg in pages:
                wait_phase(pg, 'clue')
            p0 = pub(host)
            assert p0['round'] == rnd, (p0['round'], rnd)
            narr = p0['narrator']
            narrator = [pg for pg in pages if pg.evaluate('CF.app.me.id') == narr][0]

            narrator.wait_for_selector('#hand .hand-card')
            assert narrator.locator('#hand .hand-card').count() == 6, 'mano de 6 cartas'
            assert narrator.locator('#words .word-ticket').count() == 5, 'mano de 5 palabras'
            if rnd == 1:
                narrator.wait_for_selector('#custom-clue:not(.hidden)')
                narrator.fill('#in-clue', 'zafiro')
                narrator.click('#hand .hand-card')
                assert narrator.inner_text('#clue-word').strip().lower() == 'zafiro', 'pista escrita visible'
                narrator.click('[data-act="narrate"]')
            else:
                narrator.click('#hand .hand-card')
                narrator.click('#words .word-ticket')
                narrator.click('[data-act="narrate"]')

            for pg in pages:
                wait_phase(pg, 'submit')
            if rnd == 1:
                assert pub(host)['clue']['word'] == 'zafiro', 'la pista escrita llega a la mesa'
                assert narrator.evaluate('CF.app.snapshot().priv.words.length') == 5, 'la pista escrita no gasta palabra'
            for pg in pages:
                if pg.evaluate('CF.app.me.id') == narr:
                    continue
                pg.click('#hand .hand-card')
                pg.click('[data-act="submit"]')

            for pg in pages:
                wait_phase(pg, 'vote')
            t = pub(host)['table']
            assert len(t) == 5, ('cartas en mesa', len(t))
            assert sum(1 for x in t if x['ghost']) == 2, 'dos fantasmas'
            for pg in pages:
                if pg.evaluate('CF.app.me.id') == narr:
                    continue
                own = pg.evaluate('CF.app.ownCard()')
                assert own, 'el cliente sabe cuál es su carta'
                assert pg.eval_on_selector('#reveal .slot[data-card="%s"]' % own,
                                           'e => e.dataset.votable') == '0', 'no se vota la propia'
                cards = pg.eval_on_selector_all('#reveal .slot', 'els => els.map(e => e.dataset.card)')
                target = [c for c in cards if c != own][0]
                pg.click('#reveal .slot[data-card="%s"]' % target)

            for pg in pages:
                wait_any(pg, ['score', 'trade'])
            p1 = pub(host)
            rr = p1['roundResult']
            assert rr, 'hay recuento'
            rows = {r['name']: r for r in rr['rows']}
            narr_name = rr['rows'][[r['pid'] for r in rr['rows']].index(rr['narrator'])]['name']
            voters = [r for r in rr['rows'] if r['pid'] != rr['narrator']]
            correct = [r for r in voters if r['correct']]
            if rr['allCorrect'] or not rr['anyCorrect']:
                assert rows[narr_name]['delta'] == 0, 'narrador sin puntos'
                for r in voters:
                    assert r['delta'] >= 2, 'al menos +2 al resto'
            else:
                assert rows[narr_name]['delta'] == 3, 'narrador +3'
            for r in voters:
                if r['correct']:
                    assert r['delta'] >= 3, 'acierto +3'
            for x in p1['players']:
                assert x['cell'] == min(30, x['points']), ('casilla', x['name'], x['cell'], x['points'])

            for pg in pages:
                pg.wait_for_selector('#trade-panel:not(.hidden)', timeout=25000)
            if rnd == 1:
                ids = [pg.evaluate('CF.app.me.id') for pg in pages]
                a, bb = pages[0], pages[1]
                wa = a.evaluate('CF.app.snapshot().priv.words')
                wb = bb.evaluate('CF.app.snapshot().priv.words')
                a.click('[data-offer-word="%s"]' % wa[0])
                a.click('#trade-panel [data-target="%s"]' % ids[1])
                a.click('[data-trade-act="send"]')
                bb.wait_for_selector('#trade-panel .trade-offer', timeout=15000)
                bb.click('[data-take="%s"]' % wb[0])
                bb.click('[data-trade-act="accept"]')
                a.wait_for_timeout(800)
                assert wb[0] in a.evaluate('CF.app.snapshot().priv.words'), 'palabra recibida'
                assert wa[0] in bb.evaluate('CF.app.snapshot().priv.words'), 'palabra entregada'
                pages[2].click('[data-trade-act="ready"]')
            else:
                for pg in pages:
                    pg.click('[data-trade-act="ready"]')

        host.wait_for_function("() => CF.app.snapshot().pub.phase === 'results'", timeout=30000)
        final = pub(host)
        assert final['winners'], 'hay ganador'
        for pg in pages:
            pg.wait_for_selector('#screen-results:not(.hidden)', timeout=20000)
        b.close()
    srv.shutdown()

    if logs:
        print('ERRORES DE CONSOLA:')
        for x in logs[:10]:
            print(' -', x)
        raise SystemExit(1)

    print('OK: partida completa de 5 rondas, trueque y resultados')
    print('Ganadores:', final['winners'])
    print('Puntos:', [(x['name'], x['cell'], x['points']) for x in final['players']])


if __name__ == '__main__':
    main()
