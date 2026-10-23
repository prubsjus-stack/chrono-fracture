import time
from pathlib import Path
from playwright.sync_api import sync_playwright

SHOTS = Path(r"C:\chrono-fracture\tests\shots")
CODE = "L" + str(int(time.time()))[-6:]
errors = []

def connected(page, timeout=20):
    for _ in range(timeout * 5):
        if page.evaluate("() => CF.online.status") == "connected":
            return True
        page.wait_for_timeout(200)
    return False

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
    assert connected(page)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    hctx = browser.new_context(viewport={"width": 1280, "height": 800})
    hp = hctx.new_page(); hp.on("pageerror", lambda e: errors.append("HOST " + str(e)))
    menu_online(hp)
    hp.click('[data-action="goto-create"]')
    hp.wait_for_timeout(400)
    hp.fill("#create-code", CODE)
    hp.click('[data-action="create-room"]')
    hp.wait_for_timeout(1500)
    print("HOST", hp.evaluate("() => [CF.app.state.screen, CF.online.code, CF.online.isHost]"))

    gctx = browser.new_context(viewport={"width": 1280, "height": 800})
    gp = gctx.new_page(); gp.on("pageerror", lambda e: errors.append("GUEST " + str(e)))
    menu_online(gp, "p2")
    gp.click('[data-action="goto-join-list"]')
    rooms = []
    for attempt in range(12):
        gp.wait_for_timeout(2600)
        rooms = gp.evaluate("() => Array.from(document.querySelectorAll('.room')).map(r => ({code: r.getAttribute('data-code'), text: r.innerText}))")
        print("ROOMS try", attempt, rooms, gp.evaluate("() => [CF.app.state.screen, CF.app.state.rooms.length, CF.app.state.roomsLoading]"))
        if any(r["code"] == CODE for r in rooms):
            break
        if gp.locator('[data-action="refresh-rooms"]').count():
            gp.click('[data-action="refresh-rooms"]')
    print("STATE", gp.evaluate("() => [CF.app.state.screen, CF.app.state.rooms.length, CF.app.state.roomsLoading]"))
    gp.screenshot(path=str(SHOTS / "l01-list.png"))
    assert any(r["code"] == CODE for r in rooms), "room not listed"
    gp.click(f'[data-action="select-room"][data-code="{CODE}"]')
    gp.wait_for_timeout(200)
    gp.screenshot(path=str(SHOTS / "l02-list-selected.png"))
    gp.click('[data-action="join-selected"]')
    lobby = False
    for _ in range(14):
        gp.wait_for_timeout(1000)
        if gp.evaluate("() => CF.app.state.screen") == "lobby":
            lobby = True
            break
    print("GUEST LOBBY", gp.evaluate("() => [CF.app.state.screen, CF.online.code, CF.online.room && CF.online.room.players.length]"))
    assert lobby, "guest never reached lobby"
    print("HOST PLAYERS", hp.evaluate("() => [CF.online.players.length, CF.online.room && CF.online.room.status]"))
    gp.screenshot(path=str(SHOTS / "l03-list-joined.png"))
    hp.evaluate("() => CF.online.leaveRoom(true)")
    gp.wait_for_timeout(1800)
    print("AFTER HOST LEFT", gp.evaluate("() => [CF.app.state.screen, CF.online.room, !!CF.online.room]"))
    gp.screenshot(path=str(SHOTS / "l04-host-left.png"))
    print("ERRORS", errors)
    gp.evaluate("() => CF.online.leaveRoom(true)")
    browser.close()
