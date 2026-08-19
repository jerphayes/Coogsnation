/**
 * EventBus
 * ---------------------------------------------------------------------------
 * The only channel modules use to talk to each other. Nothing imports another
 * manager directly, which is what keeps networking uncoupled from rendering:
 * NetworkManager publishes `seat:claimed`, SeatManager and AvatarManager both
 * react, and neither knows the other exists.
 *
 * Deliberately tiny — no wildcards, no async, no priority. Handlers run
 * synchronously in subscription order inside the emitting call stack.
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._channels = new Map();
    this._muted = false;
  }

  /**
   * @param {string} type
   * @param {Function} handler
   * @returns {Function} unsubscribe
   */
  on(type, handler) {
    let set = this._channels.get(type);
    if (!set) { set = new Set(); this._channels.set(type, set); }
    set.add(handler);
    return () => this.off(type, handler);
  }

  once(type, handler) {
    const off = this.on(type, (...args) => { off(); handler(...args); });
    return off;
  }

  off(type, handler) {
    const set = this._channels.get(type);
    if (set) { set.delete(handler); if (!set.size) this._channels.delete(type); }
  }

  emit(type, payload) {
    if (this._muted) return;
    const set = this._channels.get(type);
    if (!set) return;
    // Copy so handlers may unsubscribe during dispatch.
    for (const handler of [...set]) {
      try { handler(payload); }
      catch (err) { console.error(`[EventBus] handler for "${type}" threw:`, err); }
    }
  }

  /** Suppress dispatch, e.g. while tearing down. */
  mute(v = true) { this._muted = v; }

  clear() { this._channels.clear(); }
}

/**
 * Canonical event names. Import these rather than typing string literals so a
 * rename is a compile-time-ish problem instead of a silent no-op.
 */
export const EVT = {
  // lifecycle
  ENGINE_READY:     'engine:ready',
  ENGINE_TICK:      'engine:tick',        // { dt, elapsed }
  ENGINE_RESIZE:    'engine:resize',      // { width, height }
  LOAD_PROGRESS:    'load:progress',      // { fraction, message }

  // seating
  SEAT_HOVER:       'seat:hover',         // { seatIndex } | { seatIndex: -1 }
  SEAT_PICK:        'seat:pick',          // { seatIndex }
  SEAT_CLAIMED:     'seat:claimed',       // { seatIndex, userId, username, team }
  SEAT_RELEASED:    'seat:released',      // { seatIndex, userId }
  SEAT_FOCUS:       'seat:focus',         // { seatIndex } — camera should move

  // avatars
  AVATAR_ADDED:     'avatar:added',       // { userId, seatIndex, username, team }
  AVATAR_REMOVED:   'avatar:removed',     // { userId }
  AVATAR_EMOTE:     'avatar:emote',       // { userId, emote }

  // crowd
  CROWD_REACTION:   'crowd:reaction',     // { type, origin? }

  // camera
  CAMERA_MODE:      'camera:mode',        // { mode, options }

  // network
  NET_STATUS:       'net:status',         // { state, detail }
  NET_PRESENCE:     'net:presence',       // { users: [...] }
  NET_CHAT:         'net:chat',           // { userId, username, text, ts }

  // ui
  UI_NOTICE:        'ui:notice',          // { text, level }

  // ── Phase II ──────────────────────────────────────────────────────────
  // object model / digital twin
  OBJECT_ADDED:     'object:added',       // { object }
  OBJECT_REMOVED:   'object:removed',     // { persistentId }
  OBJECT_CHANGED:   'object:changed',     // { persistentId, keys }

  // orchestration
  DIRECTOR_DIRECTIVE:  'director:directive',   // Directive
  DIRECTOR_UNHANDLED:  'director:unhandled',   // Directive with no implementation yet
  DIRECTOR_STATE:      'director:state',       // { enabled }

  // plugins
  PLUGIN_LOADED:    'plugin:loaded',      // { id, version }
  PLUGIN_UNLOADED:  'plugin:unloaded'     // { id }
};

export default EventBus;
