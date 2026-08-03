/**
 * transports.js
 * ---------------------------------------------------------------------------
 * Two implementations of the transport contract described in NetworkManager.
 *
 * LocalMockTransport simulates a populated room entirely client-side so the
 * venue is never empty during development and so the presence/seat code paths
 * are actually exercised without a backend.
 *
 * WebSocketTransport is the real one. It is deliberately thin — reconnect with
 * backoff, JSON frames, nothing else. Authority, validation and persistence
 * belong on the server, not here.
 */

import { NETWORK } from '../config/engine.config.js';

const NAMES = [
  'Ash', 'Rook', 'Vale', 'Quinn', 'Iris', 'Kade', 'Wren', 'Sol', 'Nova', 'Bex',
  'Juno', 'Rhys', 'Mira', 'Otto', 'Sage', 'Talon', 'Vega', 'Pike', 'Lux', 'Fen'
];
const randName = () => NAMES[(Math.random() * NAMES.length) | 0] + ((Math.random() * 900 + 10) | 0);

/* ========================================================================= */

export class LocalMockTransport {
  /**
   * @param {{seatCount:number, pickSeat:() => number}} opts
   *   `pickSeat` is injected so the mock claims seats that actually exist,
   *   without this module importing SeatManager.
   */
  constructor(opts) {
    this.seatCount = opts.seatCount;
    this.pickSeat = opts.pickSeat;
    this.onMessage = () => {};
    this.onStatus = () => {};
    this._nextId = 1;
    this._users = new Map();
    this._timers = [];
  }

  async connect() {
    this.onStatus('connecting');
    await new Promise(r => setTimeout(r, 120));
    this.onStatus('open');

    const localId = this._nextId++;
    this._localId = localId;
    this.onMessage('welcome', { userId: localId, room: NETWORK.room, serverTime: Date.now() });

    // Seed the room.
    const seeded = [];
    for (let i = 0; i < NETWORK.mock.initialUsers; i++) {
      const u = this._spawn();
      if (u) seeded.push(u);
    }
    this.onMessage('presence.full', { users: seeded });

    const joinMs = 60000 / Math.max(1, NETWORK.mock.joinsPerMinute);
    const leaveMs = 60000 / Math.max(1, NETWORK.mock.leavesPerMinute);
    this._timers.push(setInterval(() => {
      const u = this._spawn();
      if (u) this.onMessage('presence.delta', { joined: [u], left: [] });
    }, joinMs));
    this._timers.push(setInterval(() => {
      const ids = [...this._users.keys()].filter(id => id !== this._localId);
      if (!ids.length) return;
      const id = ids[(Math.random() * ids.length) | 0];
      this._users.delete(id);
      this.onMessage('presence.delta', { joined: [], left: [id] });
    }, leaveMs));
    // Occasional emote traffic so the avatar path gets exercised.
    this._timers.push(setInterval(() => {
      const ids = [...this._users.keys()];
      if (!ids.length) return;
      const id = ids[(Math.random() * ids.length) | 0];
      const emotes = ['wave', 'cheer', 'clap'];
      this.onMessage('avatar.emote', { userId: id, emote: emotes[(Math.random() * 3) | 0] });
    }, 2600));
  }

  _spawn() {
    const seatIndex = this.pickSeat();
    if (seatIndex < 0) return null;
    const u = {
      userId: this._nextId++,
      username: randName(),
      team: Math.random() < 0.62 ? 'home' : 'away',
      seatIndex
    };
    this._users.set(u.userId, u);
    return u;
  }

  send(type, payload) {
    // Loopback: behave like a permissive server.
    switch (type) {
      case 'hello':
        this._localProfile = payload;
        break;
      case 'seat.claim': {
        setTimeout(() => {
          this.onMessage('seat.granted', { seatIndex: payload.seatIndex, userId: this._localId });
        }, 60);
        break;
      }
      case 'seat.release':
        setTimeout(() => this.onMessage('seat.freed', { seatIndex: -1, userId: this._localId }), 40);
        break;
      case 'avatar.emote':
        this.onMessage('avatar.emote', { userId: this._localId, emote: payload.emote });
        break;
      case 'chat.send':
        this.onMessage('chat.message', {
          userId: this._localId,
          username: this._localProfile?.username || 'you',
          text: payload.text, ts: Date.now()
        });
        break;
    }
  }

  close() {
    this._timers.forEach(clearInterval);
    this._timers = [];
    this.onStatus('closed');
  }
}

/* ========================================================================= */

export class WebSocketTransport {
  constructor(endpoint = NETWORK.endpoint) {
    this.endpoint = endpoint;
    this.onMessage = () => {};
    this.onStatus = () => {};
    this.ws = null;
    this._retry = 0;
    this._closedByUs = false;
    this._queue = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.onStatus('connecting');
      try { this.ws = new WebSocket(this.endpoint); }
      catch (err) { this.onStatus('error', err.message); return reject(err); }

      this.ws.onopen = () => {
        this._retry = 0;
        this.onStatus('open');
        this._queue.splice(0).forEach(f => this.ws.send(f));
        resolve();
      };
      this.ws.onmessage = ev => {
        let frame;
        try { frame = JSON.parse(ev.data); }
        catch { return console.warn('[WebSocketTransport] bad frame'); }
        this.onMessage(frame.type, frame.payload || {});
      };
      this.ws.onerror = err => this.onStatus('error', err?.message);
      this.ws.onclose = () => {
        this.onStatus('closed');
        if (!this._closedByUs) this._reconnect();
      };
    });
  }

  _reconnect() {
    const delay = Math.min(30000, 500 * Math.pow(2, this._retry++));
    this.onStatus('reconnecting', `${delay}ms`);
    setTimeout(() => this.connect().catch(() => {}), delay);
  }

  send(type, payload) {
    const frame = JSON.stringify({ type, payload });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(frame);
    else this._queue.push(frame);
  }

  close() {
    this._closedByUs = true;
    this.ws?.close();
  }
}

/** Factory driven by config. */
export function createTransport(opts) {
  return NETWORK.transport === 'websocket'
    ? new WebSocketTransport(NETWORK.endpoint)
    : new LocalMockTransport(opts);
}
