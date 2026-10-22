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
      plates: [
        { id: 'plA', x: 1712, y: 462, w: 46, h: 8 },
        { id: 'plB', x: 1812, y: 462, w: 46, h: 8 }
      ],
      doors: [
        { id: 'gatePlates1', type: 'plates', plates: ['plA', 'plB'], x: 1934, y: 318, w: 26, h: 152 },
        { id: 'gateGlyph1', type: 'glyph', device: 'glyph1', x: 2178, y: 318, w: 26, h: 152 }
      ],
      devices: [
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
      ambience: 'embers'
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
      plates: [
        { id: 'plC', x: 1432, y: 462, w: 46, h: 8 },
        { id: 'plD', x: 1532, y: 462, w: 46, h: 8 }
      ],
      doors: [
        { id: 'gatePlates2', type: 'plates', plates: ['plC', 'plD'], x: 1648, y: 318, w: 26, h: 152 },
        { id: 'gateGlyph2', type: 'glyph', device: 'glyph2', x: 1962, y: 318, w: 26, h: 152 }
      ],
      devices: [
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
      ambience: 'dust'
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
      ambience: 'energy'
    }
  ];

  function get(index) { return LEVELS[index] || null; }

  window.CF.levels = LEVELS;
  window.CF.getLevel = get;
})();
