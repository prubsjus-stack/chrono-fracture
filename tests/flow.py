import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(r"C:\chrono-fracture")
SHOTS = ROOT / "tests" / "shots"
errors = []

def wait_screen(page, name, timeout=12):
    for _ in range(timeout * 10):
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
    page.click('[data-action="set-difficulty"][data-diff="easy"]')
    page.click('[data-action="start-offline"]')
    page.wait_for_timeout(700)
    page.click('[data-action="continue-intro"]')
    page.wait_for_timeout(500)

    for lvl in range(2):
        print("LEVEL", lvl, page.evaluate("() => [CF.game.levelIndex, CF.game.completed, CF.app.state.screen]"))
        page.evaluate("""() => {
          const g = CF.game;
          for (const s of g.level.shards) g.shards[s.id] = true;
          const ch = g.chars[g.activeChar];
          ch.x = g.level.exit.x;
          ch.y = g.level.exit.y - 60;
        }""")
        page.wait_for_timeout(800)
        print("COMPLETE?", page.evaluate("() => [CF.game.completed, CF.app.state.screen]"))
        page.screenshot(path=str(SHOTS / f"f0{lvl+1}-complete.png"))
        page.click('[data-action="next-level"]')
        page.wait_for_timeout(700)
        print("INTRO", page.evaluate("() => [CF.app.state.screen, CF.game.levelIndex]"))
        page.screenshot(path=str(SHOTS / f"f0{lvl+2}-intro.png"))
        page.click('[data-action="continue-intro"]')
        page.wait_for_timeout(700)

    print("FINAL", page.evaluate("() => [CF.game.levelIndex, CF.game.level.isFinal, CF.app.state.screen]"))
    page.evaluate("""() => {
      const g = CF.game;
      for (const d of g.level.devices) if (d.type === 'altar') g.activateDevice(d.id);
    }""")
    page.wait_for_timeout(5100)
    print("VICTORY", page.evaluate("() => [CF.app.state.screen, CF.game.victoryFired, CF.app.state.victoryShown]"))
    page.screenshot(path=str(SHOTS / "f05-victory.png"))
    page.click('[data-action="victory-credits"]')
    page.wait_for_timeout(1300)
    print("CREDITS", page.evaluate("() => CF.app.state.screen"))
    page.screenshot(path=str(SHOTS / "f06-victory-credits.png"))
    page.click('[data-action="skip"]')
    page.wait_for_timeout(700)
    print("BACK", page.evaluate("() => [CF.app.state.screen, CF.app.state.victoryShown]"))
    page.screenshot(path=str(SHOTS / "f07-victory-again.png"))
    page.click('[data-action="victory-menu"]')
    page.wait_for_timeout(800)
    print("MENU", page.evaluate("() => [CF.app.state.screen, !!CF.online.room]"))
    page.screenshot(path=str(SHOTS / "f08-cover-final.png"))
    print("ERRORS", errors)
    browser.close()
