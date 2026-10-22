import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(r"C:\chrono-fracture")
SHOTS = ROOT / "tests" / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)

logs = []
errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    page.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
    page.on("pageerror", lambda e: errors.append(f"PAGEERROR: {e}"))
    page.on("requestfailed", lambda r: errors.append(f"REQFAIL: {r.url} {r.failure}"))

    page.goto("http://127.0.0.1:8123/index.html", wait_until="load")
    page.wait_for_timeout(3500)
    page.screenshot(path=str(SHOTS / "01-cover.png"))

    info = page.evaluate("""() => ({
      cf: typeof CF,
      i18n: typeof CF.i18n,
      engineLoaded: CF.engine.loaded,
      status: CF.online.status,
      screen: CF.app.state.screen,
      bootHidden: document.getElementById('boot').classList.contains('hide'),
      portals: document.querySelectorAll('.portal-btn').length,
      title: document.title
    })""")
    print("INFO", json.dumps(info, ensure_ascii=False))

    page.click('[data-action="goto-play"]')
    page.wait_for_timeout(900)
    page.screenshot(path=str(SHOTS / "02-play.png"))

    page.click('[data-action="goto-offline"]')
    page.wait_for_timeout(900)
    page.screenshot(path=str(SHOTS / "03-offline.png"))
    print("CARDS", page.locator(".char-card").count())

    page.click('[data-char="p3"]')
    page.click('[data-action="set-difficulty"][data-diff="easy"]')
    page.click('[data-action="start-offline"]')
    page.wait_for_timeout(1000)
    page.screenshot(path=str(SHOTS / "04-intro.png"))

    page.click('[data-action="continue-intro"]')
    page.wait_for_timeout(1200)
    page.screenshot(path=str(SHOTS / "05-game.png"))

    game_state = page.evaluate("""() => ({
      screen: CF.app.state.screen,
      running: CF.game.running,
      paused: CF.game.paused,
      active: CF.game.activeChar,
      x: CF.game.chars[CF.game.activeChar].x,
      y: CF.game.chars[CF.game.activeChar].y,
      level: CF.game.levelIndex,
      shards: CF.game.level.shards.length,
      canvas: document.getElementById('gameCanvas').style.width
    })""")
    print("GAME", json.dumps(game_state, ensure_ascii=False))

    page.keyboard.down("ArrowRight")
    page.wait_for_timeout(700)
    page.keyboard.up("ArrowRight")
    page.keyboard.press("Space")
    page.wait_for_timeout(600)
    game_state2 = page.evaluate("""() => ({
      x: CF.game.chars[CF.game.activeChar].x,
      y: CF.game.chars[CF.game.activeChar].y,
      anim: CF.game.chars[CF.game.activeChar].anim
    })""")
    print("MOVED", json.dumps(game_state2, ensure_ascii=False))
    page.screenshot(path=str(SHOTS / "06-moved.png"))

    page.keyboard.press("Escape")
    page.wait_for_timeout(700)
    page.screenshot(path=str(SHOTS / "07-pause.png"))
    print("PAUSE_SCREEN", page.evaluate("() => CF.app.state.screen"))

    page.click('[data-action="resume"]')
    page.wait_for_timeout(600)
    print("RESUMED", page.evaluate("() => [CF.app.state.screen, CF.game.paused]"))

    page.keyboard.press("Escape")
    page.wait_for_timeout(500)
    page.click('[data-action="exit-game"]')
    page.wait_for_timeout(800)
    page.screenshot(path=str(SHOTS / "08-back-cover.png"))
    print("COVER", page.evaluate("() => [CF.app.state.screen, CF.online.room]"))

    page.click('[data-action="goto-settings"]')
    page.wait_for_timeout(800)
    page.screenshot(path=str(SHOTS / "09-settings.png"))
    print("SETTINGS", page.evaluate("() => CF.app.state.screen"))
    page.click('[data-action="settings-back"]')
    page.wait_for_timeout(600)

    page.click('[data-action="goto-credits"]')
    page.wait_for_timeout(1200)
    page.screenshot(path=str(SHOTS / "10-credits.png"))
    print("CREDITS", page.evaluate("() => CF.app.state.screen"))
    page.click('[data-action="skip"]')
    page.wait_for_timeout(800)
    page.screenshot(path=str(SHOTS / "11-cover-again.png"))

    print("LOGS")
    for line in logs[-40:]:
        print(line)
    print("ERRORS")
    for line in errors:
        print(line)

    browser.close()
