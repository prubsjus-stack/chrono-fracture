(function () {
  'use strict';

  var CF = window.CF = window.CF || {};
  var NS = CF.broker.namespace;

  function now() { return Date.now(); }
  function safeName(n) {
    var r = CF.store.validateName(n);
    return r.ok ? r.name : 'CIENTÍFICO';
  }
  function parseMsg(buf) {
    try { return JSON.parse(buf.toString()); } catch (e) { return null; }
  }
  function topicRoomBase(region) { return NS + '/rooms/' + region; }

  var O = {
    client: null,
    status: 'idle',
    connectPromise: null,
    connectResolve: null,
    region: 'america',
    myId: null,
    myName: '',
    myChar: 'p1',
    difficulty: 'normal',
    room: null,
    isHost: false,
    hostId: null,
    code: null,
    roomBase: null,
    roomTopic: null,
    evTopic: null,
    presTopic: null,
    pingTopic: null,
    ping: null,
    players: [],
    positions: {},
    lastRoomTs: 0,
    joinedAt: 0,
    joinWaiter: null,
    startWaiter: null,
    levelWaiter: null,
    closedWaiter: null,
    game: null,
    timers: {},
    dirty: false,
    lastSeen: {},
    lastAction: {},
    actionBudget: {},
    hitBudget: {},
    listActive: false,
    listRegion: null,
    discovered: {},
    roomPings: {},
    subscribed: {},
    onRooms: null,
    onRoom: null,
    onGameStart: null,
    onLevel: null,
    onVictory: null,
    onClosed: null,
    onConnection: null,
    onError: null,
    onPlayerLeft: null,
    onPlayerJoined: null,
    _unloaded: false
  };

  function emitConnection() {
    if (O.onConnection) O.onConnection(O.status, O.ping);
  }

  function setStatus(s) {
    O.status = s;
    emitConnection();
  }

  function subscribe(topic, qos) {
    if (!O.client) return;
    if (O.subscribed[topic]) return;
    O.subscribed[topic] = true;
    O.client.subscribe(topic, { qos: qos == null ? 0 : qos }, function () {});
  }

  function unsubscribe(topic) {
    if (!O.client) return;
    delete O.subscribed[topic];
    O.client.unsubscribe(topic, function () {});
  }

  function publish(topic, obj, opts) {
    if (!O.client) return false;
    var msg = typeof obj === 'string' ? obj : JSON.stringify(obj);
    try {
      O.client.publish(topic, msg, opts || { qos: 0 });
      return true;
    } catch (e) {
      return false;
    }
  }

  function ensureConnected() {
    if (O.client && O.status === 'connected') return Promise.resolve(true);
    return connect();
  }

  function connect() {
    if (O.status === 'connected' && O.client) return Promise.resolve(true);
    if (O.connectPromise) return O.connectPromise;
    O.connectPromise = new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (!done) {
          done = true;
          O.connectPromise = null;
          O.status = 'error';
          emitConnection();
          reject(new Error('timeout'));
        }
      }, 12000);
      O.connectResolve = function (ok) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (ok) resolve(true);
        else reject(new Error('connect'));
      };
      try {
        if (O.client) { try { O.client.end(true); } catch (e0) {} O.client = null; }
        var sid = CF.store.session();
        var clientId = 'cf_' + (sid.pid || 'anon') + '_' + Math.random().toString(16).slice(2, 6);
        var client = mqtt.connect(CF.broker.url, {
          clientId: clientId,
          clean: true,
          keepalive: CF.broker.keepalive,
          reconnectPeriod: CF.broker.reconnectPeriod,
          connectTimeout: CF.broker.connectTimeout,
          protocolVersion: 4
        });
        O.client = client;
        setStatus('connecting');
        client.on('connect', function () {
          O.subscribed = {};
          setStatus('connected');
          if (O.connectResolve) { O.connectResolve(true); O.connectResolve = null; O.connectPromise = null; }
          subscribe(NS + '/pong/' + O.myId, 0);
          resubscribeAll();
          if (O.room) {
            publishPresence();
            if (O.isHost) publishRoomState(true);
            else if (O.game) publishJoin(O.room.code);
          }
          if (O.listActive) subscribeList();
        });
        client.on('reconnect', function () {
          setStatus('reconnecting');
        });
        client.on('close', function () {
          if (O.status !== 'idle') setStatus('disconnected');
        });
        client.on('error', function () {
          if (O.status === 'connecting') {
            if (O.connectResolve) { O.connectResolve(false); O.connectResolve = null; }
            O.connectPromise = null;
          }
          setStatus('error');
        });
        client.on('message', onMessage);
      } catch (e) {
        clearTimeout(timer);
        O.connectPromise = null;
        setStatus('error');
        reject(e);
      }
    });
    return O.connectPromise;
  }

  function resubscribeAll() {
    if (O.room) {
      subscribe(O.roomTopic, 1);
      subscribe(O.evTopic, 1);
      subscribe(O.presTopic, 1);
      if (O.isHost) {
        subscribe(O.roomTopic + '/listping', 0);
        subscribe(O.roomTopic + '/p/+', 0);
      }
    }
    if (O.code) subscribe(NS + '/pong/' + O.myId, 0);
    if (O.listActive && O.listRegion) subscribe(topicRoomBase(O.listRegion) + '/+', 1);
  }

  function subscribeList() {
    if (!O.listRegion) return;
    subscribe(topicRoomBase(O.listRegion) + '/+', 1);
  }

  function watchRooms(region, cb) {
    O.onRooms = cb;
    O.listActive = true;
    O.listRegion = region;
    O.discovered = {};
    connect().then(function () {
      subscribeList();
      refreshRooms();
    }).catch(function () {
      if (O.onRooms) O.onRooms([], 'error');
    });
  }

  function unwatchRooms() {
    O.listActive = false;
    if (O.listRegion) unsubscribe(topicRoomBase(O.listRegion) + '/+');
    O.listRegion = null;
    O.onRooms = null;
  }

  function refreshRooms() {
    if (!O.listRegion) return;
    subscribeList();
    sendRoomPings();
    if (O.onRooms) O.onRooms(collectRooms(), null);
    clearTimeout(O.timers.listRefresh);
    O.timers.listRefresh = setTimeout(sendRoomPings, 900);
  }

  function collectRooms() {
    var out = [];
    var tnow = now();
    for (var code in O.discovered) {
      if (!Object.prototype.hasOwnProperty.call(O.discovered, code)) continue;
      var r = O.discovered[code];
      if (!r || !r.code) continue;
      if (tnow - (r.ts || 0) > CF.broker.roomTTL) continue;
      if (r.status === 'closed') continue;
      out.push(r);
    }
    out.sort(function (a, b) {
      var sa = a.status === 'lobby' ? 0 : 1;
      var sb = b.status === 'lobby' ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return (b.ts || 0) - (a.ts || 0);
    });
    return out;
  }

  function sendRoomPings() {
    var t0 = now();
    var list = collectRooms();
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      publish(topicRoomBase(r.region || O.listRegion) + '/' + r.code + '/listping', { from: O.myId, t0: t0 });
    }
  }

  function publishPresence() {
    if (!O.room || !O.presTopic) return;
    publish(O.presTopic, {
      pid: O.myId,
      name: O.myName,
      char: O.myChar,
      ping: O.ping,
      ts: now()
    }, { retain: true, qos: 1 });
  }

  function setIdentity(opts) {
    if (opts.name) O.myName = safeName(opts.name);
    if (opts.char) O.myChar = opts.char;
    if (opts.region) O.region = opts.region;
    if (O.room && !O.isHost) {
      publish(O.evTopic, { t: 'name', pid: O.myId, name: O.myName });
    }
  }

  function makeRoomState(extra) {
    var players = (O.room && O.room.players) ? O.room.players : [];
    var state = {
      code: O.code,
      region: O.region,
      hostId: O.hostId,
      hostName: O.myName,
      difficulty: O.difficulty,
      status: (O.room && O.room.status) || 'lobby',
      level: (O.room && O.room.level) || 0,
      players: players.map(function (p) {
        return { id: p.id, name: p.name, char: p.char, chars: p.chars || [p.char], ping: p.ping };
      }),
      max: 3,
      ts: now(),
      version: CF.VERSION
    };
    if (extra) {
      for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) state[k] = extra[k];
    }
    return state;
  }

  function publishRoomState(force) {
    if (!O.isHost || !O.room || !O.roomTopic) return;
    var tnow = now();
    if (!force && O.lastRoomPublish && tnow - O.lastRoomPublish < 180) {
      O.dirty = true;
      return;
    }
    O.lastRoomPublish = tnow;
    O.dirty = false;
    O.room.ts = tnow;
    O.room.players = O.players;
    var state = makeRoomState();
    O.room = Object.assign({}, state);
    O.players = O.room.players;
    O.lastRoomTs = tnow;
    publish(O.roomTopic, state, { retain: true, qos: 1 });
    if (O.onRoom) O.onRoom(O.room);
  }

  function markDirty() { O.dirty = true; }

  function hostAddPlayer(msg) {
    if (!O.isHost || !O.room) return;
    if (!msg || !msg.pid) return;
    var pid = String(msg.pid).slice(0, 40);
    var name = safeName(msg.name);
    var char = ['p1', 'p2', 'p3'].indexOf(msg.char) >= 0 ? msg.char : 'p1';
    if (O.room.status !== 'lobby') {
      var existing = O.room.players.filter(function (p) { return p.id === pid; })[0];
      if (existing) {
        existing.name = name;
        O.players = O.room.players;
        publishRoomState(true);
      } else {
        publish(O.evTopic, { t: 'reject', to: pid, reason: 'started' });
      }
      return;
    }
    var current = O.players.filter(function (p) { return p.id !== pid; });
    var taken = current.some(function (p) {
      return p.char === char || (p.chars && p.chars.indexOf(char) >= 0);
    });
    if (taken) {
      publish(O.evTopic, { t: 'reject', to: pid, reason: 'char' });
      return;
    }
    if (current.length >= 3) {
      publish(O.evTopic, { t: 'reject', to: pid, reason: 'full' });
      return;
    }
    var existing2 = O.players.filter(function (p) { return p.id === pid; })[0];
    if (existing2) {
      existing2.name = name;
      existing2.char = char;
      existing2.chars = [char];
    } else {
      O.players.push({ id: pid, name: name, char: char, chars: [char], ping: 0, joined: now() });
      if (O.onPlayerJoined) O.onPlayerJoined(pid, name, char);
    }
    O.players = O.players;
    O.room.players = O.players;
    O.lastSeen[pid] = now();
    publish(O.evTopic, { t: 'welcome', to: pid, code: O.code, difficulty: O.difficulty });
    publishRoomState(true);
  }

  function hostRemovePlayer(pid, reason) {
    if (!O.isHost || !O.room) return;
    var player = O.room.players.filter(function (p) { return p.id === pid; })[0];
    if (!player) return;
    O.room.players = O.room.players.filter(function (p) { return p.id !== pid; });
    O.players = O.room.players;
    if (O.onPlayerLeft) O.onPlayerLeft(pid, player.char, reason || 'left');
    publishRoomState(true);
  }

  function startHost(code, difficulty) {
    O.isHost = true;
    O.hostId = O.myId;
    O.code = code;
    O.difficulty = difficulty || 'normal';
    O.roomBase = topicRoomBase(O.region);
    O.roomTopic = O.roomBase + '/' + code;
    O.evTopic = O.roomTopic + '/ev';
    O.presTopic = O.roomTopic + '/p/' + O.myId;
    O.pingTopic = O.roomTopic + '/listping';
    O.players = [{ id: O.myId, name: O.myName, char: O.myChar, chars: [O.myChar], ping: 0, joined: now() }];
    O.room = {
      code: code,
      region: O.region,
      hostId: O.myId,
      hostName: O.myName,
      difficulty: O.difficulty,
      status: 'lobby',
      level: 0,
      players: O.players,
      max: 3,
      ts: now()
    };
    subscribe(O.roomTopic, 1);
    subscribe(O.evTopic, 1);
    subscribe(O.presTopic, 1);
    subscribe(O.roomTopic + '/listping', 0);
    subscribe(O.roomTopic + '/p/+', 0);
    subscribe(NS + '/pong/' + O.myId, 0);
    publishPresence();
    publishRoomState(true);
    if (O.onRoom) O.onRoom(Object.assign({}, O.room));
    startRoomHeartbeat();
    if (O.onConnection) O.onConnection(O.status, O.ping);
  }

  function createRoom(code, difficulty) {
    var v = CF.store.validateRoomCode(code);
    if (!v.ok) return Promise.reject(new Error('invalid'));
    return connect().then(function () {
      // Conflict check against retained room state
      return new Promise(function (resolve, reject) {
        var topic = topicRoomBase(O.region) + '/' + v.code;
        var done = false;
        function onConflict(payload) {
          var r = parseMsg(payload);
          if (done) return;
          done = true;
          O.client.removeListener('message', handler);
          if (r && r.code && r.status !== 'closed' && now() - (r.ts || 0) < CF.broker.roomTTL) {
            reject(new Error('conflict'));
          } else {
            resolve();
          }
        }
        function handler(topicGot, payload) {
          if (topicGot === topic) onConflict(payload);
        }
        O.client.on('message', handler);
        O.client.subscribe(topic, { qos: 1 }, function () {
          setTimeout(function () {
            if (done) return;
            done = true;
            O.client.removeListener('message', handler);
            resolve();
          }, 900);
        });
      });
    }).then(function () {
      startHost(v.code, difficulty);
      return O.room;
    });
  }

  function joinRoom(code) {
    var v = CF.store.validateRoomCode(code);
    if (!v.ok) return Promise.reject(new Error('invalid'));
    return connect().then(function () {
      if (O.room) leaveRoom(false);
      O.isHost = false;
      O.code = v.code;
      O.roomBase = topicRoomBase(O.region);
      O.roomTopic = O.roomBase + '/' + v.code;
      O.evTopic = O.roomTopic + '/ev';
      O.presTopic = O.roomTopic + '/p/' + O.myId;
      O.pingTopic = O.roomTopic + '/listping';
      O.room = null;
      O.players = [];
      subscribe(O.roomTopic, 1);
      subscribe(O.evTopic, 1);
      subscribe(O.presTopic, 1);
      subscribe(NS + '/pong/' + O.myId, 0);
      publishPresence();
      publishJoin(v.code);
      return new Promise(function (resolve, reject) {
        var done = false;
        var retry = setInterval(function () {
          if (!done) publishJoin(v.code);
        }, 1300);
        var timer = setTimeout(function () {
          if (done) return;
          done = true;
          clearTimeout(timer);
          clearInterval(retry);
          O.joinWaiter = null;
          reject(new Error('notfound'));
        }, 6500);
        O.joinWaiter = {
          resolve: function (room) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            clearInterval(retry);
            O.joinWaiter = null;
            O.joinedAt = now();
            startGuestHeartbeat();
            resolve(room);
          },
          reject: function (reason) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            clearInterval(retry);
            O.joinWaiter = null;
            reject(new Error(reason || 'join'));
          }
        };
      });
    });
  }

  function publishJoin(code) {
    publish(O.evTopic, {
      t: 'join',
      pid: O.myId,
      name: O.myName,
      char: O.myChar,
      code: code,
      ts: now()
    }, { qos: 1 });
  }

  function startGuestHeartbeat() {
    clearInterval(O.timers.guestHeartbeat);
    O.timers.guestHeartbeat = setInterval(function () {
      if (!O.room || O.isHost) return;
      publishPresence();
      publish(O.evTopic, { t: 'hb', pid: O.myId, ts: now() });
      if (now() - O.lastRoomTs > 22000 && O.room && O.room.status !== 'closed') {
        closeLocal('hostLeft');
      }
    }, 5000);
  }

  function startRoomHeartbeat() {
    clearInterval(O.timers.roomHeartbeat);
    O.timers.roomHeartbeat = setInterval(function () {
      if (!O.room || !O.isHost) return;
      var tnow = now();
      // prune stale players
      var changed = false;
      var kept = [];
      for (var i = 0; i < O.players.length; i++) {
        var p = O.players[i];
        if (p.id === O.myId) { kept.push(p); continue; }
        var seen = O.lastSeen[p.id] || p.joined || tnow;
        if (tnow - seen > 32000) {
          changed = true;
          if (O.onPlayerLeft) O.onPlayerLeft(p.id, p.char, 'timeout');
          continue;
        }
        kept.push(p);
      }
      if (changed) {
        O.players = kept;
        O.room.players = kept;
      }
      publishRoomState(true);
    }, 5000);
  }

  function startGameHost() {
    if (!O.isHost || !O.room) return Promise.reject(new Error('host'));
    if (O.room.status !== 'lobby') return Promise.reject(new Error('started'));
    if (!(O.room.players || []).length) return Promise.reject(new Error('needPlayer'));
    O.room.status = 'playing';
    O.room.level = 0;
    publishRoomState(true);
    var payload = {
      t: 'start',
      levelIndex: 0,
      difficulty: O.difficulty,
      hostId: O.myId,
      players: O.room.players.map(function (p) {
        return { id: p.id, name: p.name, char: p.char, chars: p.chars || [p.char] };
      }),
      room: O.code,
      region: O.region,
      ts: now()
    };
    publish(O.evTopic, payload, { qos: 1 });
    return Promise.resolve(payload);
  }

  function sendLevel(index) {
    if (!O.isHost || !O.room) return;
    O.room.level = index;
    publishRoomState(true);
    publish(O.evTopic, { t: 'level', levelIndex: index, ts: now() }, { qos: 1 });
  }

  function sendVictory() {
    if (!O.isHost) return;
    publish(O.evTopic, { t: 'victory', ts: now() }, { qos: 1 });
  }

  function leaveRoom(close) {
    if (O.room) {
      if (O.isHost) {
        publish(O.evTopic, { t: 'closed', ts: now() }, { qos: 1 });
        publish(O.roomTopic, '', { retain: true, qos: 1 });
      } else {
        publish(O.evTopic, { t: 'leave', pid: O.myId, char: O.myChar }, { qos: 1 });
        publish(O.presTopic, '', { retain: true, qos: 1 });
      }
    }
    clearInterval(O.timers.guestHeartbeat);
    clearInterval(O.timers.roomHeartbeat);
    clearInterval(O.timers.world);
    clearInterval(O.timers.pos);
    clearInterval(O.timers.ping);
    if (O.evTopic) unsubscribe(O.evTopic);
    if (O.roomTopic) unsubscribe(O.roomTopic);
    if (O.presTopic) unsubscribe(O.presTopic);
    if (O.roomTopic) {
      unsubscribe(O.roomTopic + '/listping');
      unsubscribe(O.roomTopic + '/p/+');
    }
    O.room = null;
    O.players = [];
    O.code = null;
    O.isHost = false;
    O.game = null;
    O.positions = {};
    O.joinWaiter = null;
    O.dirty = false;
    void close;
  }

  function closeLocal(reason) {
    var room = O.room;
    var host = O.isHost;
    if (host && O.evTopic) publish(O.evTopic, { t: 'closed', by: O.myId, ts: now() });
    leaveRoom(true);
    if (O.onClosed) O.onClosed(reason || 'hostLeft', room);
  }

  function attachGame(game) {
    O.game = game;
    detachTimers();
    O.timers.pos = setInterval(publishPositions, CF.broker.positionInterval);
    O.timers.ping = setInterval(pingHost, 3200);
    if (O.isHost) {
      O.timers.world = setInterval(publishWorld, 220);
      O.timers.roomHeartbeat = O.timers.roomHeartbeat || null;
      publishWorld();
    }
    publishPositions();
    if (!O.isHost) pingHost();
  }

  function detachTimers() {
    clearInterval(O.timers.pos);
    clearInterval(O.timers.world);
    clearInterval(O.timers.ping);
  }

  function detachGame() {
    detachTimers();
    O.game = null;
    O.positions = {};
  }

  function publishPositions() {
    if (!O.game || !O.room) return;
    var chars = O.game.getLocalPositions();
    if (!chars) return;
    publish(O.evTopic, {
      t: 'pos',
      pid: O.myId,
      name: O.myName,
      chars: chars,
      ts: now()
    }, { qos: 0 });
  }

  function publishWorld() {
    if (!O.isHost || !O.game || !O.room || O.room.status !== 'playing') return;
    var snap = O.game.getWorldSnapshot();
    var msg = Object.assign({ t: 'world', ts: now() }, snap);
    publish(O.evTopic, msg, { qos: 0 });
    O.lastWorld = msg;
  }

  function pingHost() {
    if (!O.room || O.isHost) return;
    publish(O.evTopic, { t: 'ping', from: O.myId, t0: now() });
  }

  function addLocalChar(charId) {
    if (O.game && O.game.addLocalChar) O.game.addLocalChar(charId);
  }

  function onMessage(topic, payload) {
    var msg = parseMsg(payload);
    if (!msg) return;
    if (topic.indexOf(NS + '/pong/') === 0) {
      if (msg.room && msg.t0) {
        var rtt = Math.max(1, now() - msg.t0);
        O.roomPings[msg.room] = rtt;
        if (O.discovered[msg.room]) O.discovered[msg.room].ping = rtt;
        if (O.onRooms && O.listActive) O.onRooms(collectRooms(), null);
      }
      return;
    }
    if (topic === O.roomTopic) {
      handleRoomState(msg);
      return;
    }
    if (O.listRegion && topic.indexOf(topicRoomBase(O.listRegion) + '/') === 0 && topic.split('/').length === topicRoomBase(O.listRegion).split('/').length + 1) {
      var code = topic.substring(topic.lastIndexOf('/') + 1);
      if (msg && msg.code) {
        O.discovered[code] = msg;
        if (O.roomPings[code]) msg.ping = O.roomPings[code];
        if (O.onRooms && O.listActive) O.onRooms(collectRooms(), null);
        clearTimeout(O.timers.pingRooms);
        O.timers.pingRooms = setTimeout(sendRoomPings, 300);
      }
      return;
    }
    if (!O.room) return;
    if (topic === O.roomTopic + '/listping') {
      if (O.isHost) {
        publish(NS + '/pong/' + (msg.from || ''), { room: O.code, t0: msg.t0, ts: now() });
      }
      return;
    }
    if (topic.indexOf(O.roomTopic + '/p/') === 0) {
      if (O.isHost && msg.pid && msg.pid !== O.myId) {
        O.lastSeen[msg.pid] = now();
        var pl = O.room.players.filter(function (p) { return p.id === msg.pid; })[0];
        if (pl && msg.ping != null && Math.abs((pl.ping || 0) - msg.ping) > 4) {
          pl.ping = msg.ping;
          if (O.onRoom) O.onRoom(O.room);
        }
      }
      return;
    }
    if (topic === O.evTopic) {
      handleEvent(msg);
    }
  }

  function handleRoomState(msg) {
    if (!msg || !msg.code) return;
    O.lastRoomTs = now();
    if (O.isHost) {
      if (msg.hostId !== O.myId) {
        // another host with same code: keep ours
      }
      return;
    }
    if (msg.status === 'closed') {
      closeLocal('closed');
      return;
    }
    O.room = msg;
    O.players = msg.players || [];
    O.difficulty = msg.difficulty || O.difficulty;
    O.hostId = msg.hostId;
    if (O.onRoom) O.onRoom(msg);
    var me = O.players.filter(function (p) { return p.id === O.myId; })[0];
    if (me && O.joinWaiter) {
      O.joinWaiter.resolve(msg);
    }
    if (!me && O.joinWaiter) {
      // Wait for the host to add us; stale retained snapshots may not include us yet.
    }
    if (me && !O.isHost && msg.status === 'playing' && !O.game && !O.startWaiter) {
      // reconnect during a running game: request entry through start? Keep waiting.
    }
  }

  function handleEvent(msg) {
    if (!msg || !msg.t) return;
    if (msg.t === 'join') {
      if (O.isHost) hostAddPlayer(msg);
      return;
    }
    if (msg.t === 'hb') {
      if (O.isHost && msg.pid) O.lastSeen[msg.pid] = now();
      return;
    }
    if (msg.t === 'leave') {
      if (O.isHost && msg.pid) hostRemovePlayer(msg.pid, 'left');
      return;
    }
    if (msg.t === 'reject') {
      if (msg.to === O.myId && O.joinWaiter) O.joinWaiter.reject(msg.reason || 'reject');
      return;
    }
    if (msg.t === 'welcome') {
      if (msg.to === O.myId) {
        publishPresence();
        if (O.onRoom && O.room) O.onRoom(O.room);
      }
      return;
    }
    if (msg.t === 'closed') {
      if (msg.by !== O.myId) closeLocal('hostLeft');
      return;
    }
    if (msg.t === 'name') {
      if (O.isHost && msg.pid) {
        var pl = O.room.players.filter(function (p) { return p.id === msg.pid; })[0];
        if (pl) {
          pl.name = safeName(msg.name);
          O.players = O.room.players;
          publishRoomState(true);
        }
      }
      return;
    }
    if (msg.t === 'char') {
      if (O.isHost && msg.pid) {
        var taken = O.room.players.some(function (p) { return p.id !== msg.pid && p.char === msg.char; });
        if (!taken && ['p1', 'p2', 'p3'].indexOf(msg.char) >= 0) {
          var pl2 = O.room.players.filter(function (p) { return p.id === msg.pid; })[0];
          if (pl2) {
            pl2.char = msg.char;
            pl2.chars = [msg.char];
            O.players = O.room.players;
            publishRoomState(true);
            publish(O.evTopic, { t: 'charOk', to: msg.pid, char: msg.char });
          }
        } else {
          publish(O.evTopic, { t: 'charReject', to: msg.pid });
        }
      }
      return;
    }
    if (msg.t === 'start') {
      if (O.isHost) return;
      O.room = O.room || { code: O.code, players: msg.players, status: 'playing', region: O.region };
      O.room.status = 'playing';
      O.players = msg.players || [];
      O.difficulty = msg.difficulty || O.difficulty;
      O.hostId = msg.hostId || O.hostId;
      if (O.onGameStart) O.onGameStart(msg);
      return;
    }
    if (msg.t === 'level') {
      if (O.isHost) return;
      if (O.onLevel) O.onLevel(msg.levelIndex || 0);
      return;
    }
    if (msg.t === 'victory') {
      if (O.isHost) return;
      if (O.onVictory) O.onVictory();
      return;
    }
    if (msg.t === 'pos') {
      if (msg.pid === O.myId) return;
      if (!msg.chars) return;
      var tnow = now();
      O.lastSeen[msg.pid] = tnow;
      for (var cid in msg.chars) {
        if (!Object.prototype.hasOwnProperty.call(msg.chars, cid)) continue;
        var p = msg.chars[cid];
        if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') continue;
        p.x = Math.max(0, Math.min(4000, p.x));
        p.y = Math.max(-120, Math.min(760, p.y));
        p.name = safeName(msg.name || p.name || 'CIENTÍFICO');
        p.pid = msg.pid;
        O.positions[cid] = p;
      }
      if (O.game) O.game.applyRemotes(O.positions);
      return;
    }
    if (msg.t === 'world') {
      if (O.isHost) return;
      if (O.game) O.game.applyWorld(msg);
      return;
    }
    if (msg.t === 'ping') {
      if (O.isHost) publish(O.evTopic, { t: 'pong', to: msg.from, t0: msg.t0 });
      return;
    }
    if (msg.t === 'pong') {
      if (msg.to === O.myId && msg.t0) {
        O.ping = Math.max(1, Math.min(999, now() - msg.t0));
        emitConnection();
        publishPresence();
      }
      return;
    }
    if (msg.t === 'action') {
      if (O.isHost) validateAction(msg);
      return;
    }
    if (msg.t === 'charOk') {
      if (msg.to === O.myId) O.myChar = msg.char || O.myChar;
      return;
    }
    if (msg.t === 'charReject') {
      if (msg.to === O.myId && O.onError) O.onError('char');
      return;
    }
  }

  function validateAction(msg) {
    if (!O.room || !msg.pid) return;
    var player = O.players.filter(function (p) { return p.id === msg.pid; })[0];
    if (!player) return;
    var tnow = now();
    if (msg.kind === 'hit') {
      if (tnow - (O.hitBudget[msg.pid] || 0) < 900) return;
      O.hitBudget[msg.pid] = tnow;
    } else {
      if (tnow - (O.actionBudget[msg.pid] || 0) < 350) return;
      O.actionBudget[msg.pid] = tnow;
    }
    var level = CF.levels[O.room.level || 0];
    if (!level) return;
    var pos = msg.char ? O.positions[msg.char] : null;
    if (msg.kind === 'shard') {
      if (!pos) return;
      var shard = null;
      for (var i = 0; i < level.shards.length; i++) if (level.shards[i].id === msg.id) { shard = level.shards[i]; break; }
      if (!shard) return;
      var dx = (pos.x + 10) - shard.x;
      var dy = (pos.y + 20) - shard.y;
      if (dx * dx + dy * dy > 190 * 190) return;
      if (O.game) O.game.onlineAction(msg);
    } else if (msg.kind === 'device') {
      if (!pos) return;
      var dev = null;
      for (var j = 0; j < level.devices.length; j++) if (level.devices[j].id === msg.id) { dev = level.devices[j]; break; }
      if (!dev) return;
      var ddx = (pos.x + 10) - dev.x;
      var ddy = (pos.y + 20) - (dev.y - 18);
      if (ddx * ddx + ddy * ddy > 160 * 160) return;
      if (O.game) O.game.onlineAction(msg);
    } else if (msg.kind === 'echo') {
      if (!pos) return;
      if (O.game) O.game.onlineAction({ kind: 'echo' });
    } else if (msg.kind === 'marker') {
      if (!pos) return;
      if (O.game) O.game.onlineAction({ kind: 'marker', x: pos.x, y: pos.y - 10, char: msg.char });
    } else if (msg.kind === 'hit') {
      var amount = Math.max(0, Math.min(14, Number(msg.amount) || 0));
      if (O.game) O.game.onlineAction({ kind: 'hit', amount: amount });
    }
  }

  function send(payload) {
    if (!O.client) return;
    if (!O.room || !O.evTopic) return;
    var msg = Object.assign({ pid: O.myId, ts: now() }, payload);
    publish(O.evTopic, msg, { qos: 0 });
  }

  function updateName(name) {
    var v = CF.store.validateName(name);
    if (!v.ok) return v;
    O.myName = v.name;
    CF.store.setName(v.name);
    if (O.room && !O.isHost) {
      publish(O.evTopic, { t: 'name', pid: O.myId, name: O.myName });
      publishPresence();
    }
    if (O.isHost) {
      if (O.room) { O.room.hostName = O.myName; publishRoomState(true); }
    }
    return { ok: true, name: v.name };
  }

  function changeChar(char) {
    if (['p1', 'p2', 'p3'].indexOf(char) < 0) return;
    O.myChar = char;
    if (O.room && !O.isHost) {
      publish(O.evTopic, { t: 'char', pid: O.myId, char: char });
    }
    if (O.isHost && O.room) {
      O.players[0].char = char;
      O.players[0].chars = [char];
      publishRoomState(true);
    }
  }

  function init() {
    var s = CF.store.session();
    O.myId = s.pid;
    O.myName = CF.store.profile().name;
    O.myChar = 'p1';
    O.region = 'america';
    window.addEventListener('pagehide', function () {
      if (O.room) {
        if (O.isHost) {
          publish(O.evTopic, { t: 'closed', by: O.myId, ts: now() });
          publish(O.roomTopic, '', { retain: true, qos: 1 });
        } else {
          publish(O.evTopic, { t: 'leave', pid: O.myId, char: O.myChar });
          publish(O.presTopic, '', { retain: true, qos: 1 });
        }
      }
    });
  }

  window.CF.online = {
    init: init,
    connect: connect,
    get status() { return O.status; },
    get ping() { return O.ping; },
    get room() { return O.room; },
    get isHost() { return O.isHost; },
    get players() { return O.players; },
    get code() { return O.code; },
    get myId() { return O.myId; },
    get myName() { return O.myName; },
    get myChar() { return O.myChar; },
    get region() { return O.region; },
    get difficulty() { return O.difficulty; },
    get positions() { return O.positions; },
    setIdentity: setIdentity,
    watchRooms: watchRooms,
    unwatchRooms: unwatchRooms,
    refreshRooms: refreshRooms,
    createRoom: createRoom,
    joinRoom: joinRoom,
    leaveRoom: leaveRoom,
    startGameHost: startGameHost,
    sendLevel: sendLevel,
    sendVictory: sendVictory,
    attachGame: attachGame,
    detachGame: detachGame,
    send: send,
    markDirty: markDirty,
    updateName: updateName,
    changeChar: changeChar,
    addLocalChar: addLocalChar,
    startHost: startHost,
    // callback slots
    set onRooms(fn) { O.onRooms = fn; },
    get onRooms() { return O.onRooms; },
    set onRoom(fn) { O.onRoom = fn; },
    get onRoom() { return O.onRoom; },
    set onGameStart(fn) { O.onGameStart = fn; },
    get onGameStart() { return O.onGameStart; },
    set onLevel(fn) { O.onLevel = fn; },
    get onLevel() { return O.onLevel; },
    set onVictory(fn) { O.onVictory = fn; },
    get onVictory() { return O.onVictory; },
    set onClosed(fn) { O.onClosed = fn; },
    get onClosed() { return O.onClosed; },
    set onConnection(fn) { O.onConnection = fn; },
    get onConnection() { return O.onConnection; },
    set onError(fn) { O.onError = fn; },
    get onError() { return O.onError; },
    set onPlayerLeft(fn) { O.onPlayerLeft = fn; },
    get onPlayerLeft() { return O.onPlayerLeft; },
    set onPlayerJoined(fn) { O.onPlayerJoined = fn; },
    get onPlayerJoined() { return O.onPlayerJoined; }
  };
})();

