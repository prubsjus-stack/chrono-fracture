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
    this.taskOpen = false;
  }

  Game.prototype.start = function (cfg) {
    this.destroy();
    this.cfg = cfg || {};
    this.mode = this.cfg.mode || 'solo';
    this.difficulty = CF.difficulties[this.cfg.difficulty] || CF.difficulties.normal;
    this.levelIndex = this.cfg.levelIndex || 0;
    this.level = CF.levels[this.levelIndex];
    this.localChars = (this.cfg.localChars && this.cfg.localChars.length ? this.cfg.localChars : ['p1']).slice();
    var soloChar = 'p1';
    for (var si = 0; si < CF.characters.length; si++) {
      if (CF.characters[si].id === this.cfg.startChar) soloChar = this.cfg.startChar;
    }
    if (this.mode === 'solo') {
      this.localChars = [soloChar];
    }
    if (this.mode === 'coop') this.localChars = ['p1', 'p2', 'p3'];
    this.startChar = this.cfg.startChar && this.localChars.indexOf(this.cfg.startChar) >= 0 ? this.cfg.startChar : this.localChars[0];
    this.activeChar = this.startChar;
    if (this.mode === 'online') this.localChars = [this.startChar];
    this.online = this.cfg.online || null;
    this.isHost = !!(this.online && this.online.isHost);
    this.playerName = this.cfg.name || '';
    this.altarBy = {};

    this.time = 0;
    this.fracture = 0;
    this.shards = {};
    this.devices = {};
    this.altars = {};
    this.doors = {};
    this.bridges = {};
    this.soloPlates = {};
    this.links = {};
    this.initLinks();
    this.echoUntil = 0;
    this.echoCooldownUntil = 0;
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
    this.taskOpen = false;
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
    if (this.mode === 'online') return false;
    if (!this.chars[id] || this.localChars.indexOf(id) >= 0) return false;
    this.localChars.push(id);
    this.owner[id] = true;
    this.chars[id].remote = false;
    if (!this.activeChar) this.activeChar = id;
    return true;
  };

  function linkHash(str, salt) {
    var h = 2166136261 ^ salt;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h >>>= 0;
    return (h % 10000) / 10000;
  }

  Game.prototype.initLinks = function () {
    this.links = {};
    this.linkSeed = this.online
      ? ((this.online.code || 'room') + '#' + this.levelIndex)
      : (Math.round(Math.random() * 1e9).toString(36) + '#' + this.levelIndex);
    this.linkSeed += '#' + this.difficulty.id;
    var level = this.level;
    if (!level) return;
    for (var i = 0; i < level.devices.length; i++) {
      var d = level.devices[i];
      if (d.type !== 'link') continue;
      var pair = d.pair;
      var base = this.linkSeed + '#' + pair;
      if (!pair || this.links[pair]) continue;
      var entry;
      if (d.mode === 'code') {
        var digits = [];
        for (var g = 0; g < 4; g++) digits.push(Math.floor(linkHash(base + '#d' + g, 7) * 9));
        var blanks = [];
        for (var b = 0; b < digits.length && blanks.length < 2; b++) {
          if (linkHash(base + '#b' + b, 19) < 0.5) blanks.push(b);
        }
        if (blanks.length < 2) blanks = [0, digits.length > 2 ? digits.length - 1 : 1];
        entry = { correct: -1, code: digits, blanks: blanks, vision: 0, by: '', byClient: '', solved: false };
      } else {
        entry = { correct: Math.floor(linkHash(base, 3) * 3), code: [], blanks: [], vision: 0, by: '', byClient: '', solved: false };
      }
      this.links[pair] = entry;
    }
  };

  Game.prototype.linkReady = function (dev, ch) {
    if (!dev || dev.type !== 'link') return true;
    var l = this.links[dev.pair];
    if (dev.role !== 'action') return true;
    if (!l || !l.vision || this.time > l.vision) {
      CF.app.toast(t('msg.linkNeed'), 'err');
      return false;
    }
    if (this.online && this.online.myId) {
      if (l.byClient && l.byClient === this.online.myId) {
        CF.app.toast(t('msg.linkNeed'), 'err');
        return false;
      }
      return true;
    }
    if (l.by && ch && l.by === ch.id) {
      CF.app.toast(t('msg.linkNeed'), 'err');
      return false;
    }
    return true;
  };

  Game.prototype.initAmbient = function () {
    var q = CF.store.settings.quality;
    var count = q === 'low' ? 30 : q === 'medium' ? 62 : 94;
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
    if (CF.tasks) CF.tasks.close();
    this.taskOpen = false;
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
    if (this.taskOpen) {
      if (this.input) this.input.endFrame();
      return;
    }
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

  Game.prototype.taskTypeFor = function (dev) {
    if (!dev) return null;
    if (dev.type === 'harmonic') return 'resonance';
    if (dev.type === 'glyph') return 'glyph';
    if (dev.type === 'link') return 'link';
    if (dev.type === 'altar') {
      if (dev.char === 'p1') return 'echo';
      if (dev.char === 'p2') return 'resonance';
      return 'glyph';
    }
    return null;
  };

  Game.prototype.beginTask = function (dev) {
    if (!dev || this.taskOpen || this.devices[dev.id]) return;
    var type = this.taskTypeFor(dev);
    if (!type || !CF.tasks) {
      this.tryActivateDevice(dev);
      return;
    }
    var self = this;
    this.taskOpen = true;
    if (this.input) this.input.enabled = false;
    var opts = {
      char: this.activeChar,
      type: type,
      difficulty: this.difficulty.id,
      device: dev.id,
      onComplete: function () {
        self.taskOpen = false;
        if (self.input) self.input.enabled = true;
        self.tryActivateDevice(dev);
      },
      onCancel: function () {
        self.taskOpen = false;
        if (self.input) self.input.enabled = true;
      }
    };
    if (dev.type === 'link') {
      var l = this.links[dev.pair];
      opts.link = {
        role: dev.role,
        mode: dev.mode,
        pair: dev.pair,
        correct: l ? l.correct : 0,
        code: l ? l.code : [],
        blanks: l ? l.blanks : []
      };
      if (opts.link.mode === 'orbs') opts.link.code = [];
    }
    CF.tasks.open(opts);
  };

  Game.prototype.useAbility = function (ch) {
    if (!ch || this.time < this.collapseUntil) return;
    var cx = ch.x + ch.w / 2;
    var cy = ch.y + ch.h / 2;

    var linkDev = this.nearDevice(ch, ['link'], 92);
    if (linkDev) {
      if (!this.linkReady(linkDev, ch)) return;
      this.beginTask(linkDev);
      return;
    }

    var dev = this.nearDevice(ch, ['harmonic', 'glyph'], 96);
    if (dev) {
      this.beginTask(dev);
      return;
    }

    var altar = this.nearDevice(ch, ['altar'], 92);
    if (altar) {
      if (altar.char && altar.char !== ch.id) {
        CF.app.toast(t('msg.altarNeed', { char: altar.char.toUpperCase() }), 'err');
        return;
      }
      this.beginTask(altar);
      return;
    }

    if (this.time < this.echoCooldownUntil) return;
    this.echoCooldownUntil = this.mode === 'coop'
      ? this.time + ch.def.abilityCooldown
      : this.time + 4;
    if (this.online && !this.isHost) {
      this.online.send({ t: 'action', kind: 'echo' });
      this.fx.burst(cx, cy, ch.def.accent, 26, 160);
      CF.app.toast(t('msg.echo'), 'ok');
      return;
    }
    if (this.online && this.isHost) this.online.send({ t: 'echoState', until: this.time + (this.mode === 'coop' ? ch.def.abilityDuration : 10) });
    this.echoUntil = this.time + (this.mode === 'coop' ? ch.def.abilityDuration : 10);
    this.fx.burst(cx, cy, ch.def.accent, 30, 170);
    this.ring(cx, cy, ch.def.accent);
    CF.audio.play(CF.cues.echo, { gain: 0.7 });
    CF.app.toast(t('msg.echo'), 'ok');
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

  Game.prototype.activateDevice = function (id, opts) {
    opts = opts || {};
    var dev = null;
    for (var i = 0; i < this.level.devices.length; i++) {
      if (this.level.devices[i].id === id) { dev = this.level.devices[i]; break; }
    }
    if (!dev || this.devices[id]) return;
    if (dev.type === 'link') {
      var l = this.links[dev.pair];
      if (!l) return;
      if (dev.role === 'vision') {
        l.vision = this.time + 60;
        l.by = opts.byChar || this.activeChar || '_local';
        l.byClient = (opts.byClient !== undefined ? opts.byClient : (this.online && this.online.myId) || '_local');
        this.devices[id] = true;
        CF.app.toast(t('msg.linkVision'), 'ok');
        CF.audio.play(CF.cues.door, { gain: 0.6 });
        this.fx.burst(dev.x, dev.y - 26, '#52f0e6', 22, 120);
        this.ring(dev.x, dev.y - 20, '#52f0e6');
        if (this.online && this.isHost) this.online.markDirty();
        return;
      }
      if (!this.linkReady(dev, this.chars[opts.byChar || this.activeChar])) return;
      l.solved = true;
      this.devices[id] = true;
      for (var j = 0; j < this.level.doors.length; j++) {
        if (this.level.doors[j].type === 'link' && this.level.doors[j].pair === dev.pair) {
          this.doors[this.level.doors[j].id] = true;
        }
      }
      CF.app.toast(t('msg.linkSolved'), 'ok');
      CF.audio.play(CF.cues.door, { gain: 0.7 });
      this.fx.burst(dev.x, dev.y - 26, '#57ffa8', 26, 140);
      this.ring(dev.x, dev.y - 20, '#57ffa8');
      this.shake = 3;
      if (this.online && this.isHost) this.online.markDirty();
      return;
    }
    this.devices[id] = true;
    if (dev.type === 'altar') {
      this.altars[id] = true;
      this.altarBy[id] = { cid: opts.byChar || this.activeChar || '_local', client: opts.byClient !== undefined ? opts.byClient : (this.online && this.online.myId) || '_local' };
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
    var active = [];
    var actors = {};
    for (var i = 0; i < this.level.devices.length; i++) {
      var d = this.level.devices[i];
      if (d.type !== 'altar' || !this.devices[d.id]) continue;
      active.push(d.id);
      var aby = this.altarBy[d.id] || {};
      actors[(aby.client && aby.client !== '_local') ? 'c:' + aby.client : 'p:' + (aby.cid || d.id)] = true;
    }
    var distinct = Object.keys(actors).length;
    if (active.length >= 2 && distinct >= 2 && !this.victoryAt) {
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
          this.altarBy[d.id] = null;
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
          var plateId = d.plates[p];
          var plateOn = this.platePressed(plateId) || (this.mode === 'solo' && !!this.soloPlates[plateId]);
          if (plateOn) {
            pressed++;
            if (this.mode === 'solo') this.soloPlates[plateId] = true;
          }
        }
        if (pressed >= d.plates.length && !this.doors[d.id]) {
          this.doors[d.id] = true;
          CF.app.toast(t('msg.plates'), 'ok');
          CF.audio.play(CF.cues.door, { gain: 0.7 });
          this.fx.burst(d.x + d.w / 2, d.y + d.h / 2, '#57ffa8', 24, 120);
        }
      }
      if (d.type === 'link') {
        var l = this.links[d.pair];
        if (l && l.solved && !this.doors[d.id]) this.doors[d.id] = true;
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
    if (E.drawAtmosphere) E.drawAtmosphere(ctx, level, camX, this.time, quality, reduced);

    ctx.save();
    ctx.translate(-Math.round(camX) + shakeX, -Math.round(camY) + shakeY);

    E.drawDecor(ctx, level, camX, reduced ? 0 : this.time, quality);
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
      var plateOn = this.platePressed(plate.id) || (this.mode === 'solo' && !!this.soloPlates[plate.id]);
      E.drawPlate(ctx, plate, plateOn, this.time);
    }
    for (i = 0; i < level.checkpoints.length; i++) {
      var cp = level.checkpoints[i];
      E.drawCheckpoint(ctx, cp, i <= this.checkpointIndex, this.time);
    }
    for (i = 0; i < level.devices.length; i++) {
      var dev = level.devices[i];
      E.drawDevice(ctx, dev, !!this.devices[dev.id], this.time, level.era);
    }
    if (quality !== 'low') this.drawPuzzleBeacons(ctx, camX);
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
      CF.portal.drawWorld(ctx, level.exit.x, level.exit.y, 92, active ? '#57ffa8' : '#3fa9ff', this.time, active);
      ctx.save();
      var hintX = Math.min(level.exit.x, camX + E.W - 108);
      E.txt(ctx, active ? t('msg.portalOpen') : t('hint.exit'), hintX, level.exit.y + 22, 8.5, active ? '#57ffa8' : '#8ea2c7', 'right');
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
      if (this.mode === 'solo' && !this.owner[ch.id]) continue;
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

    if (E.drawForeground) E.drawForeground(ctx, level, camX, reduced ? 0 : this.time, quality);
    if (reveal) this.drawEcho(ctx);
    this.fx.draw(ctx, 0, 0);

    ctx.restore();

    if (E.drawScreenForeground) E.drawScreenForeground(ctx, level, camX, reduced ? 0 : this.time, quality);
    this.drawRemoteIndicators(ctx);
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
    var ch = this.mode === 'solo' ? this.chars[this.activeChar] : this.chars.p1;
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
      ctx.globalAlpha = 0.28 + 0.30 * Math.sin(this.time + p.ph);
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(x), Math.round(p.y), p.sz, p.sz);
    }
    ctx.restore();
    void theme;
  };

  Game.prototype.drawRemoteIndicators = function (ctx) {
    if (this.mode !== 'online') return;
    for (var i = 0; i < CF.characters.length; i++) {
      var id = CF.characters[i].id;
      var ch = this.chars[id];
      if (!ch || this.owner[id]) continue;
      var sx = ch.x - this.camera.x;
      if (sx > -30 && sx < E.W + 30) continue;
      var right = sx > E.W;
      var x = right ? E.W - 24 : 24;
      var y = E.clamp(ch.y + ch.h / 2, 76, E.H - 142);
      var dist = Math.max(0, Math.round(Math.abs(sx - E.W / 2) / 10));
      ctx.save();
      ctx.globalAlpha = 0.86;
      ctx.fillStyle = ch.def.accent;
      ctx.beginPath();
      if (right) {
        ctx.moveTo(x + 8, y - 8);
        ctx.lineTo(x + 8, y + 8);
        ctx.lineTo(x - 4, y);
      } else {
        ctx.moveTo(x - 8, y - 8);
        ctx.lineTo(x - 8, y + 8);
        ctx.lineTo(x + 4, y);
      }
      ctx.closePath();
      ctx.fill();
      E.txt(ctx, (this.remoteNames[id] || ch.def.slot) + ' ' + dist + 'm', x + (right ? 14 : -14), y - 10, 7, ch.def.accent, right ? 'right' : 'left');
      ctx.restore();
    }
  };

  Game.prototype.drawHUD = function (ctx) {
    var level = this.level;
    var quality = CF.store.settings.quality;
    var pad = 12;
    var i;
    var active = this.chars[this.activeChar];
    if (active) {
      E.panel(ctx, pad, pad, 302, 76, 0.66);
      E.drawCharacter(ctx, active.def, pad + 28, pad + 62, 1, 0, { height: 46, time: this.time });
      E.txt(ctx, t(active.def.nameKey), pad + 54, pad + 20, 9.5, active.def.accent);
      E.txt(ctx, this.mode === 'solo' ? t('hud.soloAbility') : t(active.def.abilityKey), pad + 54, pad + 36, 8.5, '#e9f2ff');
      var cd = this.abilityCooldown(active);
      var txt = cd > 0 ? t('hud.cooldown') + ' ' + cd.toFixed(1) + 's' : t('hud.ready');
      E.txt(ctx, txt, pad + 54, pad + 51, 8, cd > 0 ? '#ffbf5e' : '#57ffa8');
      if (this.time < this.echoUntil) {
        E.txt(ctx, 'ECO ' + Math.ceil(this.echoUntil - this.time) + 's', pad + 200, pad + 20, 7.5, '#52f0e6');
      }
      if (this.mode === 'coop') {
        E.txt(ctx, t('hud.coopTips'), pad + 54, pad + 65, 7, '#8ea2c7');
      }
      if (this.mode === 'online') {
        E.txt(ctx, t('hud.locked') + ' · ' + this.startChar.toUpperCase(), pad + 54, pad + 65, 7, '#57ffa8');
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

    E.panel(ctx, pad, E.H - 62, 300, 50, 0.62);
    var modeKey = this.mode === 'coop' ? 'hud.coop' : this.mode === 'online' ? 'hud.online' : 'hud.solo';
    E.txt(ctx, t(level.whenKey) + ' · ' + t(modeKey) + ' · ' + t(this.difficulty.key), pad + 12, E.H - 46, 7.5, '#a9bbd8');
    if (level.isFinal) {
      E.txt(ctx, t('hud.seal'), pad + 12, E.H - 27, 8, '#8ea2c7');
    } else {
      var iconsX = pad + 12;
      for (i = 0; i < level.shards.length; i++) {
        var got = !!this.shards[level.shards[i].id];
        this.drawHudGem(ctx, iconsX + i * 25, E.H - 27, got);
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
    if (this.mode === 'solo' || ch.def.ability === 'echo') {
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
      if (this.mode === 'solo') return activeAltars === 0 ? t('hint.soloAltar') : t('hint.soloAltarWindow');
      if (activeAltars === 0) return t('hint.altar');
      return t('hint.altarWindow');
    }
    if (this.allShards()) return t('hint.exitOpen');
    var ch = this.chars[this.activeChar];
    var x = ch ? ch.x : 0;
    var lp = this.levelIndex === 0 ? 'L1' : 'L2';
    var l = this.links[lp] || {};
    var hint;
    if (this.levelIndex === 0) {
      if (x < 1300) hint = 'echo';
      else if (x < 1760) hint = l.vision && this.time <= l.vision ? 'linkVision' : 'linkAction';
      else if (x < 2430) hint = 'glyph';
      else hint = 'harmonic';
    } else {
      if (x < 1110) hint = 'echo';
      else if (x < 1450) hint = l.vision && this.time <= l.vision ? 'linkVision' : 'linkAction';
      else if (x < 2150) hint = 'glyph';
      else hint = 'harmonic';
    }
    if (this.mode === 'solo') {
      if (hint === 'linkAction' || hint === 'linkVision') return t('hint.soloLink');
      return t('hint.solo' + hint.charAt(0).toUpperCase() + hint.slice(1));
    }
    if (hint === 'linkAction') return t('hint.linkAction');
    if (hint === 'linkVision') return t('hint.linkVision');
    hint = 'hint.' + hint;
    if (this.difficulty.hintLevel === 'minimal') {
      if (hint === 'hint.echo') return t('hint.hidden');
      if (hint === 'hint.linkAction') return t('hint.linkActionShort');
      if (hint === 'hint.linkVision') return t('hint.linkVisionShort');
      if (hint === 'hint.glyph') return t('hint.glyphShort');
      return t('hint.harmonicShort');
    }
    if (this.mode === 'online' && this.online && this.online.players && this.online.players.length < 3 && x < 1200) {
      return t('hint.onlineFew');
    }
    return t(hint);
  };

  Game.prototype.drawPuzzleBeacons = function (ctx, camX) {
    var time = this.time;
    for (var i = 0; i < this.level.devices.length; i++) {
      var dev = this.level.devices[i];
      if (this.devices[dev.id]) continue;
      if (dev.x + 40 < camX || dev.x - 40 > camX + E.W) continue;
      var isLink = dev.type === 'link';
      if (!isLink && dev.type !== 'harmonic' && dev.type !== 'glyph') continue;
      var v = isLink ? (dev.role === 'vision' ? '#7ef7ff' : '#57ffa8') : dev.type === 'harmonic' ? '#ffbf5e' : '#b98bff';
      var pulse = 0.45 + 0.3 * Math.sin(time * 2.4 + dev.x * 0.02);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var grad = ctx.createLinearGradient(0, dev.y - 190, 0, dev.y);
      var rgb = [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
      grad.addColorStop(0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
      grad.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.3)');
      ctx.globalAlpha = pulse;
      ctx.fillStyle = grad;
      ctx.fillRect(dev.x - 9, dev.y - 190, 18, 190);
      ctx.globalAlpha = pulse * 0.6;
      ctx.strokeStyle = v;
      ctx.lineWidth = 1;
      var sweep = dev.y - 190 + ((time * 42) % 190);
      ctx.beginPath();
      ctx.moveTo(dev.x - 8, sweep);
      ctx.lineTo(dev.x + 8, sweep + 7);
      ctx.stroke();
      ctx.restore();
    }
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
      links: Object.assign({}, this.links),
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
    if (w.links) {
      this.links = Object.assign({}, this.links, w.links);
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
      this.activateDevice(action.id, { byChar: action.char || dev.char, byClient: action.pid });
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
