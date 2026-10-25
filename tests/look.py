import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(r"C:\chrono-fracture")
SHOTS = ROOT / "tests" / "shots"
errors = []

def go(page, x, ground=470, char=None):
    page.evaluate(
        """([x, ground, char]) => {
          const g = CF.game;
          if (char && g.activeChar !== char) g.switchChar(char);
          const ch = g.chars[g.activeChar];
          ch.x = x; ch.y = ground - ch.h; ch.vx = 0; ch.vy = 0;
          g.camera.x = Math.max(0, Math.min(g.level.width - 1280, x - 640));
        }""",
        [x, ground, char],
    )
    page.wait_for_timeout(650)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append("CONSOLE " + m.type + ": " + m.text) if m.type == "error" else None)
    page.goto("http://127.0.0.1:8123/index.html", wait_until="load")
    page.wait_for_timeout(3000)
    page.screenshot(path=str(SHOTS / "t01-cover.png"))
    page.click('[data-action="goto-play"]')
    page.wait_for_timeout(300)
    page.click('[data-action="goto-offline"]')
    page.wait_for_timeout(400)
    page.click('[data-action="set-difficulty"][data-diff="normal"]')
    page.click('[data-action="start-offline"]')
    page.wait_for_timeout(700)
    page.click('[data-action="continue-intro"]')
    page.wait_for_timeout(900)

    print("START", page.evaluate("() => [CF.game.mode, CF.game.activeChar, CF.game.localChars]"))

    go(page, 1810)
    page.screenshot(path=str(SHOTS / "t02-era1-linkgate.png"))
    go(page, 2150)
    page.screenshot(path=str(SHOTS / "t03-era1-glyphdoor.png"))
    go(page, 2380)
    page.screenshot(path=str(SHOTS / "t04-era1-harmonic.png"))
    go(page, 2760, ground=470)
    page.screenshot(path=str(SHOTS / "t05-era1-bridge-ghost.png"))

    # activate harmonic solo and look at built bridge
    page.evaluate("""() => { const g = CF.game; g.devices.harm1 = true; g.bridges.bridgeHarm1 = true; }""")
    page.wait_for_timeout(500)
    page.screenshot(path=str(SHOTS / "t06-era1-bridge-built.png"))

    # switch character solo
    page.keyboard.press("2")
    page.wait_for_timeout(600)
    print("SWITCH", page.evaluate("() => [CF.game.activeChar, CF.game.localChars, JSON.stringify(CF.game.owner)]"))
    page.screenshot(path=str(SHOTS / "t07-solo-switch-p2.png"))

    # complete level 1
    page.evaluate("""() => {
      const g = CF.game;
      for (const s of g.level.shards) g.shards[s.id] = true;
      const ch = g.chars[g.activeChar];
      ch.x = g.level.exit.x; ch.y = g.level.exit.y - 60;
    }""")
    page.wait_for_timeout(900)
    page.click('[data-action="next-level"]')
    page.wait_for_timeout(800)
    page.click('[data-action="continue-intro"]')
    page.wait_for_timeout(900)
    print("LEVEL2", page.evaluate("() => [CF.game.levelIndex, CF.game.activeChar]"))

    go(page, 1520)
    page.screenshot(path=str(SHOTS / "t08-era2-linkgate.png"))
    go(page, 1930)
    page.screenshot(path=str(SHOTS / "t09-era2-glyphdoor.png"))
    go(page, 2380)
    page.evaluate("""() => { const g = CF.game; g.devices.harm2 = true; g.bridges.bridgeHarm2 = true; }""")
    page.wait_for_timeout(500)
    page.screenshot(path=str(SHOTS / "t10-era2-bridge.png"))
    go(page, 2760, char="p2")
    page.screenshot(path=str(SHOTS / "t11-era2-lift.png"))

    # open link puzzle panel to inspect masked slots (level 2)
    go(page, 1160, char="p1")
    page.evaluate("""() => { const g = CF.game; g.tryActivateDevice(g.level.devices.find(d => d.id === 'linkV2')); }""")
    page.wait_for_timeout(800)
    page.screenshot(path=str(SHOTS / "t12-link-task.png"))
    page.evaluate("""() => { if (CF.tasks && CF.tasks.close) CF.tasks.close(); CF.game.taskOpen = false; CF.game.input.enabled = true; }""")
    page.wait_for_timeout(300)

    # final level
    page.evaluate("""() => {
      const g = CF.game;
      for (const s of g.level.shards) g.shards[s.id] = true;
      const ch = g.chars[g.activeChar];
      ch.x = g.level.exit.x; ch.y = g.level.exit.y - 60;
    }""")
    page.wait_for_timeout(900)
    page.click('[data-action="next-level"]')
    page.wait_for_timeout(800)
    page.click('[data-action="continue-intro"]')
    page.wait_for_timeout(900)
    print("FINAL", page.evaluate("() => [CF.game.levelIndex, CF.game.level.isFinal]"))
    go(page, 730, ground=320, char="p1")
    page.screenshot(path=str(SHOTS / "t13-final-altars.png"))
    go(page, 1250, ground=300, char="p2")
    page.screenshot(path=str(SHOTS / "t14-final-altar2.png"))

    print("ERRORS", json.dumps(errors, ensure_ascii=False))
    browser.close()
