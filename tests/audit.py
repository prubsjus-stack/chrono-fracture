import json
from playwright.sync_api import sync_playwright

CHECKS = """
() => {
  const out = [];
  CF.levels.forEach((lv, li) => {
    const tops = lv.platforms.concat(lv.hidden || []).map(p => ({x: p.x, w: p.w, y: p.y}));
    function supportAt(x) {
      let best = null;
      for (const p of tops) {
        if (x >= p.x - 2 && x <= p.x + p.w + 2) {
          if (best === null || p.y < best) best = p.y;
        }
      }
      return best;
    }
    (lv.doors || []).forEach(d => {
      const cx = d.x + d.w / 2;
      const base = d.y + d.h;
      const sup = supportAt(cx);
      const near = (lv.decor || []).filter(o => Math.abs(o.x - cx) < 55).map(o => o.type + '@' + Math.round(o.x));
      out.push({lvl: li + 1, kind: 'door', id: d.id, base, support: sup, ok: sup !== null && Math.abs(sup - base) <= 2, near});
    });
    (lv.devices || []).forEach(d => {
      const sup = supportAt(d.x);
      if (d.type === 'altar') {
        out.push({lvl: li + 1, kind: 'altar', id: d.id, base: d.y, support: sup, ok: sup !== null && Math.abs(sup - d.y) <= 2});
      } else {
        out.push({lvl: li + 1, kind: 'device', id: d.id, base: d.y, support: sup, ok: sup !== null && Math.abs(sup - d.y) <= 2});
      }
    });
    (lv.bridges || []).forEach(b => {
      const first = b.pieces[0], last = b.pieces[b.pieces.length - 1];
      const start = first.x, end = last.x + last.w;
      const midSupport = supportAt((start + end) / 2);
      const edges = [supportAt(start - 6), supportAt(end + 6)];
      out.push({lvl: li + 1, kind: 'bridge', id: b.id, span: [start, end], deck: first.y, aboveGap: midSupport === null, edgeSupports: edges});
    });
    (lv.moving || []).forEach(m => {
      out.push({lvl: li + 1, kind: 'lift', id: m.id, x: m.x, minY: m.y - m.range, maxY: m.y + m.range});
    });
    (lv.shards || []).forEach(s => {
      out.push({lvl: li + 1, kind: 'shard', id: s.id, x: s.x, y: s.y, supportBelow: supportAt(s.x)});
    });
  });
  return out;
}
"""

with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    pg = b.new_context(viewport={"width": 1280, "height": 800}).new_page()
    pg.goto("http://127.0.0.1:8123/index.html", wait_until="load")
    pg.wait_for_timeout(2000)
    data = pg.evaluate(CHECKS)
    for row in data:
        print(json.dumps(row, ensure_ascii=False))
    b.close()
