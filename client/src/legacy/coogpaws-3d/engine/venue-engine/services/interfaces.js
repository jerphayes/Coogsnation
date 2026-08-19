/**
 * services/interfaces.js
 * ---------------------------------------------------------------------------
 * The contracts for every backend concern the venue will eventually need.
 *
 * These are abstract classes, not TODO comments. Each declares its full method
 * signature, its expected return shape, and what it must guarantee. That means
 * integrating a real provider later is a matter of writing a subclass and
 * changing one string in engine.config.js — not tracing call sites through the
 * renderer.
 *
 * Every method here throws `NotImplemented` in the base class. Every interface
 * ships with a working local implementation in services/local.js so the engine
 * has no hard dependency on a backend during development.
 *
 * A note on why these are separate from NetworkManager: NetworkManager moves
 * *state* (who is where, right now) over a single connection. These services
 * are *capabilities*, each of which may live behind a different provider — auth
 * on your identity provider, voice on an SFU, chat on its own moderated
 * pipeline. Collapsing them into the socket is the refactor this design exists
 * to avoid.
 */

export class NotImplemented extends Error {
  constructor(cls, method) {
    super(`${cls} must implement ${method}()`);
    this.name = 'NotImplemented';
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 * AUTH
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * @typedef {object} Session
 * @property {string}  userId     stable across sessions for a signed-in user
 * @property {string}  username   display name, may not be unique
 * @property {boolean} guest      true for anonymous sessions
 * @property {string[]} roles     e.g. ['user'], ['user','moderator']
 * @property {string=} token      bearer token for downstream services
 * @property {number=} expiresAt  epoch ms
 */

export class AuthService {
  /**
   * Resolve an existing session, or create a guest one.
   * Must never reject for "not signed in" — return a guest session instead.
   * @returns {Promise<Session>}
   */
  async resolve() { throw new NotImplemented(this.constructor.name, 'resolve'); }

  /**
   * @param {object} credentials provider-specific
   * @returns {Promise<Session>}
   */
  async signIn(credentials) { throw new NotImplemented(this.constructor.name, 'signIn'); }

  /** @returns {Promise<void>} */
  async signOut() { throw new NotImplemented(this.constructor.name, 'signOut'); }

  /** @returns {Session|null} synchronous accessor for the current session */
  getSession() { throw new NotImplemented(this.constructor.name, 'getSession'); }

  /**
   * @param {(session: Session|null) => void} handler
   * @returns {() => void} unsubscribe
   */
  onSessionChanged(handler) { throw new NotImplemented(this.constructor.name, 'onSessionChanged'); }

  /** @param {string} role @returns {boolean} */
  hasRole(role) { return !!this.getSession()?.roles?.includes(role); }
}

/* ═══════════════════════════════════════════════════════════════════════
 * CHAT
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * @typedef {object} ChatMessage
 * @property {string} id
 * @property {string} userId
 * @property {string} username
 * @property {string} text
 * @property {number} ts        epoch ms
 * @property {string=} channel  'venue' | 'section:112' | 'dm:<userId>'
 */

export class ChatService {
  /**
   * Implementations must sanitise and rate-limit server-side. Client-side
   * escaping in UIManager is display hygiene, not a security boundary.
   * @param {string} text
   * @param {string} [channel='venue']
   * @returns {Promise<void>}
   */
  async send(text, channel) { throw new NotImplemented(this.constructor.name, 'send'); }

  /**
   * @param {{channel?:string, limit?:number, before?:number}} query
   * @returns {Promise<ChatMessage[]>} oldest first
   */
  async history(query) { throw new NotImplemented(this.constructor.name, 'history'); }

  /**
   * @param {(msg: ChatMessage) => void} handler
   * @returns {() => void} unsubscribe
   */
  onMessage(handler) { throw new NotImplemented(this.constructor.name, 'onMessage'); }

  /** Client-side hide. Server-side enforcement is a moderation concern. */
  async mute(userId) { throw new NotImplemented(this.constructor.name, 'mute'); }

  /** @param {string} messageId @param {string} reason */
  async report(messageId, reason) { throw new NotImplemented(this.constructor.name, 'report'); }
}

/* ═══════════════════════════════════════════════════════════════════════
 * VOICE
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * @typedef {object} VoiceParticipant
 * @property {string} userId
 * @property {boolean} speaking
 * @property {boolean} muted
 * @property {[number,number,number]=} position  world position, for spatial mix
 */

export class VoiceService {
  /** @returns {boolean} whether this build can do voice at all */
  get supported() { return false; }

  /**
   * @param {string} channelId  'venue' | 'section:112' | 'party:<id>'
   * @returns {Promise<void>}
   */
  async join(channelId) { throw new NotImplemented(this.constructor.name, 'join'); }

  /** @returns {Promise<void>} */
  async leave() { throw new NotImplemented(this.constructor.name, 'leave'); }

  /** @param {boolean} enabled */
  setInputEnabled(enabled) { throw new NotImplemented(this.constructor.name, 'setInputEnabled'); }

  /**
   * Feed the listener transform each frame so an SFU or a WebAudio panner can
   * mix positionally. Called by AvatarManager, not by the renderer, so voice
   * never becomes a render-loop dependency.
   * @param {{position:[number,number,number], forward:[number,number,number]}} listener
   */
  updateListener(listener) { throw new NotImplemented(this.constructor.name, 'updateListener'); }

  /**
   * Report where each remote talker is sitting, so distance-based subscription
   * can drop far-away streams instead of decoding thousands of them.
   * @param {Array<{userId:string, position:[number,number,number]}>} talkers
   */
  updateTalkerPositions(talkers) { throw new NotImplemented(this.constructor.name, 'updateTalkerPositions'); }

  /** @returns {VoiceParticipant[]} */
  getParticipants() { throw new NotImplemented(this.constructor.name, 'getParticipants'); }

  /**
   * @param {(participants: VoiceParticipant[]) => void} handler
   * @returns {() => void} unsubscribe
   */
  onParticipantsChanged(handler) { throw new NotImplemented(this.constructor.name, 'onParticipantsChanged'); }
}

/* ═══════════════════════════════════════════════════════════════════════
 * PERSISTENCE
 * ═══════════════════════════════════════════════════════════════════════ */

export class PersistenceService {
  /**
   * @param {string} venueId
   * @returns {Promise<Array<{seatIndex:number, userId:string, username:string, team:string}>>}
   */
  async loadSeatOwnership(venueId) { throw new NotImplemented(this.constructor.name, 'loadSeatOwnership'); }

  /**
   * Persist a single claim. Implementations should be idempotent — the same
   * claim replayed must not create a duplicate.
   */
  async saveSeatClaim(venueId, record) { throw new NotImplemented(this.constructor.name, 'saveSeatClaim'); }

  async clearSeatClaim(venueId, seatIndex) { throw new NotImplemented(this.constructor.name, 'clearSeatClaim'); }

  /** @returns {Promise<object|null>} arbitrary per-user preferences */
  async loadProfile(userId) { throw new NotImplemented(this.constructor.name, 'loadProfile'); }

  async saveProfile(userId, profile) { throw new NotImplemented(this.constructor.name, 'saveProfile'); }
}

/* ═══════════════════════════════════════════════════════════════════════
 * CROWD SIMULATION
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * @typedef {object} CrowdDirective
 * @property {'cheer'|'wave'|'stand'|'idle'|'boo'} type
 * @property {number} [strength]  0..1
 * @property {number} [originT]   perimeter parameter for directional effects
 * @property {string} [reason]    'touchdown', 'timeout' — for logging/analytics
 */

export class CrowdSimulationService {
  /**
   * Drive crowd behaviour from outside. This exists so game state, a live
   * event feed, or a real AI director can control the bowl without any of
   * them importing CrowdManager.
   * @param {(directive: CrowdDirective) => void} handler
   * @returns {() => void} unsubscribe
   */
  onDirective(handler) { throw new NotImplemented(this.constructor.name, 'onDirective'); }

  /**
   * @param {number} dt
   * @param {{population:number, elapsed:number}} context
   */
  tick(dt, context) { throw new NotImplemented(this.constructor.name, 'tick'); }

  /** Manual trigger, e.g. from a UI button or an operator console. */
  request(directive) { throw new NotImplemented(this.constructor.name, 'request'); }

  /** @param {number} rate 0..1 — proportion of seats filled by AI */
  setDensity(rate) { throw new NotImplemented(this.constructor.name, 'setDensity'); }
}

/* ═══════════════════════════════════════════════════════════════════════
 * REGISTRY
 * ═══════════════════════════════════════════════════════════════════════ */

const CONTRACTS = {
  auth: AuthService,
  chat: ChatService,
  voice: VoiceService,
  persistence: PersistenceService,
  crowdAI: CrowdSimulationService
};

/**
 * Holds one implementation per contract and type-checks the binding, so a
 * mis-wired service fails at boot with a clear message rather than at the
 * first call site.
 */
export class ServiceRegistry {
  constructor() { this._impls = new Map(); }

  /**
   * @param {keyof CONTRACTS} name
   * @param {object} impl must be an instance of the matching contract
   */
  bind(name, impl) {
    const Contract = CONTRACTS[name];
    if (!Contract) throw new Error(`Unknown service "${name}". Known: ${Object.keys(CONTRACTS).join(', ')}`);
    if (!(impl instanceof Contract)) {
      throw new TypeError(`Service "${name}" must extend ${Contract.name}, got ${impl?.constructor?.name}`);
    }
    this._impls.set(name, impl);
    return impl;
  }

  /** @returns {any} */
  get(name) {
    const impl = this._impls.get(name);
    if (!impl) throw new Error(`Service "${name}" is not bound. Bind it in main.js.`);
    return impl;
  }

  has(name) { return this._impls.has(name); }

  /** Best-effort teardown of anything that declares dispose(). */
  async dispose() {
    for (const impl of this._impls.values()) await impl.dispose?.();
    this._impls.clear();
  }
}

export default ServiceRegistry;
