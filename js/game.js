(function () {
  'use strict';

  var CF = window.CF = window.CF || {};
  var E = CF.engine;
  var t = function (k, v) { return CF.i18n.t(k, v); };

  var GRAVITY = 1720;
  var MAX_FALL = 980;

  function Input() {
    this.keys = {};
    this.pressed = {};
    this.released = {};
    this.enabled = true;
    var self = this;
    this._down = function (e) {
      if (!self.enabled && e.code !== 'Escape') return;
      if (self._isGameKey(e.code)) e.preventDefault();
      if (!self.keys[e.code]) self.pressed[e.code] = true;
      self.keys[e.code] = true;
    };
    this._up = function (e) {
      if (self.keys[e.code]) self.released[e.code] = true;
      self.keys[e.code] = false;
    };
    this._blur = function () {
      for (var k in self.keys) self.keys[k] = false;
      self.pressed = {};
      self.released = {};
    };
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    window.addEventListener('blur', this._blur);
  }
  Input.prototype._isGameKey = function (code) {
    return /^(Arrow|Space|Escape|Key[A-Z]|Digit[1-3])/.test(code);
  };
  Input.prototype.isDown = function (codes) {
    if (!codes) return false;
    if (typeof codes === 'string') return !!this.keys[codes];
    for (var i = 0; i < codes.length; i++) if (this.keys[codes[i]]) return true;
    return false;
  };
  Input.prototype.wasPressed = function (codes) {
    if (!codes) return false;
    if (typeof codes === 'string') return !!this.pressed[codes];
    for (var i = 0; i < codes.length; i++) if (this.pressed[codes[i]]) return true;
    return false;
  };
  Input.prototype.endFrame = function () {
    this.pressed = {};
    this.released = {};
  };
  Input.prototype.destroy = function () {
    window.removeEventListener('keydown', this._down);
    window.removeEventListener('keyup', this._up);
    window.removeEventListener('blur', this._blur);
  };

  var SOLO_CONTROLS = {
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    jump: ['KeyW', 'ArrowUp', 'Space'],
    ability: 'KeyE'
  };
  var COOP_CONTROLS = {
    p1: { left: 'KeyA', right: 'KeyD', jump: 'KeyW', ability: 'KeyQ' },
    p2: { left: 'KeyF', right: 'KeyH', jump: 'KeyT', ability: 'KeyR' },
    p3: { left: 'KeyJ', right: 'KeyL', jump: 'KeyI', ability: 'KeyU' }
  };

  function Game() {
    this.level = null;
    this.running = false;
    this.paused = false;
    this.fx = new E.FX();
    this.time = 0;
    this.lastT = 0;
    this.shake = 0;
    this.ambient = [];
    this.accumulator = 0;
  }

  Game.prototype.start = function (cfg) {
    this.destroy();
    this.cfg = cfg || {};
    this.mode = this.cfg.mode || 'solo';
    this.difficulty = CF.difficulties[this.cfg.difficulty] || CF.difficulties.normal;
    this.levelIndex = this.cfg.levelIndex || 0;
    this.level = CF.levels[this.levelIndex];
    this.localChars = (this.cfg.localChars && this.cfg.localChars.length ? this.cfg.localChars : ['p1']).slice();
    if (this.mode === 'solo') this.localChars = ['p1', 'p2', 'p3'];
    if (this.mode === 'coop') this.localChars = ['p1', 'p2', 'p3'];
    this.startChar = this.cfg.startChar && this.localChars.indexOf(this.cfg.startChar) >= 0 ? this.cfg.startChar : this.localChars[0];
    this.activeChar = this.startChar;
    this.online = this.cfg.online || null;
    this.isHost = !!(this.online && this.online.isHost);
    this.playerName = this.cfg.name || '';

    this.time = 0;
    this.fracture = 0;
    this.shards = {};
    this.devices = {};
    this.altars = {};
    this.doors = {};
    this.bridges = {};
    this.echoUntil = 0;
    this.sealDeadline = 0;
    this.victoryAt = 0;
    this.victoryFired = false;
    this.collapseUntil = 0;
    this.completed = false;
    this.completedAt = 0;
    this.checkpointIndex = 0;
    this.checkpointAnnounced = -1;
    this.markers = [];
    this.remoteNames = {};
    this.claimSent = {};
    this.shake = 0;
    this.paused = false;
    this.running = true;
    this.lastT = performance.now();
    this.ambient = [];
    this.fx.clear();
    this.doorAnim = {};

    this.chars = {};
    var spawn = this.level.spawn;
    var offsets = { p1: -22, p2: 0, p3: 22 };
    for (var i = 0; i < CF.characters.length; i++) {
      var ch = CF.characters[i];
      this.chars[ch.id] = {
        id: ch.id,
        def: ch,
        x: spawn.x + offsets[ch.id],
        y: spawn.y,
        w: 20,
        h: 40,
        vx: 0,
        vy: 0,
        dir: 1,
        onGround: false,
        coyote: 0,
        jumpBuffer: 0,
        jumpCut: false,
        anim: 0,
        rideId: null,
        immuneUntil: 0,
        remote: false,
        name: ''
      };
    }
    this.owner = {};
    for (var j = 0; j < this.localChars.length; j++) this.owner[this.localChars[j]] = true;
    if (this.online && this.online.playerNames) {
      for (var pid in this.online.playerNames) {
        var info = this.online.playerNames[pid];
        if (info && info.chars) {
          for (var c = 0; c < info.chars.length; c++) {
            var cid = info.chars[c];
            if (this.chars[cid]) {
              this.remoteNames[cid] = info.name || '';
              if (!this.owner[cid]) this.chars[cid].remote = true;
            }
          }
        }
      }
    }

    this.movingPos = {};
    this.camera = { x: 0, y: 0 };
    this.camTarget = 0;
    this.updateCamera(1, true);
    this.input = new Input();
    this.initAmbient();
  };

  Game.prototype.addLocalChar = function (id) {
    if (!this.chars[id] || this.localChars.indexOf(id) >= 0) return false;
    this.localChars.push(id);
    this.owner[id] = true;
    this.chars[id].remote = false;
    if (!this.activeChar) this.activeChar = id;
    return true;
  };

  Game.prototype.initAmbient = function () {
    var q = CF.store.settings.quality;
    var count = q === 'low' ? 18 : q === 'medium' ? 32 : 52;
    this.ambient = [];
    for (var i = 0; i < count; i++) {
      this.ambient.push({
        x: Math.random() * 1000,
        y: Math.random() * 560,
        sp: 5 + Math.random() * 18,
        sz: Math.random() < 0.2 ? 2 : 1,
        ph: Math.random() * Math.PI * 2
      });
    }
  };

  Game.prototype.destroy = function () {
    if (this.input) {
      this.input.destroy();
      this.input = null;
    }
    this.running = false;
    this.paused = false;
  };

  Game.prototype.pause = function (on) {
    this.paused = !!on;
    if (this.input) this.input.enabled = !on;
    if (!on) this.lastT = performance.now();
  };

  Game.prototype.notify = function (key, vars, quiet) {
    if (CF.app && CF.app.toast && !quiet) CF.app.toast(t(key, vars), 'info');
    if (quiet) return;
  };

  Game.prototype.respawn = function (ch) {
    var cp = this.level.checkpoints[this.checkpointIndex] || this.level.checkpoints[0];
    ch.x = cp.x + (ch.id === 'p1' ? -22 : ch.id === 'p3' ? 22 : 0);
    ch.y = cp.y - ch.h - 2;
    ch.vx = 0;
    ch.vy = 0;
    ch.onGround = false;
    ch.immuneUntil = this.time + 1.1;
    this.fx.burst(ch.x + ch.w / 2, ch.y + ch.h / 2, ch.def.accent, 18, 120);
  };

  Game.prototype.respawnLocal = function () {
    for (var i = 0; i < this.localChars.length; i++) {
      var ch = this.chars[this.localChars[i]];
      if (ch) this.respawn(ch);
    }
  };

  Game.prototype.checkpointFor = function (x) {
    var list = this.level.checkpoints;
    var idx = 0;
    for (var i = 0; i < list.length; i++) {
      if (x >= list[i].x - 8) idx = i;
    }
    return idx;
  };

  Game.prototype.movingPositions = function (dt) {
    var level = this.level;
    var out = {};
    for (var i = 0; i < level.moving.length; i++) {
      var m = level.moving[i];
      var prev = this.movingPos[m.id] || { x: m.x, y: m.y };
      var nx = m.x;
      var ny = m.y;
      var wave = Math.sin(this.time * m.speed + m.phase) * m.range;
      if (m.axis === 'x') nx = m.x + wave;
      else ny = m.y + wave;
      out[m.id] = { x: nx, y: ny, dx: nx - prev.x, dy: ny - prev.y, w: m.w, h: m.h, kind: 'moving', _id: m.id };
    }
    this.movingPos = out;
    void dt;
    return out;
  };

  Game.prototype.solids = function () {
    var level = this.level;
    var list = [];
    var i;
    for (i = 0; i < level.platforms.length; i++) {
      var p = level.platforms[i];
      list.push({ x: p.x, y: p.y, w: p.w, h: p.h, kind: p.kind, _id: 'p' + i });
    }
    for (i = 0; i < level.hidden.length; i++) {
      var h = level.hidden[i];
      list.push({ x: h.x, y: h.y, w: h.w, h: h.h, kind: 'hidden', _id: 'h' + i });
    }
    for (var id in this.movingPos) {
      if (Object.prototype.hasOwnProperty.call(this.movingPos, id)) list.push(this.movingPos[id]);
    }
    for (i = 0; i < level.doors.length; i++) {
      var d = level.doors[i];
      if (!this.doors[d.id]) list.push({ x: d.x, y: d.y, w: d.w, h: d.h, kind: 'door', _id: 'd' + i });
    }
    for (i = 0; i < level.bridges.length; i++) {
      var br = level.bridges[i];
      if (this.bridges[br.id]) {
        for (var k = 0; k < br.pieces.length; k++) {
          var bp = br.pieces[k];
          list.push({ x: bp.x, y: bp.y, w: bp.w, h: bp.h, kind: 'bridge', _id: 'b' + i + '_' + k });
        }
      }
    }
    return list;
  };

  Game.prototype.update = function (dt) {
    if (!this.running) return;
    if (this.completed) {
      this.time += dt;
      this.fx.update(dt);
      return;
    }
    if (this.paused) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    var input = this.input;
    var level = this.level;

    if (input.wasPressed('Escape') && this.cfg.onPause) {
      this.cfg.onPause();
      this.pause(true);
      input.endFrame();
      return;
    }

    var collapsing = this.time < this.collapseUntil;
    var victoryRunning = this.victoryAt && this.time < this.victoryAt;

    if (!collapsing) {
      this.movingPositions(dt);
      var solids = this.solids();
      var mode = this.mode;

      if (mode === 'coop') {
        this.controlChar(this.chars.p1, COOP_CONTROLS.p1, dt, solids);
        this.controlChar(this.chars.p2, COOP_CONTROLS.p2, dt, solids);
        this.controlChar(this.chars.p3, COOP_CONTROLS.p3, dt, solids);
      } else {
        if (input.wasPressed(['Digit1'])) this.switchChar('p1');
        if (input.wasPressed(['Digit2'])) this.switchChar('p2');
        if (input.wasPressed(['Digit3'])) this.switchChar('p3');
        var active = this.chars[this.activeChar];
        if (active) this.controlChar(active, SOLO_CONTROLS, dt, solids);
        for (var li = 0; li < this.localChars.length; li++) {
          var lc = this.chars[this.localChars[li]];
          if (lc && lc !== active) this.idlePhysics(lc, dt, solids);
        }
      }

      for (var id in this.chars) {
        if (!Object.prototype.hasOwnProperty.call(this.chars, id)) continue;
        var ch = this.chars[id];
        if (this.owner[id]) {
          ch.remote = false;
        } else {
          ch.remote = true;
          if (this.online && this.online.positions && this.online.positions[ch.id]) {
            var rp = this.online.positions[ch.id];
            ch.x = rp.x;
            ch.y = rp.y;
            ch.dir = rp.dir || 1;
            ch.anim = rp.anim || 0;
            ch.onGround = !!rp.onGround;
            ch.remote = true;
            if (rp.name) this.remoteNames[ch.id] = rp.name;
          }
        }
      }

      this.handleAbilities(input);
      this.checkShards();
      this.checkDevicesAndDoors();
      this.checkHazards();
      this.checkCheckpoints();
      this.checkExit();
      this.updateSeal(dt);
      this.updateFracture(dt);
    } else {
      this.movingPositions(dt);
    }

    if (this.victoryAt && !this.victoryFired && this.time >= this.victoryAt) {
      this.victoryFired = true;
      if (this.cfg.onVictory) this.cfg.onVictory();
    }

    this.fx.update(dt);
    this.updateCamera(dt, false);
    this.shake = Math.max(0, this.shake - dt * 26);
    this.updateAmbient(dt);
    input.endFrame();
  };

  Game.prototype.switchChar = function (id) {
    if (this.localChars.indexOf(id) < 0) {
      if (this.mode === 'solo' || (this.mode === 'online' && this.localChars.length > 1)) {
        CF.app.toast(t('hint.switch'), 'info');
      }
      return;
    }
    if (this.activeChar !== id) {
      this.activeChar = id;
      CF.audio.play(CF.cues.uiClick, { gain: 0.5 });
      this.fx.burst(this.chars[id].x + 10, this.chars[id].y, this.chars[id].def.accent, 8, 50);
    }
  };

  Game.prototype.idlePhysics = function (ch, dt, solids) {
    if (ch.rideId && this.movingPos[ch.rideId]) {
      var m = this.movingPos[ch.rideId];
      ch.x += m.dx;
      ch.y += m.dy;
    }
    ch.vx = 0;
    ch.vy = Math.min(MAX_FALL, ch.vy + GRAVITY * dt);
    E.moveAndCollide(ch, solids, dt, { minX: 0, maxX: this.level.width });
    if (ch.onGround) ch.rideId = ch.ground && ch.ground.kind === 'moving' ? ch.ground._id : null;
    else ch.rideId = null;
    if (ch.y > 640) this.hitHazard(ch, 5);
  };

  Game.prototype.controlChar = function (ch, controls, dt, solids) {
    if (!ch) return;
    if (ch.rideId && this.movingPos[ch.rideId]) {
      var m = this.movingPos[ch.rideId];
      ch.x += m.dx;
      ch.y += m.dy;
    }
    var left = this.input.isDown(controls.left);
    var right = this.input.isDown(controls.right);
    var dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir !== 0) {
      ch.dir = dir;
      ch.vx += dir * 1350 * dt;
      if (Math.abs(ch.vx) > ch.def.speed) ch.vx = ch.def.speed * dir;
      ch.anim += dt * (2.2 + Math.abs(ch.vx) * 0.045);
    } else {
      ch.vx *= Math.pow(0.0009, dt);
      if (Math.abs(ch.vx) < 2) ch.vx = 0;
    }
    if (this.input.wasPressed(controls.jump)) ch.jumpBuffer = 0.13;
    if (ch.jumpBuffer > 0) ch.jumpBuffer -= dt;
    if (ch.onGround) ch.coyote = 0.11;
    else ch.coyote -= dt;
    if (ch.jumpBuffer > 0 && ch.coyote > 0) {
      ch.vy = -ch.def.jump;
      ch.onGround = false;
      ch.coyote = 0;
      ch.jumpBuffer = 0;
      ch.jumpCut = false;
      CF.audio.play(CF.cues.jump, { gain: 0.45 });
      this.fx.burst(ch.x + ch.w / 2, ch.y + ch.h, 'rgba(200,230,255,.7)', 5, 45);
    }
    if (!this.input.isDown(controls.jump) && ch.vy < -160 && !ch.jumpCut) {
      ch.vy *= 0.52;
      ch.jumpCut = true;
    }
    ch.vy = Math.min(MAX_FALL, ch.vy + GRAVITY * dt);
    var wasGround = ch.onGround;
    E.moveAndCollide(ch, solids, dt, { minX: 0, maxX: this.level.width });
    if (ch.onGround) {
      ch.rideId = ch.ground && ch.ground.kind === 'moving' ? ch.ground._id : null;
      if (!wasGround && ch.vy >= 0) {
        CF.audio.play(CF.cues.land, { gain: 0.3 });
      }
    } else {
      ch.rideId = null;
    }
    if (ch.y > 640) this.hitHazard(ch, 5);
  };

  Game.prototype.handleAbilities = function (input) {
    if (this.mode === 'coop') {
      for (var i = 0; i < 3; i++) {
        var cid = 'p' + (i + 1);
        var controls = COOP_CONTROLS[cid];
        if (input.wasPressed(controls.ability)) this.useAbility(this.chars[cid]);
      }
    } else {
      if (input.wasPressed('KeyE')) this.useAbility(this.chars[this.activeChar]);
    }
  };

  Game.prototype.nearDevice = function (ch, types, range) {
    var cx = ch.x + ch.w / 2;
    var cy = ch.y + ch.h / 2;
    var best = null;
    var bestD = range || 86;
    for (var i = 0; i < this.level.devices.length; i++) {
      var d = this.level.devices[i];
      if (types && types.indexOf(d.type) < 0) continue;
      if (this.devices[d.id]) continue;
      var dx = d.x - cx;
      var dy = (d.y - 18) - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    return best;
  };

  Game.prototype.useAbility = function (ch) {
    if (!ch || this.time < this.collapseUntil) return;
    var ability = ch.def.ability;
    var cx = ch.x + ch.w / 2;
    var cy = ch.y + ch.h / 2;

    if (ability === 'echo') {
      var altar = this.nearDevice(ch, ['altar'], 92);
      if (altar && altar.char === 'p1') {
        this.tryActivateDevice(altar);
        return;
      }
      if (this.time < this.echoCooldownUntil) return;
      this.echoCooldownUntil = this.time + ch.def.abilityCooldown;
      if (this.online && !this.isHost) {
        this.online.send({ t: 'action', kind: 'echo' });
        this.fx.burst(cx, cy, ch.def.accent, 26, 160);
        CF.app.toast(t('msg.echo'), 'ok');
        return;
      }
      if (this.online && this.isHost) this.online.send({ t: 'echoState', until: this.time + 10 });
      this.echoUntil = this.time + ch.def.abilityDuration;
      this.fx.burst(cx, cy, ch.def.accent, 30, 170);
      this.ring(cx, cy, ch.def.accent);
      CF.audio.play(CF.cues.echo, { gain: 0.7 });
      CF.app.toast(t('msg.echo'), 'ok');
      return;
    }

    if (ability === 'resonance') {
      var altar2 = this.nearDevice(ch, ['altar'], 92);
      if (altar2 && altar2.char === 'p2') {
        this.tryActivateDevice(altar2);
        return;
      }
      var dev = this.nearDevice(ch, ['harmonic'], 92);
      if (dev) {
        this.tryActivateDevice(dev);
        return;
      }
      this.fx.burst(cx, cy, ch.def.accent, 12, 90);
      this.ring(cx, cy, ch.def.accent);
      CF.app.toast(t('hint.harmonicShort'), 'info');
      return;
    }

    if (ability === 'glyph') {
      var altar3 = this.nearDevice(ch, ['altar'], 92);
      if (altar3 && altar3.char === 'p3') {
        this.tryActivateDevice(altar3);
        return;
      }
      var dev2 = this.nearDevice(ch, ['glyph'], 92);
      if (dev2) {
        this.tryActivateDevice(dev2);
        return;
      }
      if (this.online && !this.isHost) {
        this.online.send({ t: 'action', kind: 'marker', x: cx, y: cy - 10, char: ch.id });
      }
      this.addMarker(cx, cy - 8, ch.id);
      this.fx.burst(cx, cy, ch.def.accent, 12, 60);
      CF.app.toast(t('msg.glyphMark'), 'ok');
    }
  };

  Game.prototype.ring = function (x, y, color) {
    for (var i = 0; i < 24; i++) {
      var a = (i / 24) * Math.PI * 2;
      this.fx.spawn(x, y, {
        vx: Math.cos(a) * 130,
        vy: Math.sin(a) * 130,
        life: 0.7,
        size: 2,
        color: color,
        drag: 0.96
      });
    }
  };

  Game.prototype.addMarker = function (x, y, charId) {
    this.markers.push({ x: x, y: y, char: charId, until: this.time + 12, born: this.time });
    if (this.markers.length > 12) this.markers.shift();
  };

  Game.prototype.tryActivateDevice = function (dev) {
    if (!dev || this.devices[dev.id]) return;
    if (this.online && !this.isHost) {
      this.online.send({ t: 'action', kind: 'device', id: dev.id, char: this.activeChar });
      this.fx.burst(dev.x, dev.y - 20, '#ffffff', 12, 90);
      return;
    }
    this.activateDevice(dev.id);
  };

  Game.prototype.activateDevice = function (id) {
    var dev = null;
    for (var i = 0; i < this.level.devices.length; i++) {
      if (this.level.devices[i].id === id) { dev = this.level.devices[i]; break; }
    }
    if (!dev || this.devices[id]) return;
    this.devices[id] = true;
    if (dev.type === 'altar') {
      this.altars[id] = true;
      CF.app.toast(t('msg.altar') + ' · ' + (dev.char || '').toUpperCase(), 'ok');
      if (!this.sealDeadline && this.level.sealWindow) {
        this.sealDeadline = this.time + this.difficulty.sealWindow;
        CF.app.toast(t('hint.altarWindow'), 'info');
      }
      this.checkAltars();
    } else {
      if (dev.type === 'glyph') {
        for (var j = 0; j < this.level.doors.length; j++) {
          if (this.level.doors[j].device === id) this.doors[this.level.doors[j].id] = true;
        }
        CF.app.toast(t('msg.glyph'), 'ok');
        CF.audio.play(CF.cues.door, { gain: 0.7 });
      }
      if (dev.type === 'harmonic') {
        for (var b = 0; b < this.level.bridges.length; b++) {
          if (this.level.bridges[b].device === id) this.bridges[this.level.bridges[b].id] = true;
        }
        CF.app.toast(t('msg.harmonic'), 'ok');
        CF.audio.play(CF.cues.door, { gain: 0.7 });
      }
      this.fx.burst(dev.x, dev.y - 26, dev.type === 'glyph' ? '#b98bff' : '#ffbf5e', 22, 120);
      this.ring(dev.x, dev.y - 20, dev.type === 'glyph' ? '#b98bff' : '#ffbf5e');
    }
    if (this.online && this.isHost) this.online.markDirty();
  };

  Game.prototype.checkAltars = function () {
    var all = true;
    for (var i = 0; i < this.level.devices.length; i++) {
      var d = this.level.devices[i];
      if (d.type === 'altar' && !this.devices[d.id]) all = false;
    }
    if (all && !this.victoryAt) {
      this.sealDeadline = 0;
      this.victoryAt = this.time + 4.6;
      CF.app.toast(t('msg.seal'), 'ok');
      CF.audio.play(CF.cues.victory, { gain: 0.8 });
      this.shake = 6;
    }
  };

  Game.prototype.updateSeal = function (dt) {
    if (!this.level.sealWindow) return;
    if (this.victoryAt) return;
    if (this.sealDeadline && this.time > this.sealDeadline) {
      this.sealDeadline = 0;
      var any = false;
      for (var i = 0; i < this.level.devices.length; i++) {
        var d = this.level.devices[i];
        if (d.type === 'altar') {
          if (this.devices[d.id]) any = true;
          this.devices[d.id] = false;
          this.altars[d.id] = false;
        }
      }
      if (any) {
        CF.app.toast(t('msg.altarReset'), 'err');
        this.fx.burst(1200, 250, '#ff5b6e', 30, 140);
      }
    }
    void dt;
  };

  Game.prototype.checkDevicesAndDoors = function () {
    var i;
    for (i = 0; i < this.level.doors.length; i++) {
      var d = this.level.doors[i];
      if (d.type === 'plates') {
        var pressed = 0;
        for (var p = 0; p < d.plates.length; p++) {
          if (this.platePressed(d.plates[p])) pressed++;
        }
        if (pressed >= d.plates.length && !this.doors[d.id]) {
          this.doors[d.id] = true;
          CF.app.toast(t('msg.plates'), 'ok');
          CF.audio.play(CF.cues.door, { gain: 0.7 });
          this.fx.burst(d.x + d.w / 2, d.y + d.h / 2, '#57ffa8', 24, 120);
        }
      }
    }
    for (i = 0; i < this.level.devices.length; i++) {
      var dev = this.level.devices[i];
      if (dev.type === 'glyph' && this.devices[dev.id]) {
        for (var k = 0; k < this.level.doors.length; k++) {
          if (this.level.doors[k].device === dev.id) this.doors[this.level.doors[k].id] = true;
        }
      }
    }
    for (i = 0; i < this.level.bridges.length; i++) {
      var br = this.level.bridges[i];
      if (this.devices[br.device]) this.bridges[br.id] = true;
    }
    for (var id in this.doors) {
      if (this.doors[id]) this.doorAnim[id] = Math.min(1, (this.doorAnim[id] || 0) + 0.06);
    }
  };

  Game.prototype.platePressed = function (id) {
    var plate = null;
    for (var i = 0; i < this.level.plates.length; i++) {
      if (this.level.plates[i].id === id) { plate = this.level.plates[i]; break; }
    }
    if (!plate) return false;
    var pr = { x: plate.x, y: plate.y - 12, w: plate.w, h: 16 };
    for (var cid in this.chars) {
      if (!Object.prototype.hasOwnProperty.call(this.chars, cid)) continue;
      var ch = this.chars[cid];
      if (E.aabb(ch, pr) && ch.onGround) return true;
      if (Math.abs((ch.x + ch.w / 2) - (plate.x + plate.w / 2)) < plate.w / 2 + 8 && Math.abs((ch.y + ch.h) - plate.y) < 6) return true;
    }
    return false;
  };

  Game.prototype.checkShards = function () {
    for (var i = 0; i < this.level.shards.length; i++) {
      var s = this.level.shards[i];
      if (this.shards[s.id]) continue;
      if (s.hidden && this.time >= this.echoUntil) continue;
      for (var c = 0; c < this.localChars.length; c++) {
        var ch = this.chars[this.localChars[c]];
        if (!ch) continue;
        var dx = (ch.x + ch.w / 2) - s.x;
        var dy = (ch.y + ch.h / 2) - s.y;
        if (dx * dx + dy * dy < 38 * 38) {
          this.claimShard(s, ch);
          break;
        }
      }
    }
  };

  Game.prototype.claimShard = function (shard, ch) {
    if (this.shards[shard.id]) return;
    if (this.online && !this.isHost) {
      var last = this.claimSent[shard.id] || 0;
      if (this.time - last < 1) return;
      this.claimSent[shard.id] = this.time;
      this.online.send({ t: 'action', kind: 'shard', id: shard.id, char: ch.id });
      return;
    }
    this.collectShard(shard.id);
  };

  Game.prototype.collectShard = function (id) {
    if (this.shards[id]) return;
    var shard = null;
    for (var i = 0; i < this.level.shards.length; i++) {
      if (this.level.shards[i].id === id) { shard = this.level.shards[i]; break; }
    }
    if (!shard) return;
    this.shards[id] = true;
    this.fracture = Math.max(0, this.fracture - 12);
    this.fx.burst(shard.x, shard.y, '#a9e6ff', 34, 150);
    this.fx.burst(shard.x, shard.y, '#ffffff', 10, 60);
    this.ring(shard.x, shard.y, '#7ef7ff');
    this.shake = 4;
    CF.audio.play(CF.cues.shard, { gain: 0.8 });
    var got = 0;
    var total = this.level.shards.length;
    for (var s in this.shards) if (this.shards[s]) got++;
    CF.app.toast(t('msg.shard') + ' · ' + got + '/' + total, 'ok');
    if (got >= total) {
      CF.app.toast(t('msg.shardAll'), 'ok');
      CF.audio.play(CF.cues.confirm, { gain: 0.7 });
    }
    if (this.online && this.isHost) this.online.markDirty();
  };

  Game.prototype.checkHazards = function () {
    var orbs = this.level.orbs.slice();
    if (this.difficulty.extraHazards) orbs = orbs.concat(this.level.extraOrbs || []);
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      var ox = o.x + Math.sin(this.time * o.speed + o.phase) * (o.maxX - o.minX) / 2;
      var oy = o.y + Math.cos(this.time * o.speed * 0.7 + o.phase) * (o.maxY != null ? (o.maxY - o.minY) / 2 : 8);
      for (var c = 0; c < this.localChars.length; c++) {
        var ch = this.chars[this.localChars[c]];
        if (!ch) continue;
        if (this.time < ch.immuneUntil) continue;
        if (E.circleRect(ox, oy, o.r + 3, ch)) {
          this.hitHazard(ch, this.difficulty.hazardDamage);
          break;
        }
      }
    }
  };

  Game.prototype.hitHazard = function (ch, damage) {
    if (this.time < ch.immuneUntil) return;
    ch.immuneUntil = this.time + 1.1;
    this.fx.burst(ch.x + ch.w / 2, ch.y + ch.h / 2, '#ff5b6e', 22, 140);
    this.shake = 7;
    CF.audio.play(CF.cues.error, { gain: 0.6 });
    if (this.online && !this.isHost) {
      this.online.send({ t: 'action', kind: 'hit', amount: damage });
    } else {
      this.addFracture(damage);
    }
    this.respawn(ch);
  };

  Game.prototype.addFracture = function (n) {
    if (this.victoryAt) return;
    this.fracture = E.clamp(this.fracture + n, 0, 100);
    if (this.fracture >= 100) this.collapse();
  };

  Game.prototype.updateFracture = function (dt) {
    if (this.completed || this.victoryAt) return;
    if (this.online && !this.isHost) return;
    var rate = this.difficulty.fractureRate * (this.level.isFinal ? 0.6 : 1);
    this.fracture = E.clamp(this.fracture + rate * dt, 0, 100);
    if (this.fracture >= 100) this.collapse();
  };

  Game.prototype.collapse = function () {
    if (this.time < this.collapseUntil) return;
    this.fracture = 40;
    this.collapseUntil = this.time + 2.8;
    this.shake = 12;
    this.respawnLocal();
    for (var i = 0; i < 5; i++) {
      this.fx.burst(400 + Math.random() * 200, 120 + Math.random() * 200, '#ff5b6e', 16, 160);
    }
    CF.audio.play(CF.cues.collapse, { gain: 0.85 });
    if (this.online && this.isHost) {
      if (this.online.markDirty) this.online.markDirty();
      if (this.online.send) this.online.send({ t: 'collapse', until: this.time + 2.8 });
    }
  };

  Game.prototype.checkCheckpoints = function () {
    for (var i = 0; i < this.localChars.length; i++) {
      var ch = this.chars[this.localChars[i]];
      if (!ch || !ch.onGround) continue;
      var idx = this.checkpointFor(ch.x + ch.w / 2);
      if (idx > this.checkpointIndex) {
        this.checkpointIndex = idx;
        var cp = this.level.checkpoints[idx];
        this.fx.burst(cp.x, cp.y - 30, '#57ffa8', 22, 100);
        CF.app.toast(t('msg.checkpoint'), 'ok');
      }
    }
  };

  Game.prototype.allShards = function () {
    if (!this.level.shards.length) return true;
    for (var i = 0; i < this.level.shards.length; i++) {
      if (!this.shards[this.level.shards[i].id]) return false;
    }
    return true;
  };

  Game.prototype.checkExit = function () {
    if (this.completed) return;
    if (this.level.isFinal) return;
    if (!this.allShards()) return;
    var ex = this.level.exit;
    for (var i = 0; i < this.localChars.length; i++) {
      var ch = this.chars[this.localChars[i]];
      if (!ch) continue;
      var dx = (ch.x + ch.w / 2) - ex.x;
      var dy = (ch.y + ch.h / 2) - (ex.y - 44);
      if (dx * dx + dy * dy < 52 * 52) {
        this.completeLevel();
        return;
      }
    }
  };

  Game.prototype.completeLevel = function () {
    if (this.completed) return;
    this.completed = true;
    this.completedAt = this.time;
    this.fx.burst(this.level.exit.x, this.level.exit.y - 44, '#7ef7ff', 40, 200);
    CF.audio.play(CF.cues.confirm, { gain: 0.8 });
    if (this.cfg.onComplete) {
      this.cfg.onComplete({ levelIndex: this.levelIndex, crystals: this.levelIndex + 1 });
    }
  };

  Game.prototype.updateCamera = function (dt, snap) {
    var target = 0;
    if (this.mode === 'coop') {
      var sum = 0;
      var n = 0;
      for (var i = 0; i < this.localChars.length; i++) {
        var ch = this.chars[this.localChars[i]];
        if (ch) { sum += ch.x + ch.w / 2; n++; }
      }
      target = (n ? sum / n : 480) - E.W / 2;
    } else {
      var a = this.chars[this.activeChar];
      target = (a ? a.x + a.w / 2 : 480) - E.W / 2;
    }
    var max = Math.max(0, this.level.width - E.W);
    target = E.clamp(target, 0, max);
    if (snap) this.camera.x = target;
    else this.camera.x = E.lerp(this.camera.x, target, Math.min(1, dt * 6.5));
  };

  Game.prototype.updateAmbient = function (dt) {
    for (var i = 0; i < this.ambient.length; i++) {
      var p = this.ambient[i];
      p.y -= p.sp * dt;
      p.x += Math.sin(this.time * 0.7 + p.ph) * 4 * dt;
      if (p.y < -10) { p.y = 550; p.x = Math.random() * 1000; }
    }
  };

  Game.prototype.render = function (ctx) {
    if (!this.level) return;
    var level = this.level;
    var theme = CF.themes[level.era];
    var camX = this.camera.x;
    var camY = 0;
    var quality = CF.store.settings.quality;
    var reduced = CF.store.settings.reduceMotion;
    var shakeX = 0, shakeY = 0;
    if (this.shake > 0 && CF.store.settings.shake && !reduced) {
      shakeX = (Math.random() - 0.5) * this.shake;
      shakeY = (Math.random() - 0.5) * this.shake * 0.6;
    }

    ctx.clearRect(0, 0, E.W, E.H);
    E.drawBackground(ctx, level, camX, this.time, quality, reduced);

    ctx.save();
    ctx.translate(-Math.round(camX) + shakeX, -Math.round(camY) + shakeY);

    E.drawCore(ctx, level, this.time);

    var i;
    var reveal = this.time < this.echoUntil;
    for (i = 0; i < level.platforms.length; i++) {
      var p = level.platforms[i];
      if (p.x + p.w < camX - 40 || p.x > camX + E.W + 40) continue;
      E.drawPlatform(ctx, p, level.era, this.time, { quality: quality, revealed: reveal, faint: this.difficulty.hintLevel === 'full' });
    }
    for (i = 0; i < level.hidden.length; i++) {
      var hp = level.hidden[i];
      if (hp.x + hp.w < camX - 40 || hp.x > camX + E.W + 40) continue;
      E.drawPlatform(ctx, hp, level.era, this.time, {
        quality: quality,
        revealed: reveal,
        faint: this.difficulty.hintLevel !== 'minimal'
      });
    }
    for (var mid in this.movingPos) {
      if (!Object.prototype.hasOwnProperty.call(this.movingPos, mid)) continue;
      var mp = this.movingPos[mid];
      E.drawPlatform(ctx, { x: mp.x, y: mp.y, w: mp.w, h: mp.h, kind: 'moving' }, level.era, this.time, { quality: quality });
    }
    for (i = 0; i < level.bridges.length; i++) {
      var br = level.bridges[i];
      if (!this.bridges[br.id]) continue;
      for (var k = 0; k < br.pieces.length; k++) {
        var bp = br.pieces[k];
        E.drawPlatform(ctx, bp, level.era, this.time, { quality: quality });
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.15 * Math.sin(this.time * 4 + k);
        ctx.fillStyle = theme.accent2;
        ctx.fillRect(bp.x, bp.y - 1, bp.w, 1);
        ctx.restore();
      }
    }

    for (i = 0; i < level.plates.length; i++) {
      var plate = level.plates[i];
      E.drawPlate(ctx, plate, this.platePressed(plate.id), this.time);
    }
    for (i = 0; i < level.checkpoints.length; i++) {
      var cp = level.checkpoints[i];
      E.drawCheckpoint(ctx, cp, i <= this.checkpointIndex, this.time);
    }
    for (i = 0; i < level.devices.length; i++) {
      var dev = level.devices[i];
      E.drawDevice(ctx, dev, !!this.devices[dev.id], this.time, level.era);
    }
    for (i = 0; i < level.doors.length; i++) {
      var door = level.doors[i];
      E.drawDoor(ctx, door, this.doorAnim[door.id] || 0, this.time, level.era);
    }
    for (i = 0; i < level.shards.length; i++) {
      var sh = level.shards[i];
      if (this.shards[sh.id]) continue;
      if (sh.x + 30 < camX || sh.x - 30 > camX + E.W) continue;
      E.drawShard(ctx, sh, this.time, reveal);
    }

    var orbs = level.orbs.slice();
    if (this.difficulty.extraHazards) orbs = orbs.concat(level.extraOrbs || []);
    for (i = 0; i < orbs.length; i++) E.drawOrb(ctx, orbs[i], this.time, level.era);

    if (!level.isFinal) {
      var active = this.allShards();
      CF.portal.drawWorld(ctx, level.exit.x, level.exit.y - 42, 104, active ? '#57ffa8' : '#3fa9ff', this.time, active);
      ctx.save();
      E.txt(ctx, active ? t('msg.portalOpen') : t('hint.exit'), level.exit.x, level.exit.y + 18, 8.5, active ? '#57ffa8' : '#8ea2c7', 'center');
      ctx.restore();
    }

    for (i = 0; i < this.markers.length; i++) {
      var mk = this.markers[i];
      if (mk.until < this.time) continue;
      this.drawMarker(ctx, mk);
    }

    var order = ['p1', 'p2', 'p3'];
    for (i = 0; i < order.length; i++) {
      var ch = this.chars[order[i]];
      if (!ch) continue;
      var frame;
      if (!ch.onGround) frame = 2;
      else if (Math.abs(ch.vx) > 12) frame = Math.floor(ch.anim) % 6;
      else frame = 0;
      var bob = ch.onGround && Math.abs(ch.vx) <= 12 ? Math.sin(this.time * 2.4 + (ch.id === 'p2' ? 1 : 0)) * 0.7 : 0;
      var alpha = ch.remote ? 0.9 : 1;
      E.drawCharacter(ctx, ch.def, ch.x + ch.w / 2, ch.y + ch.h + bob, ch.dir, frame, {
        time: this.time,
        alpha: alpha
      });
      ctx.save();
      var label = ch.remote && this.remoteNames[ch.id] ? this.remoteNames[ch.id] : ch.def.slot;
      var labelColor = ch.id === this.activeChar && this.mode !== 'coop' ? '#ffffff' : ch.def.accent;
      E.txt(ctx, label, ch.x + ch.w / 2, ch.y - 6, 7.5, labelColor, 'center');
      if (ch.remote) {
        ctx.fillStyle = ch.def.accent;
        ctx.fillRect(ch.x + ch.w / 2 - 3, ch.y - 3, 6, 1);
      }
      ctx.restore();
    }

    if (reveal) this.drawEcho(ctx);
    this.fx.draw(ctx, 0, 0);

    ctx.restore();

    this.drawAmbient(ctx, level, camX);
    this.drawHUD(ctx);

    if (this.time < this.collapseUntil) this.drawCollapse(ctx);
    if (this.victoryAt) this.drawVictoryGlow(ctx);
  };

  Game.prototype.drawMarker = function (ctx, mk) {
    var life = Math.max(0, mk.until - this.time);
    var alpha = life > 10 ? (12 - life) / 2 : Math.min(1, life);
    var col = mk.char === 'p3' ? '#b98bff' : '#52f0e6';
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(mk.x, mk.y - 18 + Math.sin(this.time * 3) * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = col;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3, -3); ctx.lineTo(3, 3);
    ctx.moveTo(3, -3); ctx.lineTo(-3, 3);
    ctx.stroke();
    ctx.restore();
  };

  Game.prototype.drawEcho = function (ctx) {
    var ch = this.chars.p1;
    if (!ch) return;
    var cx = ch.x + ch.w / 2;
    var cy = ch.y + ch.h / 2;
    var left = this.echoUntil - this.time;
    var pulse = 1 - ((this.time * 0.7) % 1);
    var r = 60 + pulse * (this.difficulty.echoRadius || 300);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(82,240,230,' + (0.28 * (1 - pulse)) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(126,247,255,.12)';
    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.stroke();
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
    g.addColorStop(0, 'rgba(82,240,230,.10)');
    g.addColorStop(1, 'rgba(82,240,230,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 120, cy - 120, 240, 240);
    ctx.restore();
    if (left < 1.4) {
      ctx.save();
      ctx.globalAlpha = Math.abs(Math.sin(this.time * 10)) * 0.15;
      ctx.fillStyle = '#52f0e6';
      ctx.fillRect(0, 0, E.W, E.H);
      ctx.restore();
    }
  };

  Game.prototype.drawAmbient = function (ctx, level, camX) {
    if (CF.store.settings.reduceMotion) return;
    var q = CF.store.settings.quality;
    if (q === 'low') return;
    var theme = CF.themes[level.era];
    var col = level.era === 'nucleo' ? 'rgba(120,220,255,.35)' : level.era === 'prehistoria' ? 'rgba(255,176,102,.35)' : 'rgba(215,185,138,.3)';
    ctx.save();
    for (var i = 0; i < this.ambient.length; i++) {
      var p = this.ambient[i];
      var x = (p.x - camX * 0.25) % (E.W + 40);
      if (x < -20) x += E.W + 40;
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(this.time + p.ph);
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(x), Math.round(p.y), p.sz, p.sz);
    }
    ctx.restore();
    void theme;
  };

  Game.prototype.drawHUD = function (ctx) {
    var level = this.level;
    var quality = CF.store.settings.quality;
    var pad = 12;
    var i;
    E.panel(ctx, pad, pad, 286, 50, 0.62);
    E.txt(ctx, t('hud.era') + ' �� ' + t(level.nameKey), pad + 12, pad + 18, 8.5, '#a9bbd8');
    E.txt(ctx, t(level.whenKey), pad + 12, pad + 39, 11, '#e9f2ff');

    var iconsX = 198;
    if (level.isFinal) {
      E.txt(ctx, t('hud.seal'), pad + 12, pad + 63, 8, '#8ea2c7');
    } else {
      for (i = 0; i < level.shards.length; i++) {
        var got = !!this.shards[level.shards[i].id];
        this.drawHudGem(ctx, iconsX + i * 25, pad + 27, got);
      }
    }

    E.panel(ctx, E.W - 224 - pad, pad, 224, 50, 0.62);
    E.txt(ctx, t('hud.fracture'), E.W - 224 - pad + 12, pad + 18, 8.5, '#a9bbd8');
    var frac = Math.round(this.fracture);
    E.txt(ctx, frac + '%', E.W - pad - 12, pad + 18, 9.5, this.fracture > 75 ? '#ff5b6e' : this.fracture > 45 ? '#ffbf5e' : '#52f0e6', 'right');
    var bw = 200;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(E.W - 224 - pad + 12, pad + 30, bw, 6);
    var fg = ctx.createLinearGradient(E.W - 224 - pad + 12, 0, E.W - 224 - pad + 12 + bw, 0);
    fg.addColorStop(0, '#52f0e6');
    fg.addColorStop(0.55, '#ffbf5e');
    fg.addColorStop(1, '#ff5b6e');
    ctx.fillStyle = fg;
    ctx.fillRect(E.W - 224 - pad + 12, pad + 30, bw * this.fracture / 100, 6);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (var x = 0; x < 10; x++) ctx.fillRect(E.W - 224 - pad + 12 + x * 20, pad + 30, 1, 6);
    ctx.restore();

    if (this.mode !== 'coop') {
      var active = this.chars[this.activeChar];
      if (active) {
        E.panel(ctx, pad, E.H - 84, 300, 72, 0.66);
        E.drawCharacter(ctx, active.def, pad + 28, E.H - 20, 1, 0, { height: 42, time: this.time });
        E.txt(ctx, t(active.def.nameKey), pad + 54, E.H - 56, 9.5, active.def.accent);
        E.txt(ctx, t(active.def.abilityKey), pad + 54, E.H - 40, 8.5, '#e9f2ff');
        var cd = this.abilityCooldown(active);
        var txt = cd > 0 ? t('hud.cooldown') + ' ' + cd.toFixed(1) + 's' : t('hud.ready');
        E.txt(ctx, txt, pad + 54, E.H - 25, 8, cd > 0 ? '#ffbf5e' : '#57ffa8');
        if (this.time < this.echoUntil) {
          E.txt(ctx, 'ECO ' + Math.ceil(this.echoUntil - this.time) + 's', pad + 200, E.H - 56, 7.5, '#52f0e6');
        }
      }
      if (this.mode === 'solo' || (this.mode === 'online' && this.localChars.length > 1)) {
        E.txt(ctx, t('hud.switch'), E.W - pad - 12, E.H - 20, 7.5, '#8ea2c7', 'right');
      }
    } else {
      E.panel(ctx, pad, E.H - 88, 420, 76, 0.62);
      for (i = 0; i < 3; i++) {
        var cc = this.chars['p' + (i + 1)];
        var ox = pad + 30 + i * 132;
        E.drawCharacter(ctx, cc.def, ox, E.H - 22, 1, 0, { height: 40, time: this.time });
        E.txt(ctx, cc.def.slot, ox + 18, E.H - 57, 8, cc.def.accent);
        E.txt(ctx, t(cc.def.abilityKey), ox + 18, E.H - 42, 7.5, '#8ea2c7');
        E.txt(ctx, COOP_CONTROLS[cc.id].ability.replace('Key', ''), ox + 18, E.H - 27, 7.5, '#e9f2ff');
      }
    }

    var hint = this.contextHint();
    if (hint) {
      var hw = 640;
      var hx = (E.W - hw) / 2;
      E.panel(ctx, hx, E.H - 132, hw, 42, 0.7);
      E.txt(ctx, hint, E.W / 2, E.H - 107, 8.5, '#d6e2f5', 'center');
      var ctrl = this.mode === 'coop' ? t('hint.coop') : this.mode === 'online' ? t('hint.online') : t('hint.move');
      E.txt(ctx, ctrl, E.W / 2, E.H - 92, 7, '#7183a6', 'center');
    }

    if (this.mode === 'online') {
      var st = this.online && this.online.players ? this.online.players.length : this.localChars.length;
      var ping = this.online && this.online.ping != null ? this.online.ping + 'ms' : '—';
      var label = 'ONLINE · ' + st + '/3 · ' + ping;
      E.txt(ctx, label, E.W / 2, 20, 8, '#57ffa8', 'center');
      if (this.online && this.online.players) {
        var names = [];
        for (var pi = 0; pi < this.online.players.length; pi++) {
          var pl = this.online.players[pi];
          names.push(pl.name + ' [' + (pl.char || '').toUpperCase() + ']');
        }
        E.txt(ctx, names.join('   ·   '), E.W / 2, 34, 7.5, '#a9bbd8', 'center');
      }
    } else {
      var modeKey = this.mode === 'coop' ? 'hud.coop' : 'hud.solo';
      E.txt(ctx, t(modeKey) + ' · ' + t(this.difficulty.key), E.W / 2, 20, 7.5, '#7183a6', 'center');
    }

    if (this.level.sealWindow && this.sealDeadline) {
      var remain = Math.max(0, this.sealDeadline - this.time);
      E.panel(ctx, E.W / 2 - 130, 48, 260, 32, 0.7);
      E.txt(ctx, t('hud.sealWindow') + ' · ' + remain.toFixed(1) + 's', E.W / 2, 68, 8, '#b98bff', 'center');
    }

    if (this.echoCooldownUntil > this.time) {
      // hint only in the ability panel
    }
    void quality;
  };

  Game.prototype.drawHudGem = function (ctx, x, y, got) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    if (got) {
      ctx.fillStyle = '#a9e6ff';
      ctx.shadowColor = '#7ef7ff';
      ctx.shadowBlur = 10;
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(169,230,255,.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  };

  Game.prototype.abilityCooldown = function (ch) {
    if (!ch) return 0;
    if (ch.def.ability === 'echo') {
      return Math.max(0, (this.echoCooldownUntil || 0) - this.time);
    }
    return 0;
  };

  Game.prototype.contextHint = function () {
    var lvl = this.level;
    if (lvl.isFinal) {
      if (this.victoryAt) return t('msg.seal');
      var activeAltars = 0;
      for (var a = 0; a < lvl.devices.length; a++) {
        if (lvl.devices[a].type === 'altar' && this.devices[lvl.devices[a].id]) activeAltars++;
      }
      if (activeAltars === 0) return this.difficulty.hintLevel === 'minimal' ? t('hint.altar') : t('hint.altar');
      return t('hint.altarWindow');
    }
    if (this.allShards()) return t('hint.exitOpen');
    var ch = this.chars[this.activeChar];
    var x = ch ? ch.x : 0;
    var hint;
    if (x < 1050) hint = 'hint.echo';
    else if (x < 1700) hint = 'hint.echo';
    else if (x < 1950) hint = 'hint.plates';
    else if (x < 2200) hint = 'hint.glyph';
    else hint = 'hint.harmonic';
    if (this.difficulty.hintLevel === 'minimal') {
      if (hint === 'hint.echo') return t('hint.hidden');
      if (hint === 'hint.plates') return t('hint.platesShort');
      if (hint === 'hint.glyph') return t('hint.glyphShort');
      return t('hint.harmonicShort');
    }
    if (this.mode === 'online' && this.localChars.length < 3) {
      if (x < 1200) return t('hint.onlineFew');
    }
    return t(hint);
  };

  Game.prototype.drawCollapse = function (ctx) {
    var a = Math.min(1, (this.collapseUntil - this.time) / 0.6);
    ctx.save();
    ctx.globalAlpha = 0.78 * a;
    ctx.fillStyle = '#06030a';
    ctx.fillRect(0, 0, E.W, E.H);
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,91,110,.55)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 16; i++) {
      var y = (i * 37 + this.time * 40) % E.H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(E.W, y + 8);
      ctx.stroke();
    }
    E.txt(ctx, t('msg.collapse'), E.W / 2, E.H / 2 - 14, 20, '#ff8a99', 'center', '700');
    E.txt(ctx, t('msg.collapseDesc'), E.W / 2, E.H / 2 + 24, 8.5, '#c6d5ec', 'center');
    ctx.restore();
  };

  Game.prototype.drawVictoryGlow = function (ctx) {
    var k = Math.min(1, (this.time - (this.victoryAt - 4.6)) / 4.6);
    ctx.save();
    ctx.globalAlpha = 0.25 + k * 0.35;
    var g = ctx.createRadialGradient(E.W / 2, E.H / 2, 10, E.W / 2, E.H / 2, E.W * 0.6);
    g.addColorStop(0, 'rgba(180,255,255,.35)');
    g.addColorStop(0.5, 'rgba(90,180,255,.12)');
    g.addColorStop(1, 'rgba(20,30,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, E.W, E.H);
    ctx.restore();
  };

  Game.prototype.getLocalPositions = function () {
    var out = {};
    for (var i = 0; i < this.localChars.length; i++) {
      var ch = this.chars[this.localChars[i]];
      if (!ch) continue;
      out[ch.id] = {
        x: Math.round(ch.x * 10) / 10,
        y: Math.round(ch.y * 10) / 10,
        dir: ch.dir,
        anim: ch.anim,
        onGround: ch.onGround,
        char: ch.id,
        name: this.playerName
      };
    }
    return out;
  };

  Game.prototype.getWorldSnapshot = function () {
    return {
      levelIndex: this.levelIndex,
      shards: Object.assign({}, this.shards),
      devices: Object.assign({}, this.devices),
      doors: Object.assign({}, this.doors),
      bridges: Object.assign({}, this.bridges),
      fracture: Math.round(this.fracture * 10) / 10,
      echoUntil: Math.max(0, this.echoUntil - this.time),
      sealDeadline: this.sealDeadline ? Math.max(0, this.sealDeadline - this.time) : 0,
      collapseUntil: this.collapseUntil > this.time ? (this.collapseUntil - this.time) : 0,
      markers: this.markers.map(function (m) {
        return { x: m.x, y: m.y, char: m.char, until: Math.max(0, m.until - this.time) };
      }),
      completed: this.completed
    };
  };

  Game.prototype.applyWorld = function (w) {
    if (!w) return;
    if (w.levelIndex != null && w.levelIndex !== this.levelIndex) return;
    this.shards = Object.assign({}, w.shards || {});
    this.devices = Object.assign({}, w.devices || {});
    this.doors = Object.assign({}, w.doors || {});
    this.bridges = Object.assign({}, w.bridges || {});
    if (w.fracture != null) this.fracture = w.fracture;
    if (w.echoUntil != null) {
      var curEcho = Math.max(0, this.echoUntil - this.time);
      if (w.echoUntil > curEcho + 0.2) this.echoUntil = this.time + w.echoUntil;
    }
    if (w.sealDeadline != null) {
      var curSeal = this.sealDeadline ? Math.max(0, this.sealDeadline - this.time) : 0;
      if (w.sealDeadline <= 0) this.sealDeadline = 0;
      else if (w.sealDeadline > curSeal + 0.2) this.sealDeadline = this.time + w.sealDeadline;
    }
    if (w.collapseUntil != null) {
      var curCol = this.collapseUntil ? Math.max(0, this.collapseUntil - this.time) : 0;
      if (w.collapseUntil > curCol + 0.35) {
        this.collapseUntil = this.time + w.collapseUntil;
        this.respawnLocal();
        this.shake = 9;
      }
    }
    if (w.markers) {
      var nowT = this.time;
      var nextMarkers = [];
      for (var mi = 0; mi < w.markers.length; mi++) {
        var inc = w.markers[mi];
        var existing = null;
        for (var mj = 0; mj < this.markers.length; mj++) {
          var old = this.markers[mj];
          if (old.char === inc.char && Math.abs(old.x - inc.x) < 14 && Math.abs(old.y - inc.y) < 14) {
            existing = old;
            break;
          }
        }
        nextMarkers.push(existing || { x: inc.x, y: inc.y, char: inc.char, until: nowT + (inc.until || 0), born: nowT });
      }
      this.markers = nextMarkers;
    }
    if (w.completed && !this.completed) {
      this.completed = true;
    }
  };

  Game.prototype.applyRemotes = function (positions) {
    if (!positions) return;
    for (var id in positions) {
      if (!Object.prototype.hasOwnProperty.call(positions, id)) continue;
      if (this.owner[id]) continue;
      var ch = this.chars[id];
      if (!ch) continue;
      var p = positions[id];
      ch.x = p.x;
      ch.y = p.y;
      ch.dir = p.dir || 1;
      ch.anim = p.anim || 0;
      ch.onGround = !!p.onGround;
      if (p.name) this.remoteNames[id] = p.name;
    }
  };

  Game.prototype.onlineAction = function (action) {
    if (!this.online || !this.isHost || !action) return;
    if (action.kind === 'device') {
      var dev = null;
      for (var i = 0; i < this.level.devices.length; i++) {
        if (this.level.devices[i].id === action.id) { dev = this.level.devices[i]; break; }
      }
      if (!dev) return;
      var ch = this.chars[dev.char || action.char];
      if (dev.type === 'plate') return;
      this.activateDevice(action.id);
      if (this.online.markDirty) this.online.markDirty();
      void ch;
    } else if (action.kind === 'shard') {
      var shard = null;
      for (var s = 0; s < this.level.shards.length; s++) {
        if (this.level.shards[s].id === action.id) { shard = this.level.shards[s]; break; }
      }
      if (!shard) return;
      var claimant = this.chars[action.char];
      if (claimant) {
        var dx = (claimant.x + claimant.w / 2) - shard.x;
        var dy = (claimant.y + claimant.h / 2) - shard.y;
        if (dx * dx + dy * dy > 190 * 190) return;
      }
      this.collectShard(action.id);
    } else if (action.kind === 'echo') {
      this.echoUntil = this.time + 10;
      if (this.online.markDirty) this.online.markDirty();
    } else if (action.kind === 'marker') {
      this.addMarker(action.x, action.y, action.char);
      if (this.online.markDirty) this.online.markDirty();
    } else if (action.kind === 'hit') {
      this.addFracture(Number(action.amount) || 8);
      if (this.online.markDirty) this.online.markDirty();
    }
  };

  Game.prototype.isNearExit = function () {
    return this.allShards() && !this.level.isFinal;
  };

  Game.prototype.syncTime = function (world) {
    void world;
  };

  function instantiate() {
    return new Game();
  }

  CF.game = instantiate();
  CF.Game = Game;
})();
