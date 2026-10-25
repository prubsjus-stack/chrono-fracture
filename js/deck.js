/* FRECUENCIA ROTA · mazos e ilustraciones SVG originales */
(function () {
  'use strict';

  var CF = window.CF = window.CF || {};

  /* ---------- utilidades ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function rr(r, a, b) { return a + r() * (b - a); }
  function fx(n, d) { return n.toFixed(d == null ? 1 : d); }

  function stars(r, p, n, maxY) {
    var s = '';
    for (var i = 0; i < n; i++) {
      s += '<circle cx="' + fx(rr(r, 8, 292)) + '" cy="' + fx(rr(r, 8, maxY || 250)) +
        '" r="' + fx(rr(r, 0.5, 1.7)) + '" fill="' + p.line + '" opacity="' +
        fx(rr(r, 0.12, 0.62), 2) + '"/>';
    }
    return s;
  }

  function glowCircle(cx, cy, rad, color, o1, o2, o3) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (rad * 2.1) + '" fill="' + color + '" opacity="' + (o3 || 0.05) + '"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (rad * 1.4) + '" fill="' + color + '" opacity="' + (o2 || 0.09) + '"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad + '" fill="' + color + '" opacity="' + (o1 || 0.8) + '"/>';
  }

  function mist(r, p, y) {
    var s = '';
    for (var i = 0; i < 3; i++) {
      s += '<ellipse cx="' + fx(rr(r, 80, 220)) + '" cy="' + fx(y + i * 18) + '" rx="' + fx(rr(r, 80, 150)) +
        '" ry="' + fx(rr(r, 5, 11)) + '" fill="' + p.mist + '" opacity="0.22"/>';
    }
    return s;
  }

  /* ---------- paletas ---------- */
  var palettes = [
    {
      id: 'noche', bg: '#0a1520', deep: '#122436', ink: '#03080d',
      glow: '#7ee7ff', warm: '#f0c98a', accent: '#b98cff', mist: '#28455e', line: '#e9f7ff'
    },
    {
      id: 'ambar', bg: '#180f08', deep: '#2a1c11', ink: '#080402',
      glow: '#ffb066', warm: '#ffe0a3', accent: '#d9794a', mist: '#4a301c', line: '#fff3df'
    },
    {
      id: 'jade', bg: '#0a1712', deep: '#123024', ink: '#030a07',
      glow: '#8ee3a8', warm: '#e8d8a8', accent: '#4fd1c5', mist: '#1e4536', line: '#effff6'
    },
    {
      id: 'violeta', bg: '#130e1c', deep: '#241a34', ink: '#05030a',
      glow: '#c2a6ff', warm: '#f0c9d8', accent: '#ff7ac8', mist: '#3a2c52', line: '#fbf1ff'
    }
  ];

  var neutralPalette = {
    id: 'neutro', bg: '#101010', deep: '#1c1c1c', ink: '#050505',
    glow: '#c9c9c9', warm: '#ded6c6', accent: '#8f8f8f', mist: '#2d2d2d', line: '#f2f2f2'
  };

  /* ---------- motivos ilustrados ---------- */
  var motifs = [
    {
      id: 'luna',
      draw: function (r, p) {
        var out = stars(r, p, 30, 240);
        var refl = '';
        for (var j = 0; j < 8; j++) {
          refl += '<rect x="' + fx(rr(r, 92, 190), 0) + '" y="' + (300 + j * 12) + '" width="' +
            fx(rr(r, 18, 90), 0) + '" height="2.6" rx="1.3" fill="' + p.warm + '" opacity="' +
            fx(0.30 - j * 0.032, 2) + '"/>';
        }
        out += glowCircle(150, 148, 62, p.warm, 0.92, 0.10, 0.045);
        out += '<circle cx="150" cy="148" r="62" fill="' + p.warm + '" opacity=".92"/>';
        out += '<circle cx="128" cy="128" r="13" fill="' + p.deep + '" opacity=".22"/>';
        out += '<circle cx="170" cy="166" r="9" fill="' + p.deep + '" opacity=".18"/>';
        out += '<circle cx="150" cy="148" r="84" fill="none" stroke="' + p.glow + '" stroke-opacity=".22"/>';
        out += '<path d="M0 282 Q75 264 150 280 T300 279 L300 420 L0 420Z" fill="' + p.ink + '" opacity=".75"/>';
        out += refl;
        out += '<path d="M0 282 Q75 264 150 280 T300 279" fill="none" stroke="' + p.glow + '" stroke-opacity=".3" stroke-width="1.4"/>';
        return out;
      }
    },
    {
      id: 'escalera',
      draw: function (r, p) {
        var out = stars(r, p, 18, 200);
        out += '<circle cx="150" cy="128" r="72" fill="' + p.deep + '" opacity=".8"/>';
        out += '<circle cx="150" cy="128" r="72" fill="none" stroke="' + p.glow + '" stroke-opacity=".25"/>';
        out += '<path d="M112 128 L112 78 Q150 44 188 78 L188 128Z" fill="' + p.ink + '" opacity=".85"/>';
        out += '<rect x="128" y="86" width="44" height="42" fill="' + p.glow + '" opacity=".18"/>';
        for (var i = 0; i < 8; i++) {
          var w = 210 - i * 22;
          var x = 150 - w / 2;
          var y = 330 - i * 24;
          out += '<rect x="' + fx(x) + '" y="' + y + '" width="' + fx(w) + '" height="13" fill="' + p.deep + '"/>';
          out += '<rect x="' + fx(x) + '" y="' + y + '" width="' + fx(w) + '" height="2.4" fill="' + p.line + '" opacity=".30"/>';
        }
        out += '<path d="M0 344 L300 344 L300 420 L0 420Z" fill="' + p.ink + '" opacity=".9"/>';
        out += mist(r, p, 300);
        return out;
      }
    },
    {
      id: 'puerta',
      draw: function (r, p) {
        var out = stars(r, p, 14, 220);
        out += '<path d="M74 356 L74 190 Q150 96 226 190 L226 356Z" fill="' + p.ink + '" opacity=".92"/>';
        out += '<path d="M94 356 L94 198 Q150 124 206 198 L206 356Z" fill="none" stroke="' + p.glow + '" stroke-opacity=".45" stroke-width="2"/>';
        out += '<path d="M112 356 L112 210 Q150 166 188 210 L188 356Z" fill="' + p.glow + '" opacity=".10"/>';
        out += '<circle cx="150" cy="250" r="13" fill="' + p.ink + '"/>';
        out += '<rect x="147" y="252" width="6" height="26" rx="3" fill="' + p.ink + '"/>';
        out += '<circle cx="150" cy="250" r="7" fill="none" stroke="' + p.warm + '" stroke-opacity=".8" stroke-width="1.6"/>';
        out += '<rect x="40" y="356" width="220" height="64" fill="' + p.deep + '"/>';
        out += '<rect x="94" y="352" width="112" height="7" fill="' + p.warm + '" opacity=".45"/>';
        out += '<path d="M0 356 L40 356 M260 356 L300 356" stroke="' + p.line + '" stroke-opacity=".2"/>';
        out += '<path d="M150 96 L150 60 M136 74 L164 74" stroke="' + p.glow + '" stroke-opacity=".5" stroke-width="1.4"/>';
        return out;
      }
    },
    {
      id: 'ojo',
      draw: function (r, p) {
        var out = stars(r, p, 16, 120);
        out += '<path d="M30 210 Q150 92 270 210 Q150 328 30 210Z" fill="' + p.ink + '" opacity=".92"/>';
        out += '<path d="M30 210 Q150 92 270 210 Q150 328 30 210Z" fill="none" stroke="' + p.line + '" stroke-opacity=".5" stroke-width="1.6"/>';
        out += '<circle cx="150" cy="210" r="54" fill="' + p.deep + '"/>';
        out += '<circle cx="150" cy="210" r="54" fill="none" stroke="' + p.glow + '" stroke-opacity=".5" stroke-width="2"/>';
        out += '<circle cx="150" cy="210" r="30" fill="' + p.glow + '" opacity=".55"/>';
        out += '<circle cx="150" cy="210" r="15" fill="' + p.ink + '"/>';
        out += '<circle cx="140" cy="199" r="5" fill="' + p.line + '" opacity=".8"/>';
        for (var i = 0; i < 24; i++) {
          var a = i * Math.PI * 2 / 24;
          var x1 = 150 + Math.cos(a) * 66, y1 = 210 + Math.sin(a) * 66;
          var x2 = 150 + Math.cos(a) * 78, y2 = 210 + Math.sin(a) * 78;
          out += '<line x1="' + fx(x1) + '" y1="' + fx(y1) + '" x2="' + fx(x2) + '" y2="' + fx(y2) +
            '" stroke="' + p.warm + '" stroke-opacity=".25"/>';
        }
        out += '<path d="M150 300 C150 340 128 352 112 366" stroke="' + p.glow + '" stroke-opacity=".45" stroke-width="2" fill="none"/>';
        out += '<circle cx="112" cy="368" r="3.4" fill="' + p.glow + '" opacity=".7"/>';
        return out;
      }
    },
    {
      id: 'bosque',
      draw: function (r, p) {
        var out = '<rect width="300" height="420" fill="' + p.bg + '"/>';
        out += '<circle cx="224" cy="112" r="42" fill="' + p.warm + '" opacity=".32"/>';
        for (var i = 0; i < 12; i++) {
          var x = rr(r, -10, 300);
          var w = rr(r, 5, 17);
          var top = rr(r, 40, 190);
          out += '<rect x="' + fx(x) + '" y="' + fx(top) + '" width="' + fx(w) + '" height="' + fx(420 - top) +
            '" fill="' + (i % 3 === 0 ? p.ink : p.deep) + '" opacity="' + fx(rr(r, 0.55, 0.95), 2) + '"/>';
        }
        out += '<rect y="392" width="300" height="28" fill="' + p.ink + '" opacity=".9"/>';
        out += mist(r, p, 250);
        out += mist(r, p, 310);
        out += '<path d="M0 392 L300 392" stroke="' + p.glow + '" stroke-opacity=".25"/>';
        return out;
      }
    },
    {
      id: 'puente',
      draw: function (r, p) {
        var out = stars(r, p, 22, 150);
        out += '<circle cx="72" cy="112" r="30" fill="' + p.warm + '" opacity=".28"/>';
        out += '<path d="M8 268 Q150 160 292 268" fill="none" stroke="' + p.ink + '" stroke-width="16" opacity=".9"/>';
        out += '<path d="M8 268 Q150 176 292 268" fill="none" stroke="' + p.warm + '" stroke-width="5" opacity=".7"/>';
        for (var i = 0; i <= 8; i++) {
          var t = i / 8;
          var x = 8 + t * 284;
          var y = 268 - Math.sin(t * Math.PI) * 92;
          out += '<line x1="' + fx(x) + '" y1="' + fx(y) + '" x2="' + fx(x) + '" y2="' + fx(y - 22) +
            '" stroke="' + p.ink + '" stroke-width="2.4" opacity=".8"/>';
          if (i % 2 === 0) out += '<circle cx="' + fx(x) + '" cy="' + fx(y - 24) + '" r="2.2" fill="' + p.glow + '" opacity=".7"/>';
        }
        out += '<path d="M8 268 Q150 176 292 268" fill="none" stroke="' + p.glow + '" stroke-opacity=".35" stroke-width="1.4"/>';
        var waves = '';
        for (var j = 0; j < 5; j++) {
          var wy = 320 + j * 18;
          waves += '<path d="M0 ' + wy + ' Q38 ' + (wy - 8) + ' 76 ' + wy + ' T152 ' + wy + ' T228 ' + wy + ' T300 ' + wy +
            '" fill="none" stroke="' + p.glow + '" stroke-opacity="' + fx(0.22 - j * 0.03, 2) + '" stroke-width="1.6"/>';
        }
        out += waves;
        out += mist(r, p, 300);
        return out;
      }
    },
    {
      id: 'hilo',
      draw: function (r, p) {
        var out = '<rect width="300" height="420" fill="' + p.bg + '"/>';
        out += '<ellipse cx="150" cy="150" rx="96" ry="58" fill="none" stroke="' + p.glow + '" stroke-opacity=".22"/>';
        out += '<ellipse cx="150" cy="150" rx="64" ry="36" fill="none" stroke="' + p.glow + '" stroke-opacity=".12"/>';
        out += '<path d="M66 348 C118 296 92 236 150 208 C208 180 190 120 236 76" fill="none" stroke="' + p.warm + '" stroke-width="2.6" stroke-opacity=".85"/>';
        out += '<path d="M64 344 C128 306 106 236 156 214 C214 188 200 130 244 84" fill="none" stroke="' + p.glow + '" stroke-width="1.2" stroke-opacity=".45"/>';
        out += '<rect x="40" y="330" width="52" height="60" rx="10" fill="' + p.deep + '" transform="rotate(-12 66 360)"/>';
        out += '<rect x="46" y="338" width="40" height="42" rx="6" fill="' + p.warm + '" opacity=".55" transform="rotate(-12 66 360)"/>';
        out += '<path d="M240 64 L252 88 L232 80 Z" fill="' + p.line + '" opacity=".8"/>';
        out += '<circle cx="240" cy="64" r="3" fill="none" stroke="' + p.line + '" stroke-opacity=".7"/>';
        out += stars(r, p, 12, 120);
        out += mist(r, p, 372);
        return out;
      }
    },
    {
      id: 'torre',
      draw: function (r, p) {
        var out = stars(r, p, 36, 280);
        out += '<path d="M108 380 L122 168 L178 168 L192 380Z" fill="' + p.ink + '" opacity=".95"/>';
        out += '<path d="M122 168 L178 168 L186 132 L114 132Z" fill="' + p.deep + '"/>';
        out += '<path d="M114 132 L186 132 L170 108 L130 108Z" fill="' + p.ink + '"/>';
        out += '<circle cx="150" cy="118" r="5" fill="' + p.glow + '" opacity=".85"/>';
        for (var i = 0; i < 5; i++) {
          out += '<rect x="136" y="' + (178 + i * 30) + '" width="14" height="18" rx="7" fill="' + p.warm + '" opacity="' +
            fx(0.55 - i * 0.06, 2) + '"/>';
          out += '<rect x="154" y="' + (196 + i * 22) + '" width="9" height="12" rx="4" fill="' + p.glow + '" opacity="' +
            fx(0.3 - i * 0.03, 2) + '"/>';
        }
        out += '<path d="M90 380 Q150 352 210 380 L210 420 L90 420Z" fill="' + p.ink + '" opacity=".9"/>';
        out += '<path d="M0 380 Q52 364 90 380 M210 380 Q252 364 300 380" fill="none" stroke="' + p.line + '" stroke-opacity=".16"/>';
        out += '<circle cx="150" cy="118" r="26" fill="' + p.glow + '" opacity=".07"/>';
        return out;
      }
    },
    {
      id: 'aves',
      draw: function (r, p) {
        var out = '<rect width="300" height="420" fill="' + p.bg + '"/>';
        out += glowCircle(196, 268, 62, p.warm, 0.55, 0.09, 0.04);
        out += '<rect y="300" width="300" height="120" fill="' + p.ink + '" opacity=".55"/>';
        out += '<circle cx="196" cy="268" r="62" fill="' + p.warm + '" opacity=".55"/>';
        for (var i = 0; i < 16; i++) {
          var x = rr(r, 20, 270);
          var y = rr(r, 40, 250);
          var s = rr(r, 0.5, 1.5);
          out += '<path d="M' + fx(x) + ' ' + fx(y) + ' q' + fx(7 * s) + ' ' + fx(-7 * s) + ' ' + fx(14 * s) + ' 0' +
            ' q' + fx(7 * s) + ' ' + fx(-7 * s) + ' ' + fx(14 * s) + ' 0" fill="none" stroke="' + p.line +
            '" stroke-opacity="' + fx(rr(r, 0.3, 0.8), 2) + '" stroke-width="' + fx(rr(r, 1, 2), 1) + '"/>';
        }
        out += '<path d="M0 300 Q76 286 150 300 T300 300" fill="none" stroke="' + p.glow + '" stroke-opacity=".3"/>';
        out += mist(r, p, 340);
        return out;
      }
    },
    {
      id: 'engranaje',
      draw: function (r, p) {
        var out = '<rect width="300" height="420" fill="' + p.bg + '"/>';
        out += stars(r, p, 20, 200);
        out += '<circle cx="150" cy="212" r="96" fill="none" stroke="' + p.deep + '" stroke-width="18"/>';
        out += '<circle cx="150" cy="212" r="96" fill="none" stroke="' + p.glow + '" stroke-opacity=".3" stroke-width="1.4"/>';
        for (var i = 0; i < 18; i++) {
          var a = i * Math.PI * 2 / 18;
          out += '<rect x="146" y="104" width="8" height="22" fill="' + p.deep + '" transform="rotate(' +
            fx(a * 180 / Math.PI) + ' 150 212)"/>';
        }
        out += '<circle cx="150" cy="212" r="48" fill="' + p.ink + '" opacity=".9"/>';
        out += '<circle cx="150" cy="212" r="48" fill="none" stroke="' + p.warm + '" stroke-opacity=".5" stroke-width="1.6"/>';
        for (var j = 0; j < 6; j++) {
          var b = j * Math.PI / 3;
          out += '<line x1="150" y1="212" x2="' + fx(150 + Math.cos(b) * 42) + '" y2="' + fx(212 + Math.sin(b) * 42) +
            '" stroke="' + p.warm + '" stroke-opacity=".35" stroke-width="3"/>';
        }
        out += '<circle cx="150" cy="212" r="10" fill="' + p.glow + '" opacity=".8"/>';
        out += '<line x1="150" y1="316" x2="150" y2="374" stroke="' + p.warm + '" stroke-opacity=".5" stroke-width="2"/>';
        out += '<circle cx="150" cy="380" r="15" fill="' + p.deep + '" stroke="' + p.warm + '" stroke-opacity=".5"/>';
        return out;
      }
    },
    {
      id: 'vela',
      draw: function (r, p) {
        var out = stars(r, p, 15, 200);
        out += glowCircle(150, 178, 52, p.warm, 0.20, 0.10, 0.05);
        out += '<path d="M150 118 C176 152 186 172 172 194 C162 210 138 210 128 194 C114 172 124 152 150 118Z" fill="' + p.warm + '" opacity=".92"/>';
        out += '<path d="M150 142 C162 162 166 176 158 188 C152 197 144 196 139 188 C132 176 138 160 150 142Z" fill="' + p.line + '" opacity=".75"/>';
        out += '<rect x="128" y="200" width="44" height="132" rx="5" fill="' + p.deep + '"/>';
        out += '<rect x="128" y="200" width="44" height="9" fill="' + p.warm + '" opacity=".5"/>';
        out += '<path d="M172 214 q10 22 4 34 q-4 8 -10 6" fill="none" stroke="' + p.warm + '" stroke-opacity=".6" stroke-width="3"/>';
        out += '<rect x="104" y="332" width="92" height="10" rx="4" fill="' + p.ink + '"/>';
        out += '<ellipse cx="150" cy="352" rx="70" ry="10" fill="' + p.warm + '" opacity=".10"/>';
        out += '<path d="M0 372 Q75 360 150 372 T300 372 L300 420 L0 420Z" fill="' + p.ink + '" opacity=".8"/>';
        return out;
      }
    },
    {
      id: 'ola',
      draw: function (r, p) {
        var out = stars(r, p, 24, 160);
        out += glowCircle(222, 106, 34, p.warm, 0.6, 0.10, 0.04);
        for (var i = 0; i < 6; i++) {
          var y = 230 + i * 28;
          out += '<path d="M-10 ' + y + ' Q60 ' + (y - 34) + ' 130 ' + y + ' T270 ' + y + ' T420 ' + y +
            '" fill="none" stroke="' + (i % 2 ? p.glow : p.deep) + '" stroke-opacity="' + fx(0.42 - i * 0.05, 2) +
            '" stroke-width="' + fx(2.6 - i * 0.2, 1) + '"/>';
        }
        out += '<path d="M128 258 L182 258 L156 300Z" fill="' + p.ink + '" opacity=".92"/>';
        out += '<path d="M155 232 L155 258" stroke="' + p.ink + '" stroke-width="3" opacity=".9"/>';
        out += '<path d="M155 232 L182 250 L155 258Z" fill="' + p.warm + '" opacity=".55"/>';
        out += '<path d="M-10 400 Q75 376 150 400 T310 400 L310 420 L-10 420Z" fill="' + p.ink + '" opacity=".8"/>';
        out += mist(r, p, 330);
        return out;
      }
    },
    {
      id: 'mascara',
      draw: function (r, p) {
        var out = '<rect width="300" height="420" fill="' + p.bg + '"/>';
        out += '<path d="M150 54 C214 54 238 122 232 196 C226 276 196 344 150 344 C104 344 74 276 68 196 C62 122 86 54 150 54Z" fill="' + p.ink + '" opacity=".94"/>';
        out += '<path d="M150 54 C214 54 238 122 232 196 C226 276 196 344 150 344 C104 344 74 276 68 196 C62 122 86 54 150 54Z" fill="none" stroke="' + p.warm + '" stroke-opacity=".4" stroke-width="2"/>';
        out += '<path d="M100 170 Q120 152 142 170 Q120 190 100 170Z" fill="' + p.deep + '"/>';
        out += '<path d="M158 170 Q180 152 200 170 Q180 190 158 170Z" fill="' + p.deep + '"/>';
        out += '<circle cx="120" cy="170" r="4" fill="' + p.glow + '" opacity=".8"/>';
        out += '<circle cx="180" cy="170" r="4" fill="' + p.glow + '" opacity=".8"/>';
        out += '<path d="M150 190 L150 250" stroke="' + p.accent + '" stroke-opacity=".6" stroke-width="2.6"/>';
        out += '<path d="M126 268 Q150 282 174 268" fill="none" stroke="' + p.warm + '" stroke-opacity=".5" stroke-width="2"/>';
        for (var i = 0; i < 4; i++) {
          out += '<path d="M' + (98 + i * 8) + ' 206 L' + (98 + i * 8) + ' 250" stroke="' + p.warm + '" stroke-opacity=".13" stroke-width="4"/>';
          out += '<path d="M' + (202 - i * 8) + ' 206 L' + (202 - i * 8) + ' 250" stroke="' + p.warm + '" stroke-opacity=".13" stroke-width="4"/>';
        }
        out += '<path d="M150 54 L150 24" stroke="' + p.glow + '" stroke-opacity=".4"/>';
        out += '<circle cx="150" cy="22" r="4" fill="' + p.glow + '" opacity=".7"/>';
        out += '<ellipse cx="150" cy="382" rx="96" ry="12" fill="' + p.ink + '" opacity=".6"/>';
        return out;
      }
    },
    {
      id: 'raiz',
      draw: function (r, p) {
        var out = stars(r, p, 18, 180);
        out += '<circle cx="150" cy="120" r="76" fill="' + p.deep + '" opacity=".6"/>';
        out += '<circle cx="150" cy="120" r="76" fill="none" stroke="' + p.glow + '" stroke-opacity=".2"/>';
        for (var i = 0; i < 9; i++) {
          var a = i * Math.PI * 2 / 9;
          out += '<circle cx="' + fx(150 + Math.cos(a) * 62) + '" cy="' + fx(120 + Math.sin(a) * 52) + '" r="' +
            fx(rr(r, 14, 30)) + '" fill="' + p.deep + '" opacity="' + fx(rr(r, 0.4, 0.8), 2) + '"/>';
        }
        out += '<path d="M142 166 L158 166 L164 246 L136 246Z" fill="' + p.ink + '"/>';
        for (var j = 0; j < 7; j++) {
          var dir = j % 2 === 0 ? 1 : -1;
          out += '<path d="M150 244 C' + (150 + dir * 20) + ' 276 ' + (150 + dir * 40) + ' 292 ' +
            (150 + dir * 52) + ' 322" fill="none" stroke="' + p.warm + '" stroke-opacity="' + fx(0.4 - j * 0.03, 2) +
            '" stroke-width="' + fx(3 - j * 0.18, 1) + '"/>';
        }
        out += '<path d="M0 372 Q75 356 150 372 T300 372 L300 420 L0 420Z" fill="' + p.ink + '" opacity=".85"/>';
        out += mist(r, p, 340);
        return out;
      }
    },
    {
      id: 'constelacion',
      draw: function (r, p) {
        var pts = [];
        for (var i = 0; i < 8; i++) pts.push([rr(r, 40, 260), rr(r, 70, 300)]);
        var out = '<rect width="300" height="420" fill="' + p.bg + '"/>';
        out += stars(r, p, 40, 340);
        for (var j = 0; j < pts.length - 1; j++) {
          out += '<line x1="' + fx(pts[j][0]) + '" y1="' + fx(pts[j][1]) + '" x2="' + fx(pts[j + 1][0]) + '" y2="' + fx(pts[j + 1][1]) +
            '" stroke="' + p.glow + '" stroke-opacity=".45" stroke-width="1.2"/>';
        }
        for (var k = 0; k < pts.length; k++) {
          out += glowCircle(pts[k][0], pts[k][1], 4.5, p.glow, 0.9, 0.14, 0.05);
          out += '<circle cx="' + fx(pts[k][0]) + '" cy="' + fx(pts[k][1]) + '" r="8" fill="none" stroke="' + p.line + '" stroke-opacity=".22"/>';
        }
        out += '<circle cx="150" cy="196" r="104" fill="none" stroke="' + p.warm + '" stroke-opacity=".16"/>';
        out += '<path d="M0 348 Q75 336 150 348 T300 348" fill="none" stroke="' + p.glow + '" stroke-opacity=".22"/>';
        return out;
      }
    },
    {
      id: 'fragmentos',
      draw: function (r, p) {
        var out = '<rect width="300" height="420" fill="' + p.bg + '"/>';
        out += glowCircle(150, 190, 40, p.glow, 0.15, 0.08, 0.04);
        var shards = [
          [150, 60, 200, 160, 176, 236, 128, 226],
          [212, 150, 258, 236, 220, 300, 192, 232],
          [92, 150, 108, 236, 66, 300, 44, 220],
          [150, 250, 190, 316, 160, 372, 120, 330],
          [120, 130, 156, 122, 168, 190, 132, 202]
        ];
        for (var i = 0; i < shards.length; i++) {
          var s = shards[i];
          out += '<polygon points="' + s.join(' ') + '" fill="' + (i % 2 ? p.deep : p.ink) + '" opacity=".85"/>';
          out += '<polygon points="' + s.join(' ') + '" fill="none" stroke="' + p.line + '" stroke-opacity=".28"/>';
        }
        out += '<path d="M150 60 L168 190 L150 250 L132 190Z" fill="' + p.glow + '" opacity=".12"/>';
        out += '<path d="M0 372 Q75 360 150 372 T300 372 L300 420 L0 420Z" fill="' + p.ink + '" opacity=".8"/>';
        return out;
      }
    },
    {
      id: 'laberinto',
      draw: function (r, p) {
        var out = '<rect width="300" height="420" fill="' + p.bg + '"/>';
        out += stars(r, p, 14, 180);
        for (var i = 0; i < 6; i++) {
          var inset = 42 + i * 20;
          out += '<rect x="' + inset + '" y="' + (72 + i * 18) + '" width="' + (300 - inset * 2) + '" height="' + (276 - i * 34) +
            '" rx="' + (38 - i * 4) + '" fill="none" stroke="' + (i % 2 ? p.deep : p.warm) + '" stroke-opacity="' +
            fx(0.6 - i * 0.06, 2) + '" stroke-width="' + (i % 2 ? 6 : 2) + '"/>';
        }
        out += '<circle cx="150" cy="212" r="17" fill="' + p.glow + '" opacity=".55"/>';
        out += '<circle cx="150" cy="212" r="34" fill="' + p.glow + '" opacity=".08"/>';
        out += '<path d="M150 44 L150 72 M150 352 L150 384 M40 212 L72 212 M228 212 L262 212" stroke="' + p.line + '" stroke-opacity=".2"/>';
        out += '<rect x="42" y="72" width="216" height="276" fill="' + p.ink + '" opacity=".12"/>';
        return out;
      }
    },
    {
      id: 'polilla',
      draw: function (r, p) {
        var out = stars(r, p, 20, 240);
        out += glowCircle(150, 150, 30, p.warm, 0.35, 0.08, 0.04);
        out += '<path d="M146 190 C96 130 60 128 58 172 C56 214 104 244 144 232Z" fill="' + p.deep + '" opacity=".92"/>';
        out += '<path d="M154 190 C204 130 240 128 242 172 C244 214 196 244 156 232Z" fill="' + p.deep + '" opacity=".92"/>';
        out += '<path d="M146 236 C110 262 92 302 118 320 C142 336 152 292 150 248Z" fill="' + p.ink + '" opacity=".92"/>';
        out += '<path d="M154 236 C190 262 208 302 182 320 C158 336 148 292 150 248Z" fill="' + p.ink + '" opacity=".92"/>';
        out += '<ellipse cx="150" cy="230" rx="10" ry="40" fill="' + p.warm + '" opacity=".8"/>';
        out += '<circle cx="150" cy="184" r="12" fill="' + p.warm + '" opacity=".9"/>';
        out += '<path d="M143 174 C132 156 118 146 106 142 M157 174 C168 156 182 146 194 142" fill="none" stroke="' + p.warm + '" stroke-opacity=".6" stroke-width="2"/>';
        out += '<circle cx="106" cy="142" r="2.4" fill="' + p.glow + '"/>';
        out += '<circle cx="194" cy="142" r="2.4" fill="' + p.glow + '"/>';
        out += '<path d="M96 178 Q120 194 140 202 M204 178 Q180 194 160 202" fill="none" stroke="' + p.glow + '" stroke-opacity=".3"/>';
        out += '<path d="M0 372 Q75 360 150 372 T300 372 L300 420 L0 420Z" fill="' + p.ink + '" opacity=".8"/>';
        return out;
      }
    },
    {
      id: 'jardin',
      draw: function (r, p) {
        var out = stars(r, p, 16, 160);
        out += glowCircle(236, 92, 26, p.warm, 0.45, 0.09, 0.035);
        out += '<path d="M0 296 Q75 274 150 296 T300 296 L300 420 L0 420Z" fill="' + p.ink + '" opacity=".55"/>';
        for (var i = 0; i < 9; i++) {
          var x = rr(r, 24, 276);
          var h = rr(r, 70, 190);
          var baseY = 372;
          out += '<path d="M' + fx(x) + ' ' + baseY + ' C' + fx(x - 12) + ' ' + fx(baseY - h * 0.5) + ' ' +
            fx(x + 10) + ' ' + fx(baseY - h * 0.7) + ' ' + fx(x) + ' ' + fx(baseY - h) +
            '" fill="none" stroke="' + p.glow + '" stroke-opacity="' + fx(rr(r, 0.22, 0.5), 2) + '" stroke-width="1.8"/>';
          var col = i % 3 === 0 ? p.accent : (i % 3 === 1 ? p.warm : p.glow);
          var cy = baseY - h;
          out += '<circle cx="' + fx(x) + '" cy="' + fx(cy) + '" r="' + fx(rr(r, 5, 10)) + '" fill="' + col + '" opacity="' + fx(rr(r, 0.5, 0.9), 2) + '"/>';
          out += '<circle cx="' + fx(x) + '" cy="' + fx(cy) + '" r="' + fx(rr(r, 11, 16)) + '" fill="' + col + '" opacity=".07"/>';
        }
        out += mist(r, p, 330);
        out += '<path d="M0 374 L300 374" stroke="' + p.line + '" stroke-opacity=".14"/>';
        return out;
      }
    },
    {
      id: 'lluvia',
      draw: function (r, p) {
        var out = '<rect width="300" height="420" fill="' + p.bg + '"/>';
        for (var i = 0; i < 46; i++) {
          var x = rr(r, -20, 300), y = rr(r, 0, 340), l = rr(r, 14, 46);
          out += '<line x1="' + fx(x) + '" y1="' + fx(y) + '" x2="' + fx(x - l * 0.35) + '" y2="' + fx(y + l) +
            '" stroke="' + p.glow + '" stroke-opacity="' + fx(rr(r, 0.08, 0.32), 2) + '" stroke-width="1.2"/>';
        }
        out += '<path d="M150 210 C138 226 138 244 150 244 C162 244 162 226 150 210Z" fill="' + p.warm + '" opacity=".8"/>';
        out += '<path d="M150 258 L150 344" stroke="' + p.ink + '" stroke-width="12" opacity=".9"/>';
        out += '<path d="M108 254 Q150 210 192 254Z" fill="' + p.deep + '" opacity=".95"/>';
        out += '<path d="M108 254 Q150 210 192 254" fill="none" stroke="' + p.warm + '" stroke-opacity=".45" stroke-width="2"/>';
        out += '<ellipse cx="150" cy="356" rx="58" ry="8" fill="' + p.glow + '" opacity=".12"/>';
        out += '<path d="M0 366 Q75 356 150 366 T300 366 L300 420 L0 420Z" fill="' + p.ink + '" opacity=".85"/>';
        return out;
      }
    }
  ];

  /* ---------- construcción del mazo ---------- */
  var cards = [];
  var byId = {};

  motifs.forEach(function (m, mi) {
    palettes.forEach(function (p, pi) {
      var seed = 7919 + mi * 977 + pi * 131;
      var r = mulberry32(seed);
      var id = 'c' + ('0' + (mi + 1)).slice(-2) + '-' + pi;
      var uid = 'u' + mi + '_' + pi;
      var inner = m.draw(r, p, uid);
      var svg = '<svg class="card-art" viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
        '<defs>' +
        '<radialGradient id="bg' + uid + '" cx="42%" cy="34%" r="86%">' +
        '<stop offset="0" stop-color="' + p.deep + '"/><stop offset="1" stop-color="' + p.bg + '"/>' +
        '</radialGradient>' +
        '<linearGradient id="vg' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0.45" stop-color="' + p.ink + '" stop-opacity="0"/>' +
        '<stop offset="1" stop-color="' + p.ink + '" stop-opacity="0.42"/>' +
        '</linearGradient>' +
        '</defs>' +
        '<rect width="300" height="420" fill="url(#bg' + uid + ')"/>' +
        inner +
        '<rect width="300" height="420" fill="url(#vg' + uid + ')"/>' +
        '<rect x="0.75" y="0.75" width="298.5" height="418.5" fill="none" stroke="' + p.line + '" stroke-opacity="0.14" stroke-width="1.5"/>' +
        '</svg>';
      var card = {
        id: id, motif: m.id, palette: p.id, variant: pi, neutral: false,
        accent: p.glow, warm: p.warm, svg: svg
      };
      cards.push(card);
      byId[id] = card;
    });
  });

  var neutral = [];
  motifs.slice(0, 12).forEach(function (m, mi) {
    var r = mulberry32(4441 + mi * 313);
    var uid = 'n' + mi;
    var inner = m.draw(r, neutralPalette, uid);
    var id = 'n' + ('0' + (mi + 1)).slice(-2);
    var svg = '<svg class="card-art" viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><radialGradient id="bg' + uid + '" cx="42%" cy="34%" r="86%">' +
      '<stop offset="0" stop-color="' + neutralPalette.deep + '"/><stop offset="1" stop-color="' + neutralPalette.bg + '"/>' +
      '</radialGradient></defs>' +
      '<rect width="300" height="420" fill="url(#bg' + uid + ')"/>' + inner +
      '<rect width="300" height="420" fill="' + neutralPalette.ink + '" opacity=".18"/>' +
      '<rect x="0.75" y="0.75" width="298.5" height="418.5" fill="none" stroke="' + neutralPalette.line + '" stroke-opacity="0.16" stroke-width="1.5"/>' +
      '</svg>';
    var card = {
      id: id, motif: m.id, palette: 'neutro', variant: 9, neutral: true,
      accent: neutralPalette.glow, warm: neutralPalette.warm, svg: svg
    };
    neutral.push(card);
    byId[id] = card;
  });

  var words = [
    'silencio', 'marea', 'umbral', 'eco', 'niebla', 'raíz', 'vértigo', 'ofrenda',
    'brújula', 'semilla', 'relámpago', 'nido', 'espejo', 'hueso', 'fuego', 'olvido',
    'cordillera', 'vapor', 'sal', 'aguja', 'jardín', 'sed', 'jaula', 'cuerda',
    'aurora', 'piedra', 'nombre', 'paso', 'sombra', 'miel', 'invierno', 'puente',
    'voz', 'cicatriz', 'faro', 'enjambre', 'tinta', 'abismo', 'tacto', 'distancia'
  ];

  function shuffle(list, rnd) {
    var r = rnd || Math.random;
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  CF.Deck = {
    illus: cards,
    neutral: neutral,
    byId: byId,
    words: words,
    allIllustrationIds: cards.map(function (c) { return c.id; }),
    neutralIds: neutral.map(function (c) { return c.id; }),
    card: function (id) { return byId[id] || null; },
    word: function (w) { return words[w]; },
    shuffle: shuffle,
    mulberry32: mulberry32,
    palette: palettes
  };
})();
