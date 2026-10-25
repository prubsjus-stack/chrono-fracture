from playwright.sync_api import sync_playwright

URL = "https://prubsjus-stack.github.io/chrono-fracture/?t=1"
errors = []
failed = []
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    pg = b.new_context(viewport={"width": 1280, "height": 800}).new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append("CONSOLE " + m.text) if m.type == "error" else None)
    pg.on("requestfailed", lambda r: failed.append(r.url + " " + str(r.failure)))
    pg.on("response", lambda r: failed.append("HTTP %d %s" % (r.status, r.url)) if r.status >= 400 else None)
    pg.goto(URL, wait_until="load")
    pg.wait_for_timeout(3500)
    print("VERSION", pg.evaluate("() => [CF.VERSION, CF.engine.loaded, document.querySelector('link[rel=stylesheet]').href]"))
    print("FONTS", pg.evaluate("() => [document.fonts.check('700 108px Silkscreen'), document.fonts.check('16px Cinzel')]"))
    pg.screenshot(path=r"C:\chrono-fracture\tests\shots\live-cover-120.png")
    pg.click('[data-action="goto-play"]')
    pg.wait_for_timeout(400)
    pg.click('[data-action="goto-offline"]')
    pg.wait_for_timeout(500)
    pg.click('[data-action="set-difficulty"][data-diff="easy"]')
    pg.click('[data-action="start-offline"]')
    pg.wait_for_timeout(800)
    pg.click('[data-action="continue-intro"]')
    pg.wait_for_timeout(1000)
    print("GAME", pg.evaluate("() => [CF.game.mode, CF.game.activeChar, CF.app.state.screen]"))
    pg.keyboard.press("2")
    pg.wait_for_timeout(500)
    print("SWITCH", pg.evaluate("() => [CF.game.activeChar, CF.game.localChars]"))
    pg.screenshot(path=r"C:\chrono-fracture\tests\shots\live-game-120.png")
    print("ERRORS", errors)
    print("FAILED", failed)
    b.close()
