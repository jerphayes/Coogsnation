/**
 * services/local.js
 * ---------------------------------------------------------------------------
 * Working implementations of every contract in interfaces.js, using nothing
 * but the browser. They exist so the engine boots and every code path is
 * exercised with no backend at all.
 *
 * These are complete implementations of their contracts, not placeholders that
 * throw. That matters: a stub that throws hides integration bugs until the day
 * you wire up the real provider. A stub that *works* means the only thing that
 * changes on that day is one string in engine.config.js.
 */

import {
  ChatService, VoiceService,
  PersistenceService, CrowdSimulationService
} from './interfaces.js';

const uid = () => Math.random().toString(36).slice(2, 10);

/* ═══════════════════════════════════════════════════════════════════════ */

/* LocalAuthService was REMOVED during CoogsNation integration.
 *
 * The application owns authentication (Passport + Postgres-backed sessions).
 * The engine consumes an already-authenticated permission context through
 * `adapters/CoogsAuthService.js`. Keeping a local implementation around would
 * have left a second, weaker identity path in the codebase — exactly the
 * duplicated infrastructure the integration exists to remove.
 */

/* ═══════════════════════════════════════════════════════════════════════ */

export class LocalChatService extends ChatService {
  constructor({ auth, limit = 200 } = {}) {
    super();
    this.auth = auth;
    this.limit = limit;
    this._log = [];
    this._handlers = new Set();
    this._muted = new Set();
  }

  async send(text, channel = 'venue') {
    const s = this.auth?.getSession();
    const msg = {
      id: uid(),
      userId: s?.userId || 'local',
      username: s?.username || 'you',
      text: String(text).slice(0, 280),
      ts: Date.now(),
      channel
    };
    this._push(msg);
  }

  /** Used by the mock population to make the room feel inhabited. */
  inject(username, text, channel = 'venue') {
    this._push({ id: uid(), userId: `npc-${username}`, username, text, ts: Date.now(), channel });
  }

  async history({ channel = 'venue', limit = 50 } = {}) {
    return this._log.filter(m => m.channel === channel).slice(-limit);
  }

  onMessage(handler) {
    this._handlers.add(handler);
    return () => this._handlers.delete(handler);
  }

  async mute(userId) { this._muted.add(userId); }
  async report(messageId, reason) {
    console.info(`[chat] reported ${messageId}: ${reason} — a real service would queue this for moderation`);
  }

  _push(msg) {
    this._log.push(msg);
    while (this._log.length > this.limit) this._log.shift();
    if (this._muted.has(msg.userId)) return;
    this._handlers.forEach(h => h(msg));
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */

/**
 * Voice is the one capability with no meaningful local implementation — there
 * is no peer to talk to. Rather than fake it, this reports `supported: false`
 * and no-ops, so UI can disable the control honestly and nothing downstream
 * has to null-check.
 */
export class NullVoiceService extends VoiceService {
  constructor() {
    super();
    this._participants = [];
    this._handlers = new Set();
  }

  get supported() { return false; }

  async join(channelId) {
    console.info(`[voice] join("${channelId}") ignored — no voice provider bound. ` +
                 `Bind a WebRTC/SFU implementation in main.js to enable.`);
  }
  async leave() {}
  setInputEnabled() {}
  updateListener() {}
  updateTalkerPositions() {}
  getParticipants() { return this._participants; }
  onParticipantsChanged(handler) {
    this._handlers.add(handler);
    return () => this._handlers.delete(handler);
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */

export class MemoryPersistenceService extends PersistenceService {
  constructor() {
    super();
    this._seats = new Map();     // venueId → Map<seatIndex, record>
    this._profiles = new Map();
  }

  _venue(venueId) {
    if (!this._seats.has(venueId)) this._seats.set(venueId, new Map());
    return this._seats.get(venueId);
  }

  async loadSeatOwnership(venueId) { return [...this._venue(venueId).values()]; }
  async saveSeatClaim(venueId, record) { this._venue(venueId).set(record.seatIndex, record); }
  async clearSeatClaim(venueId, seatIndex) { this._venue(venueId).delete(seatIndex); }
  async loadProfile(userId) { return this._profiles.get(userId) || null; }
  async saveProfile(userId, profile) { this._profiles.set(userId, profile); }
}

/* LocalStoragePersistenceService was REMOVED during CoogsNation integration.
 *
 * Persistent storage belongs to the application. Seat claims now travel
 * through `adapters/CoogsPersistenceService.js` to the venue API and into
 * PostgreSQL via IStorage. MemoryPersistenceService is retained only as the
 * headless-test default; nothing in the browser build uses it.
 */

/* ═══════════════════════════════════════════════════════════════════════ */

/**
 * A crude event director: fires occasional reactions so the bowl is alive.
 * Replace with a service that reads real game state; nothing else changes,
 * because CrowdManager only ever sees directives.
 */
export class ScriptedCrowdSimulation extends CrowdSimulationService {
  constructor({ intervalRange = [18, 40] } = {}) {
    super();
    this._handlers = new Set();
    this._range = intervalRange;
    this._next = this._schedule();
    this._elapsed = 0;
    this._density = null;
  }

  _schedule() {
    const [lo, hi] = this._range;
    return lo + Math.random() * (hi - lo);
  }

  onDirective(handler) {
    this._handlers.add(handler);
    return () => this._handlers.delete(handler);
  }

  tick(dt) {
    this._elapsed += dt;
    if (this._elapsed < this._next) return;
    this._elapsed = 0;
    this._next = this._schedule();
    const pool = [
      { type: 'cheer', strength: 0.8 + Math.random() * 0.2, reason: 'big play' },
      { type: 'wave', strength: 1, reason: 'lull' },
      { type: 'stand', strength: 0.6, reason: 'third down' }
    ];
    this.request(pool[(Math.random() * pool.length) | 0]);
  }

  request(directive) { this._handlers.forEach(h => h(directive)); }

  setDensity(rate) {
    this._density = rate;
    this.request({ type: 'idle', strength: 1, reason: `density:${rate}` });
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */

/**
 * Build the service set named in engine.config.js SERVICES.
 * @param {object} spec
 * @param {ServiceRegistry} registry
 */
export function bindLocalServices(registry, spec, ctx = {}) {
  if (!ctx.auth) {
    throw new Error(
      'bindLocalServices requires an application-supplied auth service. ' +
      'The engine no longer authenticates users.',
    );
  }
  const auth = registry.bind('auth', ctx.auth);
  registry.bind('chat', new LocalChatService({ auth }));
  registry.bind('voice', new NullVoiceService());
  registry.bind('persistence', ctx.persistence || new MemoryPersistenceService());
  registry.bind('crowdAI', new ScriptedCrowdSimulation());
  return registry;
}
