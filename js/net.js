/* FRECUENCIA ROTA · capa de red (MQTT / HiveMQ, sin servidor propio) */
(function () {
  'use strict';

  var CF = window.CF = window.CF || {};

  var N = {
    client: null,
    room: null,
    me: null,
    status: 'idle',
    subs: {},
    handlers: {},
    hostMode: false,
    presTimer: null,
    lastError: null
  };

  function topic(suffix) {
    return CF.broker.namespace + '/' + N.room + '/' + suffix;
  }

  function emit(name, a, b, c) {
    var fn = N.handlers[name];
    if (typeof fn === 'function') {
      try { fn(a, b, c); } catch (e) { console.error('[net]', name, e); }
    }
  }

  function setStatus(s) {
    if (N.status === s) return;
    N.status = s;
    emit('status', s, N.lastError);
  }

  function ensureClient() {
    if (N.client) return N.client;
    if (typeof window.mqtt === 'undefined' || !window.mqtt.connect) {
      N.lastError = 'No se pudo cargar el cliente MQTT.';
      setStatus('error');
      return null;
    }
    setStatus('connecting');
    var client = window.mqtt.connect(CF.broker.url, {
      clientId: 'fr2_' + Math.random().toString(16).slice(2, 10) + '_' + Date.now().toString(36),
      clean: true,
      keepalive: CF.broker.keepalive,
      connectTimeout: CF.broker.connectTimeout,
      reconnectPeriod: CF.broker.reconnectPeriod,
      protocolVersion: 4
    });
    N.client = client;

    client.on('connect', function () {
      N.lastError = null;
      setStatus('online');
      Object.keys(N.subs).forEach(function (t) {
        client.subscribe(t, { qos: 1 }, function () {});
      });
      if (N.room) {
        publish(topic('pres'), {
          pid: N.me && N.me.id, ts: Date.now(), name: N.me && N.me.name,
          charId: N.me && N.me.charId, v: CF.VERSION
        }, false);
      }
      startPresence();
      emit('connect');
    });

    client.on('reconnect', function () { setStatus('connecting'); });
    client.on('close', function () { setStatus('offline'); });
    client.on('offline', function () { setStatus('offline'); });
    client.on('error', function (err) {
      N.lastError = (err && err.message) || 'Error de conexión';
      setStatus('error');
    });

    client.on('message', function (t, payload) {
      var text = payload ? payload.toString() : '';
      var obj = null;
      try { obj = text ? JSON.parse(text) : null; } catch (e) { return; }
      if (!obj) return;
      var suffix = t.slice((CF.broker.namespace + '/' + N.room + '/').length);
      if (suffix === 'state') emit('state', obj);
      else if (suffix === 'vault') emit('vault', obj);
      else if (suffix.indexOf('priv/') === 0) emit('private', obj, suffix.slice(5));
      else if (suffix === 'hello') emit('hello', obj);
      else if (suffix === 'pres') emit('presence', obj);
      else if (suffix === 'bye') emit('bye', obj);
      else if (suffix.indexOf('act/') === 0) emit('action', obj, suffix.slice(4));
      else if (suffix.indexOf('err/') === 0) emit('error', obj);
    });

    return client;
  }

  function subscribe(t) {
    if (!t || N.subs[t]) return;
    N.subs[t] = true;
    if (N.client && N.status === 'online') N.client.subscribe(t, { qos: 1 }, function () {});
  }

  function unsubscribeAll() {
    Object.keys(N.subs).forEach(function (t) {
      if (N.client && N.status === 'online') N.client.unsubscribe(t, function () {});
      delete N.subs[t];
    });
  }

  function publish(t, obj, retain) {
    if (!N.client || N.status !== 'online') return false;
    try {
      N.client.publish(t, JSON.stringify(obj), { qos: 0, retain: !!retain });
      return true;
    } catch (e) {
      return false;
    }
  }

  function stopPresence() {
    if (N.presTimer) { clearInterval(N.presTimer); N.presTimer = null; }
  }

  function startPresence() {
    stopPresence();
    if (!N.room || !N.me) return;
    N.presTimer = setInterval(function () {
      if (N.status !== 'online') return;
      publish(topic('pres'), {
        pid: N.me.id, ts: Date.now(), name: N.me.name, charId: N.me.charId, v: CF.VERSION
      }, false);
    }, CF.broker.presenceEvery);
  }

  function joinRoom(code, me, host) {
    N.room = String(code || '').toUpperCase();
    N.me = me;
    N.hostMode = !!host;
    var client = ensureClient();
    if (!client) return;

    subscribe(topic('state'));
    subscribe(topic('vault'));
    subscribe(topic('priv/' + me.id));
    subscribe(topic('act/' + me.id));
    subscribe(topic('pres'));
    if (host) subscribeHost();

    if (N.status === 'online') {
      publish(topic('pres'), { pid: me.id, ts: Date.now(), name: me.name, charId: me.charId, v: CF.VERSION }, false);
    }
    startPresence();
  }

  function subscribeHost() {
    N.hostMode = true;
    subscribe(topic('hello'));
    subscribe(topic('pres'));
    subscribe(topic('bye'));
    subscribe(topic('act/+'));
  }

  function leaveRoom() {
    if (N.room && N.me) publish(topic('bye'), { pid: N.me.id, ts: Date.now() }, false);
    stopPresence();
    unsubscribeAll();
    N.room = null;
    N.hostMode = false;
  }

  function sendHello(me) {
    if (!N.room) return;
    publish(topic('hello'), {
      pid: me.id, name: me.name, charId: me.charId, ts: Date.now(), v: CF.VERSION
    }, false);
  }

  function sendAction(action) {
    if (!N.room || !N.me) return false;
    if (N.hostMode) {
      emit('localaction', action, N.me.id);
      return true;
    }
    return publish(topic('act/' + N.me.id), action, false);
  }

  function publishState(pub, vault) {
    if (!N.room) return false;
    var ok = publish(topic('state'), pub, true);
    if (vault) publish(topic('vault'), vault, true);
    return ok;
  }

  function publishPrivate(pid, data) {
    if (!N.room) return false;
    return publish(topic('priv/' + pid), data, false);
  }

  function sendError(pid, text) {
    if (!N.room) return false;
    return publish(topic('priv/' + pid), { error: String(text || 'Acción no válida.'), errorAt: Date.now() }, false);
  }

  function claimHost() {
    subscribeHost();
    N.hostMode = true;
  }

  function releaseHost() {
    N.hostMode = false;
  }

  function end() {
    stopPresence();
    if (N.client) {
      try { N.client.end(true); } catch (e) {}
      N.client = null;
    }
    N.subs = {};
    N.room = null;
    setStatus('idle');
  }

  CF.Net = {
    N: N,
    topic: topic,
    init: function (handlers) {
      N.handlers = handlers || {};
      return CF.Net;
    },
    joinRoom: joinRoom,
    leaveRoom: leaveRoom,
    subscribeHost: subscribeHost,
    claimHost: claimHost,
    releaseHost: releaseHost,
    sendHello: sendHello,
    sendAction: sendAction,
    publishState: publishState,
    publishPrivate: publishPrivate,
    sendError: sendError,
    status: function () { return N.status; },
    isHost: function () { return N.hostMode; },
    end: end
  };
})();
