import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(r"C:\chrono-fracture")
SHOTS = ROOT / "tests" / "shots"
errors = []

def reset_task(page):
    page.evaluate("""() => {
      if (CF.tasks) CF.tasks.close();
      const g = CF.game;
      g.taskOpen = false;
      if (g.input) g.input.enabled = true;
    }""")

def place(page, dev_id, char=None):
    page.evaluate(
        """([id, char]) => {
          const g = CF.game;
          if (char && g.activeChar !== char) {
            if (g.mode === 'solo') g.switchChar(char);
            else g.activeChar = char;
          }
          const d = g.level.devices.find(x => x.id === id);
          const ch = g.chars[g.activeChar];
          ch.x = d.x - ch.w / 2; ch.y = d.y - ch.h;
        }""",
        [dev_id, char],
    )
    page.wait_for_timeout(150)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append("PAGEERROR " + str(e)))
    page.on("console", lambda m: errors.append("CONSOLE " + m.text) if m.type == "error" else None)
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
    page.wait_for_timeout(800)

    # --- solo handover
    print("MODE", page.evaluate("() => [CF.game.mode, CF.game.activeChar]"))
    page.keyboard.press("3")
    page.wait_for_timeout(400)
    print("SWITCH3", page.evaluate("() => [CF.game.activeChar, CF.game.localChars, CF.game.chars.p3.immuneUntil > 0]"))
    assert page.evaluate("() => CF.game.activeChar") == "p3"

    # --- solo link puzzle L1 (orbs): vision then action with the same scientist
    place(page, "linkV1", char="p1")
    page.evaluate("() => { const g = CF.game; g.useAbility(g.chars.p1); g.tryActivateDevice(g.level.devices.find(d => d.id === 'linkV1')); }")
    page.wait_for_timeout(250)
    reset_task(page)
    print("VISION", page.evaluate("() => [CF.game.links.L1.vision > 0, CF.game.links.L1.by]"))

    place(page, "linkA1", char="p1")
    page.evaluate("() => { const g = CF.game; g.useAbility(g.chars.p1); g.tryActivateDevice(g.level.devices.find(d => d.id === 'linkA1')); }")
    page.wait_for_timeout(250)
    reset_task(page)
    page.wait_for_timeout(500)
    print("L1 SOLVED", page.evaluate("() => [CF.game.links.L1.solved, !!CF.game.doors.gateLink1, CF.game.doorAnim.gateLink1]"))
    assert page.evaluate("() => CF.game.links.L1.solved && !!CF.game.doors.gateLink1")

    # --- glyph door solo (p3 is the glyph scientist)
    place(page, "glyph1", char="p3")
    page.evaluate("() => { const g = CF.game; g.useAbility(g.chars.p3); g.tryActivateDevice(g.level.devices.find(d => d.id === 'glyph1')); }")
    page.wait_for_timeout(250)
    reset_task(page)
    page.wait_for_timeout(400)
    print("GLYPH1", page.evaluate("() => [!!CF.game.devices.glyph1, !!CF.game.doors.gateGlyph1]"))

    # --- finish level 1
    page.evaluate("""() => { const g = CF.game; for (const s of g.level.shards) g.shards[s.id] = true;
      const ch = g.chars[g.activeChar]; ch.x = g.level.exit.x; ch.y = g.level.exit.y - 60; }""")
    page.wait_for_timeout(900)
    page.click('[data-action="next-level"]')
    page.wait_for_timeout(800)
    page.click('[data-action="continue-intro"]')
    page.wait_for_timeout(800)
    print("LEVEL2", page.evaluate("() => [CF.game.levelIndex, CF.game.activeChar]"))

    # --- era 2 code link solo
    place(page, "linkV2", char="p2")
    page.evaluate("() => { const g = CF.game; g.useAbility(g.chars.p2); g.tryActivateDevice(g.level.devices.find(d => d.id === 'linkV2')); }")
    page.wait_for_timeout(250)
    reset_task(page)
    place(page, "linkA2", char="p1")
    page.evaluate("() => { const g = CF.game; g.useAbility(g.chars.p1); g.tryActivateDevice(g.level.devices.find(d => d.id === 'linkA2')); }")
    page.wait_for_timeout(250)
    reset_task(page)
    page.wait_for_timeout(500)
    print("L2 SOLVED", page.evaluate("() => [CF.game.links.L2.solved, !!CF.game.doors.gateLink2]"))
    assert page.evaluate("() => CF.game.links.L2.solved && !!CF.game.doors.gateLink2")

    # --- bridge ghost exists before activation, built after
    print("BRIDGE", page.evaluate("() => [typeof CF.engine.drawBridgeGhost, !!CF.game.bridges.bridgeHarm2]"))
    place(page, "harm2", char="p2")
    page.evaluate("() => { const g = CF.game; g.useAbility(g.chars.p2); g.tryActivateDevice(g.level.devices.find(d => d.id === 'harm2')); }")
    page.wait_for_timeout(250)
    reset_task(page)
    print("BRIDGE BUILT", page.evaluate("() => !!CF.game.bridges.bridgeHarm2"))

    # --- finish level 2
    page.evaluate("""() => { const g = CF.game; for (const s of g.level.shards) g.shards[s.id] = true;
      const ch = g.chars[g.activeChar]; ch.x = g.level.exit.x; ch.y = g.level.exit.y - 60; }""")
    page.wait_for_timeout(900)
    page.click('[data-action="next-level"]')
    page.wait_for_timeout(800)
    page.click('[data-action="continue-intro"]')
    page.wait_for_timeout(900)
    print("FINAL", page.evaluate("() => [CF.game.levelIndex, CF.game.level.isFinal, CF.game.activeChar]"))

    # --- wrong scientist at altar is blocked
    page.evaluate("""() => {
      const g = CF.game;
      g.switchChar('p1');
      const a = g.level.devices.find(d => d.id === 'altarHarm');
      const ch = g.chars.p1; ch.x = a.x; ch.y = a.y - ch.h;
      g.useAbility(ch);
    }""")
    page.wait_for_timeout(250)
    print("WRONG ALTAR", page.evaluate("() => [CF.game.taskOpen, !!CF.game.devices.altarHarm]"))

    # --- altars with handover: p1, p2, p3
    for cid, aid in [("p1", "altarEcho"), ("p2", "altarHarm"), ("p3", "altarGlyph")]:
        page.evaluate(
            """([cid, aid]) => {
              const g = CF.game;
              g.switchChar(cid);
              const a = g.level.devices.find(d => d.id === aid);
              const ch = g.chars[cid]; ch.x = a.x; ch.y = a.y - ch.h;
              g.useAbility(ch);
              g.tryActivateDevice(a);
            }""",
            [cid, aid],
        )
        page.wait_for_timeout(200)
        reset_task(page)
        page.wait_for_timeout(200)
        print("ALTAR", cid, page.evaluate("() => [CF.game.devices.altarEcho, CF.game.devices.altarHarm, CF.game.devices.altarGlyph, CF.game.victoryAt > 0]"))
    page.wait_for_timeout(5200)
    print("VICTORY", page.evaluate("() => [CF.app.state.screen, CF.game.victoryFired]"))
    page.screenshot(path=str(SHOTS / "s01-solo-victory.png"))
    print("ERRORS", json.dumps(errors, ensure_ascii=False))
    browser.close()
