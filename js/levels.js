(function () {
  'use strict';

  var CF = window.CF = window.CF || {};

  function P(x, y, w, h, kind) {
    return { x: x, y: y, w: w, h: h, kind: kind || 'stone' };
  }

  var LEVELS = [
    {
      id: 1,
      era: 'prehistoria',
      nameKey: 'era.1.name',
      whenKey: 'era.1.when',
      storyKey: 'era.1.story',
      width: 3320,
      spawn: { x: 96, y: 420 },
      platforms: [
        P(0, 470, 520, 70),
        P(620, 470, 340, 70),
        P(1060, 470, 560, 70),
        P(1700, 470, 200, 70),
        P(1960, 470, 400, 70),
        P(2420, 470, 280, 70),
        P(2880, 470, 440, 70),
        P(360, 392, 110, 16, 'ledge'),
        P(700, 386, 130, 16, 'ledge'),
        P(1120, 440, 80, 14, 'ledge')
      ],
      hidden: [
        P(1150, 405, 92, 14, 'hidden'),
        P(1242, 345, 92, 14, 'hidden'),
        P(1334, 285, 104, 14, 'hidden'),
        P(1442, 225, 116, 14, 'hidden')
      ],
      moving: [],
      plates: [],
      doors: [
        { id: 'gateLink1', type: 'link', pair: 'L1', x: 1934, y: 318, w: 26, h: 152 },
        { id: 'gateGlyph1', type: 'glyph', device: 'glyph1', x: 2178, y: 318, w: 26, h: 152 }
      ],
      devices: [
        { id: 'linkV1', type: 'link', mode: 'orbs', role: 'vision', pair: 'L1', x: 1350, y: 470, label: 'V' },
        { id: 'linkA1', type: 'link', mode: 'orbs', role: 'action', pair: 'L1', x: 1812, y: 470, label: 'A' },
        { id: 'glyph1', type: 'glyph', char: 'p3', x: 2032, y: 470, label: 'G' },
        { id: 'harm1', type: 'harmonic', char: 'p2', x: 2482, y: 470, label: 'R' }
      ],
      bridges: [
        { id: 'bridgeHarm1', device: 'harm1', pieces: [P(2700, 438, 90, 16, 'bridge'), P(2790, 412, 96, 16, 'bridge')] }
      ],
      shards: [
        { id: 's1a', x: 1498, y: 192, hidden: true, requiresEcho: true },
        { id: 's1b', x: 2286, y: 404 },
        { id: 's1c', x: 2846, y: 374 }
      ],
      orbs: [
        { x: 810, y: 340, minX: 760, maxX: 930, speed: 0.85, phase: 0, r: 11 },
        { x: 2450, y: 330, minX: 2390, maxX: 2670, speed: 1.05, phase: 2.1, r: 12 }
      ],
      extraOrbs: [
        { x: 1590, y: 330, minX: 1520, maxX: 1660, speed: 1.2, phase: 1, r: 10 }
      ],
      checkpoints: [
        { x: 96, y: 470 },
        { x: 700, y: 470 },
        { x: 2000, y: 470 },
        { x: 2490, y: 470 }
      ],
      exit: { x: 3220, y: 470 },
      crystals: 3,
      ambience: 'embers',
      decor: [
        { type: 'fern', x: 40, y: 470, s: 1.1 },
        { type: 'rock', x: 145, y: 470, s: 1 },
        { type: 'bone', x: 330, y: 470, s: 1.15 },
        { type: 'fern', x: 442, y: 470, s: 0.9 },
        { type: 'stalagmite', x: 505, y: 470, s: 1.1, flip: true },
        { type: 'vine', x: 380, y: 408, s: 1 },
        { type: 'fern', x: 365, y: 392, s: 0.75 },
        { type: 'mushroom', x: 444, y: 392, s: 0.7 },
        { type: 'fern', x: 735, y: 386, s: 0.8 },
        { type: 'bone', x: 798, y: 386, s: 0.7 },
        { type: 'torch', x: 905, y: 470, s: 1 },
        { type: 'skull', x: 1075, y: 470, s: 1 },
        { type: 'bone', x: 1300, y: 470, s: 0.9, flip: true },
        { type: 'rock', x: 1225, y: 470, s: 0.85 },
        { type: 'mushroom', x: 1400, y: 470, s: 0.85 },
        { type: 'fern', x: 1500, y: 470, s: 1 },
        { type: 'chain', x: 1500, y: 92, s: 0.9 },
        { type: 'lantern', x: 1500, y: 150, s: 0.9 },
        { type: 'fern', x: 1165, y: 440, s: 0.7 },
        { type: 'mushroom', x: 1150, y: 440, s: 0.65 },
        { type: 'torch', x: 1580, y: 470, s: 1 },
        { type: 'fern', x: 1740, y: 470, s: 0.85 },
        { type: 'rock', x: 1850, y: 470, s: 1.1 },
        { type: 'bone', x: 2015, y: 470, s: 0.8 },
        { type: 'bone', x: 2110, y: 470, s: 0.9, flip: true },
        { type: 'fern', x: 2200, y: 470, s: 0.95 },
        { type: 'monolith', x: 2140, y: 470, s: 0.8 },
        { type: 'mushroom', x: 2210, y: 470, s: 0.9 },
        { type: 'skull', x: 2510, y: 470, s: 0.9 },
        { type: 'fern', x: 2450, y: 470, s: 0.8 },
        { type: 'rock', x: 2580, y: 470, s: 0.9 },
        { type: 'torch', x: 2650, y: 470, s: 1 },
        { type: 'fern', x: 2930, y: 470, s: 1.1 },
        { type: 'stalagmite', x: 2900, y: 470, s: 0.95 },
        { type: 'fern', x: 3010, y: 470, s: 0.75 },
        { type: 'bone', x: 3070, y: 470, s: 0.8, flip: true },
        { type: 'rock', x: 3200, y: 470, s: 1 },
        { type: 'fern', x: 3290, y: 470, s: 0.9 },
        { type: 'mushroom', x: 210, y: 470, s: 1.1 },
        { type: 'mushroom', x: 840, y: 470, s: 0.8 },
        { type: 'root', x: 1090, y: 470, s: 1.1 },
        { type: 'fossil', x: 1480, y: 470, s: 1 },
        { type: 'monolith', x: 1880, y: 470, s: 0.9 },
        { type: 'mushroom', x: 2780, y: 470, s: 0.8 },
        { type: 'root', x: 2740, y: 470, s: 1.2, flip: true },
        { type: 'chain', x: 705, y: 92, s: 1 },
        { type: 'lantern', x: 705, y: 150, s: 1 },
        { type: 'chain', x: 2462, y: 70, s: 0.9 },
        { type: 'lantern', x: 2462, y: 128, s: 0.9 },
        { type: 'chain', x: 3060, y: 82, s: 0.85 },
        { type: 'lantern', x: 3060, y: 140, s: 0.85 },
        { type: 'nest', x: 930, y: 470, s: 0.9 },
        { type: 'stalagmite', x: 1620, y: 470, s: 0.85 },
        { type: 'nest', x: 3170, y: 470, s: 0.8, flip: true },
        { type: 'stalagmite', x: 2600, y: 470, s: 1.2 }
      ],
      foreground: [
        { type: 'fern', x: 20, y: 540, s: 1.8, alpha: 0.32 },
        { type: 'rock', x: 310, y: 540, s: 1.6, alpha: 0.28 },
        { type: 'fern', x: 1180, y: 540, s: 1.5, alpha: 0.3 },
        { type: 'rock', x: 1450, y: 540, s: 1.4, alpha: 0.26 },
        { type: 'root', x: 1840, y: 540, s: 1.4, alpha: 0.26, flip: true },
        { type: 'fern', x: 2320, y: 540, s: 1.6, alpha: 0.28 },
        { type: 'fern', x: 2840, y: 540, s: 1.7, alpha: 0.3 },
        { type: 'rock', x: 3280, y: 540, s: 1.5, alpha: 0.26 }
      ]
    },
    {
      id: 2,
      era: 'antiguedad',
      nameKey: 'era.2.name',
      whenKey: 'era.2.when',
      storyKey: 'era.2.story',
      width: 3520,
      spawn: { x: 92, y: 420 },
      platforms: [
        P(0, 470, 420, 70),
        P(520, 470, 300, 70),
        P(900, 470, 380, 70),
        P(1360, 470, 260, 70),
        P(1740, 470, 320, 70),
        P(2180, 470, 300, 70),
        P(2620, 470, 900, 70),
        P(280, 394, 120, 16, 'ledge'),
        P(560, 382, 120, 16, 'ledge'),
        P(760, 322, 100, 16, 'ledge'),
        P(2170, 400, 90, 14, 'ledge')
      ],
      hidden: [
        P(980, 402, 92, 14, 'hidden'),
        P(1072, 342, 92, 14, 'hidden'),
        P(1164, 282, 100, 14, 'hidden'),
        P(1264, 222, 110, 14, 'hidden')
      ],
      moving: [
        { id: 'lift1', x: 2850, y: 392, w: 84, h: 14, axis: 'y', range: 74, speed: 0.8, phase: 0.4 }
      ],
      plates: [],
      doors: [
        { id: 'gateLink2', type: 'link', pair: 'L2', x: 1648, y: 318, w: 26, h: 152 },
        { id: 'gateGlyph2', type: 'glyph', device: 'glyph2', x: 1962, y: 318, w: 26, h: 152 }
      ],
      devices: [
        { id: 'linkV2', type: 'link', mode: 'code', role: 'vision', pair: 'L2', x: 1160, y: 470, label: 'V' },
        { id: 'linkA2', type: 'link', mode: 'code', role: 'action', pair: 'L2', x: 1500, y: 470, label: 'A' },
        { id: 'glyph2', type: 'glyph', char: 'p3', x: 1790, y: 470, label: 'G' },
        { id: 'harm2', type: 'harmonic', char: 'p2', x: 2200, y: 470, label: 'R' }
      ],
      bridges: [
        { id: 'bridgeHarm2', device: 'harm2', pieces: [P(2478, 434, 82, 16, 'bridge'), P(2560, 408, 86, 16, 'bridge')] }
      ],
      shards: [
        { id: 's2a', x: 1318, y: 190, hidden: true, requiresEcho: true },
        { id: 's2b', x: 2072, y: 400 },
        { id: 's2c', x: 2762, y: 326 }
      ],
      orbs: [
        { x: 640, y: 336, minX: 560, maxX: 800, speed: 0.9, phase: 0.7, r: 11 },
        { x: 2260, y: 330, minX: 2200, maxX: 2440, speed: 1.12, phase: 2.4, r: 12 }
      ],
      extraOrbs: [
        { x: 3000, y: 340, minX: 2900, maxX: 3120, speed: 1.25, phase: 1.7, r: 11 }
      ],
      checkpoints: [
        { x: 92, y: 470 },
        { x: 980, y: 470 },
        { x: 2180, y: 470 },
        { x: 2700, y: 470 }
      ],
      exit: { x: 3390, y: 470 },
      crystals: 3,
      ambience: 'dust',
      decor: [
        { type: 'column', x: 180, y: 470, s: 1 },
        { type: 'urn', x: 330, y: 470, s: 1 },
        { type: 'vine', x: 330, y: 410, s: 1 },
        { type: 'urn', x: 310, y: 394, s: 0.6 },
        { type: 'column', x: 620, y: 470, s: 1.1 },
        { type: 'banner', x: 600, y: 398, s: 1 },
        { type: 'column', x: 780, y: 470, s: 0.82 },
        { type: 'statue', x: 1000, y: 470, s: 1.05 },
        { type: 'vine', x: 1010, y: 416, s: 1 },
        { type: 'torch', x: 1200, y: 470, s: 1 },
        { type: 'column', x: 1450, y: 470, s: 0.95 },
        { type: 'urn', x: 1580, y: 470, s: 0.9 },
        { type: 'statue', x: 1850, y: 470, s: 1 },
        { type: 'torch', x: 2020, y: 470, s: 1 },
        { type: 'column', x: 2300, y: 470, s: 1 },
        { type: 'urn', x: 2340, y: 470, s: 0.75 },
        { type: 'vine', x: 2200, y: 414, s: 0.9 },
        { type: 'column', x: 2500, y: 470, s: 1.1 },
        { type: 'statue', x: 2750, y: 470, s: 1.1 },
        { type: 'urn', x: 2900, y: 470, s: 1 },
        { type: 'column', x: 2980, y: 470, s: 0.9 },
        { type: 'torch', x: 3100, y: 470, s: 1 },
        { type: 'arch', x: 3044, y: 470, s: 0.85 },
        { type: 'column', x: 3320, y: 470, s: 1 },
        { type: 'arch', x: 1400, y: 470, s: 0.9 },
        { type: 'monolith', x: 1770, y: 470, s: 1.05 },
        { type: 'lantern', x: 940, y: 170, s: 1 },
        { type: 'chain', x: 875, y: 140, s: 1 },
        { type: 'chain', x: 940, y: 98, s: 1 },
        { type: 'chain', x: 2950, y: 92, s: 0.9 },
        { type: 'lantern', x: 2950, y: 150, s: 0.9 },
        { type: 'arch', x: 2380, y: 470, s: 0.95 },
        { type: 'banner', x: 2240, y: 414, s: 0.85 },
        { type: 'mushroom', x: 1260, y: 470, s: 0.75 },
        { type: 'obelisk', x: 2860, y: 470, s: 0.9 },
        { type: 'fossil', x: 3180, y: 470, s: 0.9 },
        { type: 'brazier', x: 520, y: 470, s: 0.95 },
        { type: 'obelisk', x: 1040, y: 470, s: 0.9 },
        { type: 'brazier', x: 1300, y: 470, s: 0.85, flip: true },
        { type: 'obelisk', x: 2060, y: 470, s: 1 },
        { type: 'brazier', x: 2560, y: 470, s: 0.95 },
        { type: 'brazier', x: 3180, y: 470, s: 0.9, flip: true }
      ],
      foreground: [
        { type: 'column', x: 80, y: 540, s: 1.3, alpha: 0.22 },
        { type: 'arch', x: 1020, y: 540, s: 1.15, alpha: 0.2 },
        { type: 'arch', x: 1600, y: 540, s: 1.1, alpha: 0.2 },
        { type: 'column', x: 2080, y: 540, s: 1.25, alpha: 0.22 },
        { type: 'column', x: 3050, y: 540, s: 1.3, alpha: 0.24 },
        { type: 'urn', x: 3420, y: 540, s: 1.3, alpha: 0.2 }
      ]
    },
    {
      id: 3,
      era: 'nucleo',
      nameKey: 'era.3.name',
      whenKey: 'era.3.when',
      storyKey: 'era.3.story',
      width: 2520,
      spawn: { x: 110, y: 390 },
      platforms: [
        P(40, 440, 280, 100),
        P(340, 410, 120, 18, 'core'),
        P(500, 360, 120, 18, 'core'),
        P(660, 320, 140, 18, 'core'),
        P(840, 380, 120, 18, 'core'),
        P(1000, 340, 140, 18, 'core'),
        P(1180, 300, 140, 18, 'core'),
        P(1360, 360, 120, 18, 'core'),
        P(1520, 320, 140, 18, 'core'),
        P(1700, 380, 120, 18, 'core'),
        P(1860, 340, 140, 18, 'core'),
        P(2040, 400, 160, 18, 'core'),
        P(2240, 440, 280, 100, 'core')
      ],
      hidden: [],
      moving: [
        { id: 'lift2', x: 890, y: 260, w: 70, h: 12, axis: 'y', range: 58, speed: 0.7, phase: 1.2 }
      ],
      plates: [],
      doors: [],
      devices: [
        { id: 'altarEcho', type: 'altar', char: 'p1', x: 730, y: 320, label: '1' },
        { id: 'altarHarm', type: 'altar', char: 'p2', x: 1250, y: 300, label: '2' },
        { id: 'altarGlyph', type: 'altar', char: 'p3', x: 1930, y: 340, label: '3' }
      ],
      bridges: [],
      shards: [],
      orbs: [
        { x: 900, y: 300, minX: 850, maxX: 1100, speed: 1.15, phase: 0.4, r: 10 },
        { x: 1600, y: 300, minX: 1500, maxX: 1800, speed: 1.25, phase: 2.2, r: 10 }
      ],
      extraOrbs: [
        { x: 2000, y: 300, minX: 1950, maxX: 2200, speed: 1.5, phase: 1.1, r: 10 }
      ],
      checkpoints: [
        { x: 110, y: 440 },
        { x: 560, y: 360 },
        { x: 1060, y: 340 },
        { x: 1760, y: 380 },
        { x: 2300, y: 440 }
      ],
      exit: { x: 2380, y: 440 },
      crystals: 0,
      isFinal: true,
      sealWindow: true,
      ambience: 'energy',
      decor: [
        { type: 'pylon', x: 370, y: 410, s: 0.75 },
        { type: 'crystal', x: 440, y: 410, s: 0.7 },
        { type: 'rune', x: 540, y: 360, s: 0.75 },
        { type: 'pylon', x: 690, y: 320, s: 0.7 },
        { type: 'crystal', x: 860, y: 380, s: 0.8 },
        { type: 'holo', x: 1030, y: 200, s: 1 },
        { type: 'crystal', x: 1200, y: 300, s: 0.65 },
        { type: 'rune', x: 1390, y: 360, s: 0.7 },
        { type: 'pylon', x: 1550, y: 320, s: 0.75 },
        { type: 'rune', x: 1750, y: 380, s: 0.7 },
        { type: 'crystal', x: 1900, y: 340, s: 0.7 },
        { type: 'holo', x: 2000, y: 170, s: 0.8 },
        { type: 'pylon', x: 2260, y: 440, s: 0.8 },
        { type: 'crystal', x: 2320, y: 440, s: 0.7 },
        { type: 'cable', x: 270, y: 100, x2: 880, y2: 120, s: 1 },
        { type: 'cable', x: 1120, y: 60, x2: 1620, y2: 80, s: 1 },
        { type: 'cable', x: 1840, y: 70, x2: 2260, y2: 90, s: 1 },
        { type: 'terminal', x: 460, y: 410, s: 0.9 },
        { type: 'terminal', x: 1460, y: 360, s: 0.85 },
        { type: 'terminal', x: 2160, y: 400, s: 0.9 },
        { type: 'beacon', x: 590, y: 360, s: 0.9 },
        { type: 'beacon', x: 1640, y: 320, s: 0.8 },
        { type: 'chain', x: 300, y: 80, s: 1.2 },
        { type: 'chain', x: 1320, y: 54, s: 1 },
        { type: 'chain', x: 2100, y: 74, s: 1.1 },
        { type: 'monolith', x: 1080, y: 340, s: 0.8 },
        { type: 'holo', x: 720, y: 120, s: 0.7 },
        { type: 'crystal', x: 1410, y: 360, s: 0.6 },
        { type: 'drone', x: 760, y: 150, s: 0.85 },
        { type: 'drone', x: 1540, y: 118, s: 0.7, flip: true },
        { type: 'drone', x: 2180, y: 156, s: 0.9 },
        { type: 'vent', x: 1015, y: 340, s: 0.8 },
        { type: 'vent', x: 1740, y: 380, s: 0.9, flip: true },
        { type: 'vent', x: 2140, y: 400, s: 0.8 }
      ],
      foreground: [
        { type: 'chain', x: 180, y: 0, s: 1.4, alpha: 0.3 },
        { type: 'chain', x: 1160, y: 0, s: 1.2, alpha: 0.26 },
        { type: 'beacon', x: 2380, y: 440, s: 1.2, alpha: 0.22 },
        { type: 'crystal', x: 2500, y: 440, s: 1.1, alpha: 0.24 }
      ]
    }
  ];

  function get(index) { return LEVELS[index] || null; }

  window.CF.levels = LEVELS;
  window.CF.getLevel = get;
})();
