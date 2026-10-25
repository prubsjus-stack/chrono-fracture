/* FRECUENCIA ROTA · configuración global (v2.0.0) */
(function () {
  'use strict';

  var CF = window.CF = window.CF || {};

  CF.VERSION = '2.0.1';
  CF.TITLE = 'FRECUENCIA ROTA';
  CF.SUBTITLE = 'un juego de cartas sobre lo que no se puede decir';

  CF.MIN_PLAYERS = 3;
  CF.MAX_PLAYERS = 8;
  CF.CELLS = 30;
  CF.ROUNDS = 5;

  CF.HAND_CARDS = 6;
  CF.HAND_WORDS = 5;
  CF.TABLE_CARDS = 5;

  CF.CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  CF.CODE_LENGTH = 4;

  /* Duraciones en segundos. La ronda se cierra antes si todos han actuado. */
  CF.TIMERS = {
    clue: 75,
    submit: 45,
    vote: 40,
    score: 9,
    trade: 20
  };

  CF.TIMERS_FAST = {
    clue: 22,
    submit: 16,
    vote: 14,
    score: 4,
    trade: 8
  };

  CF.timers = function () {
    var fast = false;
    try {
      fast = /(^|[?&])fast=1/.test(window.location.search);
    } catch (e) {}
    var t = fast ? CF.TIMERS_FAST : CF.TIMERS;
    return { clue: t.clue, submit: t.submit, vote: t.vote, score: t.score, trade: t.trade };
  };

  CF.broker = {
    url: 'wss://broker.hivemq.com:8884/mqtt',
    namespace: 'brokenfrequency/cards/v2',
    keepalive: 30,
    connectTimeout: 9000,
    reconnectPeriod: 3000,
    presenceEvery: 4000,
    hostHeartbeatEvery: 2500,
    hostSilenceLimit: 14000,
    dropAfter: 13000
  };

  /* Los tres personajes canónicos del juego, intactos. */
  CF.characters = [
    {
      id: 'vigia', name: 'VIGÍA', tag: 'P1', role: 'CIENTÍFICA · NO VE',
      line: 'Percibe el mundo por ecos. En la mesa adivina lo que nadie dice.',
      accent: '#7ee7ff', frame: 1, hue: 0, eco: false
    },
    {
      id: 'sonar', name: 'SÓNAR', tag: 'P2', role: 'CIENTÍFICO · NO OYE',
      line: 'Todo sonido se vuelve señal. Lee las palabras como vibraciones.',
      accent: '#ffb066', frame: 2, hue: 0, eco: false
    },
    {
      id: 'glifo', name: 'GLIFO', tag: 'P3', role: 'CIENTÍFICO · NO HABLA',
      line: 'Se comunica con glifos de luz. Una sola palabra le basta.',
      accent: '#b98cff', frame: 3, hue: 0, eco: false
    },
    {
      id: 'pulso', name: 'ECO · PULSO', tag: 'P4', role: 'ECO DE SÓNAR',
      line: 'Marca el compás de la mesa. Escucha con las manos.',
      accent: '#4fd1c5', frame: 4, hue: 0, eco: true
    },
    {
      id: 'ambar', name: 'ECO · ÁMBAR', tag: 'P5', role: 'ECO DE VIGÍA',
      line: 'Guarda el calor de las respuestas. Recuerda lo que otros olvidan.',
      accent: '#ffd166', frame: 5, hue: 0, eco: true
    },
    {
      id: 'jade', name: 'ECO · JADE', tag: 'P6', role: 'ECO DE GLIFO',
      line: 'Repite en voz baja lo que nadie se atreve a decir.',
      accent: '#8ee36b', frame: 6, hue: 0, eco: true
    },
    {
      id: 'magenta', name: 'ECO · MAGENTA', tag: 'P7', role: 'ECO SIN ORIGEN',
      line: 'Colecciona palabras rotas y las devuelve cambiadas.',
      accent: '#ff7ac8', frame: 4, hue: 300, eco: true
    },
    {
      id: 'zafiro', name: 'ECO · ZAFIRO', tag: 'P8', role: 'ECO TARDÍO',
      line: 'Llega siempre después del silencio. Su turno es el último.',
      accent: '#6f8bff', frame: 5, hue: 195, eco: true
    }
  ];

  CF.seatColors = ['#7ee7ff', '#ffb066', '#b98cff', '#4fd1c5', '#ffd166', '#8ee36b', '#ff7ac8', '#6f8bff'];

  CF.character = function (id) {
    for (var i = 0; i < CF.characters.length; i++) {
      if (CF.characters[i].id === id) return CF.characters[i];
    }
    return CF.characters[0];
  };

  CF.seatColor = function (seat) {
    return CF.seatColors[((seat | 0) % CF.seatColors.length + CF.seatColors.length) % CF.seatColors.length];
  };

  CF.sprite = function (charId) {
    var c = CF.character(charId);
    var n = ('0' + c.frame).slice(-2);
    return 'assets/img/char/mudo/frame_' + n + '.png';
  };

  CF.phaseLabels = {
    lobby: 'SALA DE ESPERA',
    clue: 'EL NARRADOR ELIGE',
    submit: 'ENVÍO SECRETO',
    vote: 'VOTACIÓN',
    score: 'RECUENTO',
    trade: 'TRUEQUE',
    results: 'RESULTADOS'
  };

  CF.storageKey = 'fr.v2.profile';

  CF.loadProfile = function () {
    try {
      var raw = window.localStorage.getItem(CF.storageKey);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return null;
      return p;
    } catch (e) {
      return null;
    }
  };

  CF.saveProfile = function (p) {
    try {
      window.localStorage.setItem(CF.storageKey, JSON.stringify(p));
    } catch (e) {}
  };

  CF.pid = function () {
    var key = 'fr.v2.pid';
    try {
      var v = window.sessionStorage.getItem(key);
      if (v) return v;
      var r = 'p' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
      window.sessionStorage.setItem(key, r);
      return r;
    } catch (e) {
      return 'p' + Math.random().toString(36).slice(2, 10);
    }
  };

  CF.code = function () {
    var out = '';
    for (var i = 0; i < CF.CODE_LENGTH; i++) {
      out += CF.CODE_ALPHABET.charAt(Math.floor(Math.random() * CF.CODE_ALPHABET.length));
    }
    return out;
  };

  CF.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  CF.clamp = function (v, a, b) {
    return Math.max(a, Math.min(b, v));
  };
})();
