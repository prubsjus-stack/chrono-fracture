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
    gp.click('[data-action="goto-join-code"]')
    gp.wait_for_timeout(350)
    gp.fill("#join-code", CODE)
    gp.click('[data-action="join-code"]')
    assert wait_screen(gp, "lobby", 100), "guest did not join"
    hp.wait_for_timeout(900)
    hp.click('[data-action="start-online"]')
    assert wait_screen(hp, "intro", 80), "host intro"
    assert wait_screen(gp, "intro", 80), "guest intro"
    hp.click('[data-action="continue-intro"]')
    gp.click('[data-action="continue-intro"]')
    assert wait_screen(hp, "game", 60), "host game"
    assert wait_screen(gp, "game", 60), "guest game"
    print("START", hp.evaluate("() => [CF.game.levelIndex, CF.game.localChars]"), gp.evaluate("() => [CF.game.levelIndex, CF.game.localChars]"))

    for lvl in range(2):
        complete_level(hp)
        assert wait_screen(hp, "complete", 80), f"host complete {lvl}"
        assert wait_screen(gp, "complete", 80), f"guest complete {lvl}"
        print("COMPLETE", lvl, screen(hp), screen(gp))
        hp.click('[data-action="next-level"]')
        assert wait_screen(hp, "intro", 80), f"host intro {lvl}"
        assert wait_screen(gp, "intro", 80), f"guest intro {lvl}"
        print("INTRO", hp.evaluate("() => CF.game.levelIndex"), gp.evaluate("() => CF.game.levelIndex"))
        hp.click('[data-action="continue-intro"]')
        gp.click('[data-action="continue-intro"]')
        assert wait_screen(hp, "game", 60), f"host game {lvl}"
        assert wait_screen(gp, "game", 60), f"guest game {lvl}"

    hp.evaluate("""() => {
      const g = CF.game;
      for (const d of g.level.devices) if (d.type === 'altar') g.activateDevice(d.id);
    }""")
    assert wait_screen(hp, "victory", 100), "host victory"
    assert wait_screen(gp, "victory", 100), "guest victory"
    print("VICTORY", hp.evaluate("() => [CF.app.state.victoryShown, CF.online.room.status]"), gp.evaluate("() => [CF.app.state.victoryShown, CF.online.room.status]"))
    hp.screenshot(path=str(SHOTS / "v01-host-victory.png"))
    gp.screenshot(path=str(SHOTS / "v02-guest-victory.png"))
    print("ERRORS", errors)
    hp.evaluate("() => CF.online.leaveRoom(true)")
    gp.evaluate("() => CF.online.leaveRoom(true)")
    browser.close()
