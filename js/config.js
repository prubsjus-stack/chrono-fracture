(function () {
  'use strict';

  var CF = window.CF = window.CF || {};

  CF.VERSION = '1.0.0';
  CF.TITLE = 'CHRONO FRACTURE';

  CF.characters = [
    {
      id: 'p1',
      slot: 1,
      accent: '#52f0e6',
      accentRgb: '82,240,230',
      tint: 'rgba(20,200,210,.42)',
      nameKey: 'char.p1.name',
      shortKey: 'char.p1.short',
      roleKey: 'char.p1.role',
      descKey: 'char.p1.desc',
      abilityKey: 'char.p1.abilityName',
      abilityDescKey: 'char.p1.abilityDesc',
      ability: 'echo',
      abilityDuration: 10,
      abilityCooldown: 4,
      speed: 232,
      jump: 610,
      sprite: 'mudo'
    },
    {
      id: 'p2',
      slot: 2,
      accent: '#ffbf5e',
      accentRgb: '255,191,94',
      tint: 'rgba(255,150,40,.38)',
      nameKey: 'char.p2.name',
      shortKey: 'char.p2.short',
      roleKey: 'char.p2.role',
      descKey: 'char.p2.desc',
      abilityKey: 'char.p2.abilityName',
      abilityDescKey: 'char.p2.abilityDesc',
      ability: 'resonance',
      abilityDuration: 1.2,
      abilityCooldown: 3,
      speed: 224,
      jump: 600,
      sprite: 'mudo'
    },
    {
      id: 'p3',
      slot: 3,
      accent: '#b98bff',
      accentRgb: '185,139,255',
      tint: null,
      nameKey: 'char.p3.name',
      shortKey: 'char.p3.short',
      roleKey: 'char.p3.role',
      descKey: 'char.p3.desc',
      abilityKey: 'char.p3.abilityName',
      abilityDescKey: 'char.p3.abilityDesc',
      ability: 'glyph',
      abilityDuration: 1,
      abilityCooldown: 2.5,
      speed: 228,
      jump: 605,
      sprite: 'mudo'
    }
  ];

  CF.regions = [
    { id: 'america', labelKey: 'online.region.america', topic: 'america' },
    { id: 'europe', labelKey: 'online.region.europe', topic: 'europe' },
    { id: 'asia', labelKey: 'online.region.asia', topic: 'asia' }
  ];

  CF.difficulties = {
    easy: {
      id: 'easy',
      key: 'common.easy',
      fractureRate: 0.34,
      hazardDamage: 6,
      orbSpeed: 0.72,
      hintLevel: 'full',
      sealWindow: 34,
      echoRadius: 360,
      extraHazards: false
    },
    normal: {
      id: 'normal',
      key: 'common.normal',
      fractureRate: 0.62,
      hazardDamage: 10,
      orbSpeed: 1,
      hintLevel: 'context',
      sealWindow: 27,
      echoRadius: 315,
      extraHazards: false
    },
    hard: {
      id: 'hard',
      key: 'common.hard',
      fractureRate: 1.02,
      hazardDamage: 15,
      orbSpeed: 1.38,
      hintLevel: 'minimal',
      sealWindow: 21,
      echoRadius: 270,
      extraHazards: true
    }
  };

  CF.broker = {
    url: 'wss://broker.hivemq.com:8884/mqtt',
    namespace: 'chronofracture/v2',
    keepalive: 30,
    connectTimeout: 9000,
    reconnectPeriod: 3500,
    roomTTL: 55000,
    presenceTTL: 24000,
    heartbeat: 5000,
    positionInterval: 110,
    publicNote: true
  };

  CF.themes = {
    prehistoria: {
      bg: 'assets/img/bg/prehistoria.jpg',
      platform: '#43362c',
      platformDark: '#241c18',
      platformTop: '#8c7347',
      platformEdge: '#d9a35c',
      accent: '#ffb066',
      accent2: '#52f0e6',
      particle: 'ember',
      fog: 'rgba(255,150,90,.05)',
      nameKey: 'era.1.name'
    },
    antiguedad: {
      bg: 'assets/img/bg/antiguedad.jpg',
      platform: '#4a4357',
      platformDark: '#26222f',
      platformTop: '#8f8598',
      platformEdge: '#d7b98a',
      accent: '#ffbf5e',
      accent2: '#52f0e6',
      particle: 'dust',
      fog: 'rgba(200,170,255,.05)',
      nameKey: 'era.2.name'
    },
    nucleo: {
      bg: null,
      platform: '#232a4d',
      platformDark: '#0b0f24',
      platformTop: '#4c5f9c',
      platformEdge: '#66e0ff',
      accent: '#66e0ff',
      accent2: '#b98bff',
      particle: 'energy',
      fog: 'rgba(90,200,255,.05)',
      nameKey: 'era.3.name'
    }
  };

  CF.credits = [
    { titleKey: 'credits.team', names: [
      'Wilson Alejandro Benitez', 'Aucu Mora Stefanny', 'Gomez Benitez Santiago',
      'Karol juliana villamil', 'Keitlyn Sofia Bedoya', 'Nicolas Herrran Bedoya',
      'Paula Daniela Camelo', 'Santiago mejía villalobos', 'Santiago Garcia fajardo',
      'Jose Daney Arevalo', 'Juan Diego Sierra', 'Nicolas Felipe Quintero',
      'Laura Lozano Benavides', 'José arturo aguirre', 'Karol Daniela zabala',
      'Juan Felipe calvo'
    ], columns: true },
    { titleKey: 'credits.director', names: ['JUSTIN MENDOZA'], big: true },
    { titleKey: 'credits.sound', names: ['Justin Mendoza', 'Aucu Mora', 'Nicolas Quintero', 'Laura Lozano', 'Keitlyn Bedoya', 'Paula Daniela'] },
    { titleKey: 'credits.script', names: ['Santiago Mejia', 'Justin Mendoza', 'Nicolas Quintero'] },
    { titleKey: 'credits.scripting', names: ['Justin Mendoza'] },
    { titleKey: 'credits.ui', names: ['Nicolas Quintero', 'Santiago Garcia', 'Santiago Mejia', 'Justin Mendoza'] },
    { titleKey: 'credits.name', names: ['Santiago Garcia', 'Caro Aucu', 'Juliana Villamil'] },
    { titleKey: 'credits.levels', names: ['Jose Daney Arevalo', 'Juan Diego Sierra', 'José arturo aguirre', 'Juan Felipe calvo'] },
    { titleKey: 'credits.art', names: ['Nicolas Herrran Bedoya', 'Karol Daniela zabala', 'Laura Lozano Benavides'] },
    { titleKey: 'credits.qa', names: ['Juan Felipe calvo', 'Paula Daniela Camelo', 'Keitlyn Sofia Bedoya', 'Nicolas Herrran Bedoya'] },
    { titleKey: 'credits.production', names: ['Wilson Alejandro Benitez', 'Gomez Benitez Santiago'] },
    { titleKey: 'credits.localization', names: ['Aucu Mora Stefanny', 'Karol juliana villamil', 'Laura Lozano Benavides'] },
    { titleKey: 'credits.thanks', names: ['David Merchan', 'Nicolas Quintero', 'Santiago Mejia'] },
    { titleKey: 'credits.special', names: ['Visual Studio Code', 'OpenCode', 'Replit'] },
    { titleKey: 'credits.tools', names: ['OpenCode — desarrollo asistido', 'Visual Studio Code', 'Replit', 'GitHub + GitHub Pages', 'MQTT.js + broker público HiveMQ'] },
    { titleKey: 'credits.engine', names: ['CHRONO ENGINE · HTML5 Canvas 2D / JavaScript', 'Sin dependencias de compilación'] },
    { titleKey: 'credits.final', final: true }
  ];

  CF.audioManifestUrl = 'assets/audio/manifest.json';

  CF.cues = {
    uiHover: 'ui_hover',
    uiClick: 'ui_click',
    uiBack: 'ui_back',
    error: 'ui_error',
    confirm: 'ui_confirm',
    portal: 'portal_open',
    jump: 'player_jump',
    land: 'player_land',
    echo: 'ability_echo',
    resonance: 'ability_resonance',
    glyph: 'ability_glyph',
    shard: 'shard',
    door: 'door_open',
    checkpoint: 'checkpoint',
    collapse: 'fracture_collapse',
    victory: 'victory',
    musicMenu: 'music_menu',
    musicEra1: 'music_era1',
    musicEra2: 'music_era2',
    musicEra3: 'music_era3'
  };

  CF.spriteInfo = {
    filePattern: 'assets/img/char/mudo/frame_0{n}.png',
    frames: 6,
    frameW: 512,
    frameH: 512,
    crop: { x: 80, y: 44, w: 356, h: 468 },
    drawHeight: 49
  };
})();
