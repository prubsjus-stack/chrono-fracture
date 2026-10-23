import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(r"C:\chrono-fracture")
SHOTS = ROOT / "tests" / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)
CODE = "T" + str(int(time.time()))[-7:]
logs = []
errors = []

def attach(page, tag):
    page.on("console", lambda m: logs.append(f"{tag} {m.type}: {m.text}"))
    page.on("pageerror", lambda e: errors.append(f"{tag} PAGEERROR: {e}"))

def wait_connected(page, tag, timeout=35):
    def probe():
        for _ in range(timeout * 5):
            s = page.evaluate("() => CF.online.status")
            if s == "connected":
                print(tag, "connected")
                return True
            if s == "error":
                print(tag, "connect error")
                break
            page.wait_for_timeout(200)
        print(tag, "NOT CONNECTED", page.evaluate("() => CF.online.status"))
        return False

    if probe():
        return True
    if page.locator('[data-action="online-done"]').count():
        page.evaluate("() => { if (CF.online.connect) CF.online.connect(); }")
        return probe()
    return False

def shot(page, name):
    page.screenshot(path=str(SHOTS / name))

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    hctx = browser.new_context(viewport={"width": 1280, "height": 800})
    hp = hctx.new_page(); attach(hp, "HOST")
    hp.goto("http://127.0.0.1:8123/index.html", wait_until="load")
    hp.wait_for_timeout(2500)
    hp.click('[data-action="goto-play"]')
    hp.wait_for_timeout(500)
    hp.click('[data-action="goto-online"]')
    hp.wait_for_timeout(700)
    hp.click('[data-action="online-done"]')
    if not wait_connected(hp, "HOST"):
        shot(hp, "o00-host-fail.png")
    hp.wait_for_timeout(700)
    print("HOST MENU", hp.evaluate("() => [CF.app.state.screen, CF.online.status, CF.online.myId]"))
    shot(hp, "o01-host-menu.png")
    hp.click('[data-action="goto-create"]')
    hp.wait_for_timeout(500)
    hp.fill("#create-code", CODE)
    shot(hp, "o02-host-create.png")
    hp.click('[data-action="create-room"]')
    hp.wait_for_timeout(1800)
    print("HOST LOBBY", hp.evaluate("() => [CF.app.state.screen, CF.online.code, CF.online.room && CF.online.room.players.length]"))
    shot(hp, "o03-host-lobby.png")

    gctx = browser.new_context(viewport={"width": 1280, "height": 800})
    gp = gctx.new_page(); attach(gp, "GUEST")
    gp.goto("http://127.0.0.1:8123/index.html", wait_until="load")
    gp.wait_for_timeout(2500)
    gp.click('[data-action="goto-play"]')
    gp.wait_for_timeout(500)
    gp.click('[data-action="goto-online"]')
    gp.wait_for_timeout(700)
    gp.click('[data-char="p2"]')
    gp.click('[data-action="online-done"]')
    if not wait_connected(gp, "GUEST"):
        shot(gp, "o00-guest-fail.png")
    gp.wait_for_timeout(700)
    print("GUEST MENU", gp.evaluate("() => [CF.app.state.screen, CF.online.status, CF.online.myChar]"))
    gp.click('[data-action="goto-join-code"]')
    gp.wait_for_timeout(500)
    gp.fill("#join-code", CODE)
    shot(gp, "o04-guest-joincode.png")
    gp.click('[data-action="join-code"]')
    for _ in range(60):
        if gp.evaluate("() => CF.app.state.screen") == "lobby":
            break
        gp.wait_for_timeout(500)
    print("GUEST LOBBY", gp.evaluate("() => [CF.app.state.screen, CF.online.code, CF.online.room && CF.online.room.players.length]"))
    shot(gp, "o05-guest-lobby.png")
    hp.wait_for_timeout(1200)
    print("HOST LOBBY2", hp.evaluate("() => [CF.online.room && CF.online.room.players.map(p => [p.name, p.char])]"))
    locked = hp.evaluate("""() => { const b = document.querySelector('[data-action="start-online"]'); return [b && b.disabled, b && b.title, CF.online.room.players.length]; }""")
    print("START LOCKED", locked)
    assert locked[0] is False, "start should unlock with two players"
    shot(hp, "o06-host-lobby2.png")

    g3ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    g3p = g3ctx.new_page(); attach(g3p, "THIRD")
    g3p.goto("http://127.0.0.1:8123/index.html", wait_until="load")
    g3p.wait_for_timeout(2500)
    g3p.click('[data-action="goto-play"]')
    g3p.wait_for_timeout(500)
    g3p.click('[data-action="goto-online"]')
    g3p.wait_for_timeout(700)
    g3p.click('[data-char="p3"]')
    g3p.click('[data-action="online-done"]')
    if not wait_connected(g3p, "THIRD"):
        shot(g3p, "o00-third-fail.png")
    g3p.wait_for_timeout(700)
    g3p.click('[data-action="goto-join-code"]')
    g3p.wait_for_timeout(500)
    g3p.fill("#join-code", CODE)
    g3p.click('[data-action="join-code"]')
    for _ in range(60):
        if g3p.evaluate("() => CF.app.state.screen") == "lobby":
            break
        g3p.wait_for_timeout(500)
    print("THIRD LOBBY", g3p.evaluate("() => [CF.app.state.screen, CF.online.code, CF.online.room && CF.online.room.players.length]"))
    hp.wait_for_timeout(1200)
    print("HOST LOBBY3", hp.evaluate("() => [CF.online.room && CF.online.room.players.map(p => [p.name, p.char])]"))
    ready = hp.evaluate("""() => { const b = document.querySelector('[data-action="start-online"]'); return [b && b.disabled, CF.online.room.players.length]; }""")
    print("START READY", ready)
    assert ready[0] is False, "start should unlock with three players"

    hp.click('[data-action="start-online"]')
    hp.wait_for_timeout(2500)
    gp.wait_for_timeout(300)
    g3p.wait_for_timeout(300)
    print("HOST AFTER START", hp.evaluate("() => [CF.app.state.screen, !!CF.game, CF.game && CF.game.isHost]"))
    print("GUEST AFTER START", gp.evaluate("() => [CF.app.state.screen, !!CF.game, CF.game && CF.game.isHost]"))
    print("THIRD AFTER START", g3p.evaluate("() => [CF.app.state.screen, !!CF.game, CF.game && CF.game.isHost]"))
    shot(hp, "o07-host-intro.png")
    shot(gp, "o08-guest-intro.png")
    hp.click('[data-action="continue-intro"]')
    gp.click('[data-action="continue-intro"]')
    g3p.click('[data-action="continue-intro"]')
    hp.wait_for_timeout(1200)
    gp.wait_for_timeout(1200)
    g3p.wait_for_timeout(1200)
    shot(hp, "o09-host-game.png")
    shot(gp, "o10-guest-game.png")
    print("HOST GAME", hp.evaluate("""() => ({mode: CF.game.mode, locals: CF.game.localChars, active: CF.game.activeChar, players: CF.online.players.length, x: CF.game.chars.p1.x})"""))
    print("GUEST GAME", gp.evaluate("""() => ({mode: CF.game.mode, locals: CF.game.localChars, active: CF.game.activeChar, players: CF.online.players.length, remote: CF.game.chars.p1.remote})"""))
    print("THIRD GAME", g3p.evaluate("""() => ({mode: CF.game.mode, locals: CF.game.localChars, active: CF.game.activeChar, players: CF.online.players.length, remote: CF.game.chars.p1.remote})"""))

    gp.keyboard.down("ArrowRight")
    gp.wait_for_timeout(900)
    gp.keyboard.up("ArrowRight")
    hp.wait_for_timeout(700)
    print("HOST SEES GUEST", hp.evaluate("""() => ({p2x: CF.game.chars.p2.x, remote: CF.game.chars.p2.remote, name: CF.game.remoteNames.p2})"""))
    hp.keyboard.down("ArrowRight")
    hp.wait_for_timeout(700)
    hp.keyboard.up("ArrowRight")
    gp.wait_for_timeout(700)
    print("GUEST SEES HOST", gp.evaluate("""() => ({p1x: CF.game.chars.p1.x, remote: CF.game.chars.p1.remote, name: CF.game.remoteNames.p1})"""))
    shot(hp, "o11-host-moved.png")
    shot(gp, "o12-guest-moved.png")
    print("PING", hp.evaluate("() => [CF.online.ping, CF.game.online.ping]"), gp.evaluate("() => [CF.online.ping, CF.game.online.ping]"), g3p.evaluate("() => [CF.online.ping, CF.game.online.ping]"))

    print("HOST LOGS")
    for line in logs:
        if line.startswith("HOST"):
            print(line)
    print("GUEST LOGS")
    for line in logs:
        if line.startswith("GUEST"):
            print(line)
    print("THIRD LOGS")
    for line in logs:
        if line.startswith("THIRD"):
            print(line)
    print("ERRORS")
    for line in errors:
        print(line)

    hp.evaluate("() => CF.online.leaveRoom(true)")
    gp.evaluate("() => CF.online.leaveRoom(true)")
    g3p.evaluate("() => CF.online.leaveRoom(true)")
    browser.close()
