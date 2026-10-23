import time
from pathlib import Path
from playwright.sync_api import sync_playwright

SHOTS = Path(r"C:\chrono-fracture\tests\shots")
CODE = "V" + str(int(time.time()))[-6:]
errors = []

def connected(page):
    for _ in range(100):
        if page.evaluate("() => CF.online.status") == "connected":
            return
        page.wait_for_timeout(200)
    raise RuntimeError("not connected")

def menu_online(page, char=None):
    page.goto("http://127.0.0.1:8123/index.html", wait_until="load")
    page.wait_for_timeout(2500)
    page.click('[data-action="goto-play"]')
    page.wait_for_timeout(400)
    page.click('[data-action="goto-online"]')
    page.wait_for_timeout(600)
    if char:
        page.click(f'[data-char="{char}"]')
    page.click('[data-action="online-done"]')
    connected(page)
    if not wait_screen(page, "online-menu", 120):
        page.click('[data-action="online-done"]')
        assert wait_screen(page, "online-menu", 120), "online menu"

def screen(page):
    return page.evaluate("() => CF.app.state.screen")

def wait_screen(page, name, tries=80):
    for _ in range(tries):
        if screen(page) == name:
            return True
        page.wait_for_timeout(100)
    return False

def complete_level(page):
    page.evaluate("""() => {
      const g = CF.game;
      for (const s of g.level.shards) g.shards[s.id] = true;
      const ch = g.chars[g.activeChar];
      ch.x = g.level.exit.x;
      ch.y = g.level.exit.y - 60;
    }""")

