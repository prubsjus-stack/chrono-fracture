import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(r"C:\chrono-fracture")
SHOTS = ROOT / "tests" / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)
errors = []

def wait_screen(page, name, tries=80):
    for _ in range(tries):
        if page.evaluate("() => CF.app.state.screen") == name:
            return True
        page.wait_for_timeout(100)
    return False

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("http://127.0.0.1:8123/index.html", wait_until="load")
    page.wait_for_timeout(2600)
    page.click('[data-action="goto-play"]')
    page.wait_for_timeout(300)
    page.click('[data-action="goto-offline"]')
    page.wait_for_timeout(400)
    page.evaluate("() => { const c = document.querySelector('#coop-toggle'); if (c) c.checked = true; }")
    page.evaluate("() => { CF.app.state.coop = true; }")
    page.click('[data-action="start-offline"]')
    page.wait_for_timeout(800)
    page.click('[data-action="continue-intro"]')
    assert wait_screen(page, "game", 60), "game start"

    # mode checks
    base = page.evaluate("() => [CF.game.mode, CF.game.localChars, !!CF.game.links.L1]")
    print("BASE", base)
    assert base[0] == "coop" and base[2], "coop locals and links ready"

    # scientists start apart: also verify the action console stays locked in a fresh state
    fresh = page.evaluate("""() => {
      const g = CF.game;
      const a = g.level.devices.filter(d => d.type === 'link').find(d => d.role === 'action');
      return [g.devices[a.id], g.doors.gateLink1, g.doorAnim.gateLink1, g.links.L1.vision, g.links.L1.by, g.links.L1.byClient];
    }""")
    print("FRESH", fresh)
    assert fresh[0] is None and fresh[1] is None and fresh[2] is None and fresh[3] == 0, "fresh action console locked"

    # vision scientist reads the truth -> link opens the action console
    page.evaluate("""() => {
      const g = CF.game;
      const v = g.level.devices.filter(d => d.type === 'link').find(d => d.role === 'vision');
      g.chars.p1.owner = 'local';
      g.chars.p1.x = v.x - g.chars.p1.w / 2 - 1; g.chars.p1.y = v.y - g.chars.p1.h;
      g.activeChar = 'p1';
      g.useAbility(g.chars.p1);
    }""")
    page.wait_for_timeout(300)
    page.evaluate("""() => {
      const g = CF.game;
      const v = g.level.devices.filter(d => d.type === 'link').find(d => d.role === 'vision');
      g.tryActivateDevice(v);
    }""")
    vis = page.evaluate("""() => {
      const g = CF.game;
      const l = g.links.L1;
      return [l.vision > 0, l.by, l.byClient, CF.app.state.screen];
    }""")
    print("VISION", vis)
    assert vis[0] and vis[2] == "_local", "vision recorded"
    page.evaluate("""() => {
      if (CF.tasks) CF.tasks.close();
      const g = CF.game;
      g.taskOpen = false;
      if (g.input) g.input.enabled = true;
    }""")

    # same scientist cannot use the action console
    denied = page.evaluate("""() => {
      const g = CF.game;
      const a = g.level.devices.filter(d => d.type === 'link').find(d => d.role === 'action');
      g.chars.p1.owner = 'local'; g.chars.p2.owner = 'local';
      g.chars.p1.x = a.x - g.chars.p1.w / 2 - 1; g.chars.p1.y = a.y - g.chars.p1.h;
      g.activeChar = 'p1';
      return g.linkReady(a, g.chars.p1);
    }""")
    print("DENIED", denied)
    assert denied is False, "same scientist denied"

    # task open state from useAbility
    open_task = page.evaluate("() => CF.game.taskOpen")
    print("OPEN", open_task)

    # different scientist completes the action console -> link solved, door opens
    page.evaluate("""() => {
      const g = CF.game;
      g.chars.p1.owner = 'local';
      g.chars.p2.owner = 'local';
      const a = g.level.devices.filter(d => d.type === 'link').find(d => d.role === 'action');
      g.chars.p2.x = a.x - g.chars.p2.w / 2 - 1; g.chars.p2.y = a.y - g.chars.p2.h;
      g.activeChar = 'p2';
      g.useAbility(g.chars.p2);
    }""")
    page.wait_for_timeout(300)
    page.evaluate("""() => {
      const g = CF.game;
      const a = g.level.devices.filter(d => d.type === 'link').find(d => d.role === 'action');
      g.tryActivateDevice(a);
    }""")
    page.wait_for_timeout(400)
    page.evaluate("""() => {
      if (CF.tasks) CF.tasks.close();
      const g = CF.game;
      g.taskOpen = false;
      if (g.input) g.input.enabled = true;
    }""")
    page.wait_for_timeout(700)
    solved = page.evaluate("""() => {
      const g = CF.game;
      const l = g.links.L1;
      return [l.solved, !!g.devices.linkA1, !!g.doors.gateLink1, g.doorAnim.gateLink1];
    }""")
    print("SOLVED", solved)
    assert solved[0] and solved[2] and solved[3] > 0, "link door open"
    page.screenshot(path=str(SHOTS / "coop-link-solved.png"))

    # second link pair L2 for the next link gate
    l2 = None
    if page.evaluate("() => !!CF.game.links.L2"):
        l2 = page.evaluate("""() => {
          const g = CF.game;
          const vs = g.level.devices.filter(d => d.type === 'link' && d.pair === 'L2');
          return vs.map(d => [d.id, d.role]);
        }""")
    print("L2", l2)
    print("ERRORS", errors)
    browser.close()
