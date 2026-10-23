import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(r"C:\chrono-fracture")
SHOTS = ROOT / "tests" / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)
CODE = "W" + str(int(time.time()))[-6:]
errors = []

def connected(page):
    for _ in range(120):
        if page.evaluate("() => CF.online.status") == "connected":
            return
        page.wait_for_timeout(200)
    raise RuntimeError("not connected")

def screen(page):
    return page.evaluate("() => CF.app.state.screen")

def wait_screen(page, name, tries=80):
    for _ in range(tries):
        if screen(page) == name:
            return True
        page.wait_for_timeout(100)
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
    connected(page)
    if not wait_screen(page, "online-menu", 120):
        page.click('[data-action="online-done"]')
        assert wait_screen(page, "online-menu", 120), "online menu"

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
    menu_online(hp, "p1")
    hp.click('[data-action="goto-create"]')
    hp.wait_for_timeout(350)
    hp.fill("#create-code", CODE)
    hp.click('[data-action="create-room"]')
    assert wait_screen(hp, "lobby", 100), "host lobby"

    gctx = browser.new_context(viewport={"width": 1280, "height": 800})
    gp = gctx.new_page(); gp.on("pageerror", lambda e: errors.append("GUEST " + str(e)))
    menu_online(gp, "p2")
    assert try_join(gp, CODE), "guest did not join"
    for _ in range(20):
        if hp.evaluate("() => (CF.online.room && CF.online.room.players.length) || 0") == 2:
            break
        hp.wait_for_timeout(500)

    hp.click('[data-action="start-online"]')
    assert wait_screen(hp, "intro", 80), "host intro"
    assert wait_screen(gp, "intro", 80), "guest intro"
    hp.click('[data-action="continue-intro"]')
    gp.click('[data-action="continue-intro"]')
    assert wait_screen(hp, "game", 60), "host game"
    assert wait_screen(gp, "game", 60), "guest game"

    base = hp.evaluate("() => [CF.game.links.L1.correct >= 0, Object.keys(CF.game.links)]")
    print("LINKS", base)
    assert base[1].count("L1") == 1, "one L1 link shared"

    # guest (p2) activates the vision console: teleport + ability + task solve
    gp.evaluate("""() => {
      const g = CF.game;
      const v = g.level.devices.filter(d => d.type === 'link').find(d => d.role === 'vision');
      g.chars.p2.x = v.x - g.chars.p2.w / 2 - 1;
      g.chars.p2.y = v.y - g.chars.p2.h;
      g.useAbility(g.chars.p2);
    }""")
    hp.wait_for_timeout(400)
    vshare = [False, '', '', False]
    for _ in range(5):
        gp.evaluate("""() => {
          const g = CF.game;
          const v = g.level.devices.filter(d => d.type === 'link').find(d => d.role === 'vision');
          if (g.devices[v.id]) g.devices[v.id] = false;
          g.tryActivateDevice(v);
          if (CF.tasks) CF.tasks.close();
          g.taskOpen = false;
          if (g.input) g.input.enabled = true;
        }""")
        hp.wait_for_timeout(2400)
        vshare = hp.evaluate("""() => {
          const l = CF.game.links.L1;
          return [l.vision > 0, l.by, l.byClient, l.byClient === CF.online.myId];
        }""")
        if vshare[0]:
            break
    print("VISION SHARED", vshare)
    assert vshare[0] and vshare[3] is False, "vision recorded with guest client id"

    # host (p1) acts on the truth: teleport, ability, task solve
    hp.evaluate("""() => {
      const g = CF.game;
      const a = g.level.devices.filter(d => d.type === 'link').find(d => d.role === 'action');
      g.chars.p1.x = a.x - g.chars.p1.w / 2 - 1;
      g.chars.p1.y = a.y - g.chars.p1.h;
      g.useAbility(g.chars.p1);
    }""")
    hp.wait_for_timeout(400)
    hp.evaluate("""() => {
      const g = CF.game;
      const a = g.level.devices.filter(d => d.type === 'link').find(d => d.role === 'action');
      g.tryActivateDevice(a);
      if (CF.tasks) CF.tasks.close();
      g.taskOpen = false;
      if (g.input) g.input.enabled = true;
    }""")
    hp.wait_for_timeout(400)
    solved = [False, True, False, 0]
    for _ in range(5):
        hp.evaluate("""() => {
          const g = CF.game;
          const a = g.level.devices.filter(d => d.type === 'link').find(d => d.role === 'action');
          g.tryActivateDevice(a);
          if (CF.tasks) CF.tasks.close();
          g.taskOpen = false;
          if (g.input) g.input.enabled = true;
        }""")
        hp.wait_for_timeout(2400)
        solved = hp.evaluate("""() => {
          const g = CF.game;
          return [g.links.L1.solved, !!g.devices.linkA1, !!g.doors.gateLink1, g.doorAnim.gateLink1 || 0];
        }""")
        if solved[0]:
            break
    print("SOLVED HOST", solved)
    assert solved[0] and solved[2], "link solved on host"
    hp.screenshot(path=str(SHOTS / "ol1-host-link.png"))
    print("HOST SNAP LINKS", hp.evaluate("() => CF.game.getWorldSnapshot().links"))
    print("GUEST LINKS", gp.evaluate("() => CF.game.links"))
    guest_view = [False, False, 0]
    for _ in range(16):
        guest_view = gp.evaluate("""() => {
          const g = CF.game;
          return [g.links.L1.solved, !!g.doors.gateLink1, g.doorAnim.gateLink1 || 0];
        }""")
        if guest_view[0] and guest_view[1]:
            break
        gp.wait_for_timeout(900)
    print("SOLVED GUEST", guest_view)
    assert guest_view[0] and guest_view[1], "link solved synced to guest"
    gp.screenshot(path=str(SHOTS / "ol2-guest-link.png"))
    print("ERRORS", errors)
    hp.evaluate("() => CF.online.leaveRoom(true)")
    gp.evaluate("() => CF.online.leaveRoom(true)")
    browser.close()