def try_join(page, code):
    page.click('[data-action="goto-join-code"]')
    page.wait_for_timeout(350)
    page.fill("#join-code", code)
    for _ in range(4):
        page.click('[data-action="join-code"]')
        if wait_screen(page, "lobby", 60):
            return True
    return False

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    hctx = browser.new_context(viewport={"width": 1280, "height": 800})
    hp = hctx.new_page(); hp.on("pageerror", lambda e: errors.append("HOST " + str(e)))
    menu_online(hp)
    hp.click('[data-action="goto-create"]')
    hp.wait_for_timeout(350)
    hp.fill("#create-code", CODE)
    hp.click('[data-action="create-room"]')
    hp.wait_for_timeout(1300)

    gctx = browser.new_context(viewport={"width": 1280, "height": 800})
    gp = gctx.new_page(); gp.on("pageerror", lambda e: errors.append("GUEST " + str(e)))
    menu_online(gp, "p2")
    assert try_join(gp, CODE), "guest did not join"

    g3ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    g3p = g3ctx.new_page(); g3p.on("pageerror", lambda e: errors.append("THIRD " + str(e)))
    menu_online(g3p, "p3")
    assert try_join(g3p, CODE), "third did not join"

    for _ in range(20):
        if hp.evaluate("() => (CF.online.room && CF.online.room.players.length) || 0") == 3:
            break
        hp.wait_for_timeout(500)
    close3 = hp.evaluate("() => CF.online.room.players.length")
    assert close3 == 3, "host room should have three players"
    hp.click('[data-action="start-online"]')
    assert wait_screen(hp, "intro", 80), "host intro"
    assert wait_screen(gp, "intro", 80), "guest intro"
    assert wait_screen(g3p, "intro", 80), "third intro"
    hp.click('[data-action="continue-intro"]')
    gp.click('[data-action="continue-intro"]')
    g3p.click('[data-action="continue-intro"]')
    assert wait_screen(hp, "game", 60), "host game"
    assert wait_screen(gp, "game", 60), "guest game"
    assert wait_screen(g3p, "game", 60), "third game"
    print("START", hp.evaluate("() => [CF.game.levelIndex, CF.game.localChars]"), gp.evaluate("() => [CF.game.levelIndex, CF.game.localChars]"), g3p.evaluate("() => [CF.game.levelIndex, CF.game.localChars]"))

    def next_intro(clients):
        for _ in range(4):
            btn = hp.locator('[data-action="next-level"]')
            if btn.count() and btn.is_visible():
                btn.click(timeout=4000)
            ok = True
            for cl in clients:
                if not wait_screen(cl, "intro", 50):
                    ok = False
            if ok:
                return True
        return False

    for lvl in range(2):
        complete_level(hp)
        if not wait_screen(hp, "complete", 80):
            complete_level(hp)
        assert wait_screen(hp, "complete", 80), f"host complete {lvl}"
        for cl, label in ((gp, "guest"), (g3p, "third")):
            for _ in range(3):
                if wait_screen(cl, "complete", 60):
                    break
                complete_level(cl)
            assert wait_screen(cl, "complete", 60), f"{label} complete {lvl}"
        print("COMPLETE", lvl, screen(hp), screen(gp), screen(g3p))
        assert next_intro([hp, gp, g3p]), f"intro {lvl}"
        print("INTRO", hp.evaluate("() => CF.game.levelIndex"), gp.evaluate("() => CF.game.levelIndex"), g3p.evaluate("() => CF.game.levelIndex"))
        hp.click('[data-action="continue-intro"]')
        gp.click('[data-action="continue-intro"]')
        g3p.click('[data-action="continue-intro"]')
        assert wait_screen(hp, "game", 60), f"host game {lvl}"
        assert wait_screen(gp, "game", 60), f"guest game {lvl}"
        assert wait_screen(g3p, "game", 60), f"third game {lvl}"

    # final era: two different scientists must anchor two distinct altars
    hp.evaluate("""() => {
      const orig = CF.game.onlineAction.bind(CF.game);
      window.__rxa = [];
      CF.game.onlineAction = function (m) { window.__rxa.push(m); return orig(m); };
    }""")
    gp.evaluate("""() => {
      const orig = CF.online.send.bind(CF.online);
      window.__sent = [];
      CF.online.send = function (m) { window.__sent.push(m); return orig(m); };
    }""")
    for client, char, kind in ((hp, "p1", "host"), (gp, "p2", "guest")):
        client.evaluate("""(charId) => {
          const g = CF.game;
          const altar = g.level.devices.filter(d => d.type === 'altar').find(d => d.char === charId);
          const ch = g.chars[charId];
          ch.x = altar.x - ch.w / 2 - 1;
          ch.y = altar.y - ch.h;
          window.__altar = altar.x;
        }""", char)
        client.wait_for_timeout(1800)
        print("PRE", char, client.evaluate("(cid) => { const g = CF.game; return [g.levelIndex, Object.keys(g.chars), Object.keys(g.owner), g.chars[cid] ? [g.chars[cid].id, g.chars[cid].x] : null]; }"), char)
        client.evaluate("""(charId) => {
          const g = CF.game;
          g.useAbility(g.chars[charId]);
        }""", char)
        client.wait_for_timeout(700)
        client.evaluate("""(charId) => {
          const g = CF.game;
          const altar = g.level.devices.filter(d => d.type === 'altar').find(d => d.char === charId);
          if (g.taskOpen || (CF.tasks && CF.tasks.isOpen())) {
            g.tryActivateDevice(altar);
          }
          if (CF.tasks) CF.tasks.close();
          g.taskOpen = false;
          if (g.input) g.input.enabled = true;
        }""", char)
        client.wait_for_timeout(900)
    for tryn in range(6):
        if tryn:
            gp.evaluate("""(charId) => {
              const g = CF.game;
              const altar = g.level.devices.filter(d => d.type === 'altar').find(d => d.char === charId);
              if (g.devices[altar.id]) g.devices[altar.id] = false;
              g.tryActivateDevice(altar);
            }""", "p2")
            gp.wait_for_timeout(1600)
        dev = hp.evaluate("() => [{k:'echo',v:!!CF.game.devices.altarEcho},{k:'harm',v:!!CF.game.devices.altarHarm}].filter(x=>x.v).map(x=>x.k)")
        if "echo" in dev and "harm" in dev:
            break
    hosted = hp.evaluate("""() => {
      const g = CF.game;
      return [g.victoryAt > 0, Object.keys(g.altarBy).map(k => [k, g.altarBy[k]]), window.__rxa];
    }""")
    print("ALTARBY", hosted)
    print("GUEST SENT", gp.evaluate("() => window.__sent"))
    print("DEV", hp.evaluate("() => [CF.game.devices.altarEcho, CF.game.devices.altarHarm, CF.game.devices.altarGlyph]"))
    gp.evaluate("() => { CF.online.send({ t: 'action', kind: 'device', id: 'altarGlyph', char: 'p2' }); }")
    hp.wait_for_timeout(1200)
    print("HOST RX after manual", hp.evaluate("() => window.__rxa"))
    print("HOST POS", hp.evaluate("() => Object.keys(CF.online.positions).map(k => [k, CF.online.positions[k].x, CF.online.positions[k].y])"))
    print("HOST ROOM LEVEL", hp.evaluate("() => [CF.online.room.level, CF.online.room.status, CF.game.levelIndex]"))
    print("GUEST LOCALPOS", gp.evaluate("() => CF.game.getLocalPositions()"))
    hp.evaluate("() => { if (CF.tasks) CF.tasks.close(); const g = CF.game; g.taskOpen = false; if (g.input) g.input.enabled = true; }")
    assert wait_screen(hp, "victory", 100), f"host victory {hp.evaluate('() => [CF.app.state.screen, CF.game.victoryFired, CF.game.victoryAt, CF.game.time, CF.game.paused, CF.game.running]')}"
    assert wait_screen(gp, "victory", 100), "guest victory"
    assert wait_screen(g3p, "victory", 100), "third victory"
    print("VICTORY", hp.evaluate("() => [CF.app.state.victoryShown, CF.online.room.status]"), gp.evaluate("() => [CF.app.state.victoryShown, CF.online.room.status]"), g3p.evaluate("() => [CF.app.state.victoryShown, CF.online.room.status]"))
    hp.screenshot(path=str(SHOTS / "v01-host-victory.png"))
    gp.screenshot(path=str(SHOTS / "v02-guest-victory.png"))
    g3p.screenshot(path=str(SHOTS / "v03-third-victory.png"))
    print("ERRORS", errors)
    hp.evaluate("() => CF.online.leaveRoom(true)")
    gp.evaluate("() => CF.online.leaveRoom(true)")
    g3p.evaluate("() => CF.online.leaveRoom(true)")
    browser.close()

