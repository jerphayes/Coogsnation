/**
 * VenueObject
 * ---------------------------------------------------------------------------
 * The universal contract. Every interactive thing in a venue — seat, avatar,
 * camera, light, scoreboard, door, escalator, suite, concession, parking bay,
 * display — presents this interface.
 *
 * WHY THIS IS A CONTRACT AND NOT ALWAYS AN INSTANCE
 * ------------------------------------------------
 * Two protected architectural decisions collide here:
 *
 *   "everything inherits from VenueObject"   (consistency)
 *   "typed-array seat storage"               (60k seats without a GC problem)
 *
 * Instantiating 60,000 Seat objects is precisely the ~12 MB heap and
 * per-occupancy-change garbage that the struct-of-arrays layout exists to
 * avoid. Exempting seats from the contract would defeat the consistency the
 * contract exists to create.
 *
 * The resolution is a flyweight, now ratified as a standing rule:
 *
 *   Any object class that may scale into the tens or hundreds of THOUSANDS is
 *   VIRTUAL — backed by the most efficient internal representation available,
 *   and presented through this contract via handles built on demand
 *   (see core/VirtualCollection.js).
 *
 *   Any object class that stays in the tens or hundreds is CONCRETE — an
 *   ordinary stored instance.
 *
 * Currently virtual: seats, crowd members, parking spaces.
 * Currently concrete: cameras, scoreboards, access points, lights, zones, avatars.
 *
 * Performance is a first-class architectural requirement. Use the most
 * efficient internal representation available; present a consistent external
 * object model regardless.
 *
 * Callers cannot tell the difference. Querying, events, serialization,
 * networking, persistence and AI systems all behave identically. That is the
 * whole point: the seam is an implementation detail of the type, not of the
 * API — and tests/conformance.mjs runs the same battery against both to keep
 * it that way.
 *
 * IDENTITY
 * --------
 * `id`          runtime-unique, cheap, not stable across sessions
 * `persistentId` stable across sessions and across rebuilds of the venue
 *
 * Persistent ids are DERIVED, not random, for anything positional. A seat's
 * persistent id is `venue:tier:section:row:number` — rebuild the venue from
 * the same definition and every seat reclaims its own history. A random UUID
 * would orphan every ticket the first time the tier table changed.
 */

let RUNTIME_SEQ = 0;

/** Canonical object types. Plugins may register additional ones. */
export const OBJECT_TYPE = {
  SEAT: 'seat',
  AVATAR: 'avatar',
  CAMERA: 'camera',
  LIGHT: 'light',
  SCOREBOARD: 'scoreboard',
  DISPLAY: 'display',
  ACCESS_POINT: 'accessPoint',   // door, tunnel, escalator, elevator, gate
  SUITE: 'suite',
  CONCESSION: 'concession',
  PARKING: 'parking',
  ZONE: 'zone'                   // abstract region: section, concourse, lot
};

export class VenueObject {
  /**
   * @param {object} spec
   * @param {string}  spec.type          one of OBJECT_TYPE, or a plugin type
   * @param {string}  spec.persistentId  stable identity; derive it, don't randomise
   * @param {object} [spec.transform]    { position, rotation, scale }
   * @param {object} [spec.state]        mutable live state — the digital twin
   * @param {object} [spec.metadata]     descriptive, rarely changes
   * @param {string} [spec.owner]        userId, or null
   */
  constructor(spec = {}) {
    if (!spec.type) throw new TypeError('VenueObject requires a type');
    if (!spec.persistentId) throw new TypeError(`VenueObject(${spec.type}) requires a persistentId`);

    this.id = `${spec.type}#${++RUNTIME_SEQ}`;
    this.persistentId = spec.persistentId;
    this.type = spec.type;

    this.transform = Object.assign(
      { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      spec.transform || {}
    );

    /** Live state. Never mutate directly — use setState so listeners fire. */
    this.state = Object.assign({}, spec.state || {});
    /** Descriptive facts. Changing these is a schema change, not an event. */
    this.metadata = Object.freeze(Object.assign({}, spec.metadata || {}));

    this.owner = spec.owner ?? null;

    this._handlers = new Map();
    /** Keys changed since the last delta collection. */
    this._dirty = new Set();
    this._disposed = false;
  }

  /* ======================================================================
   * STATE — the digital twin surface
   * ==================================================================== */

  /**
   * Merge a patch into live state. Only keys whose value actually changed are
   * reported, so an idempotent write costs one comparison and emits nothing —
   * which matters when a directive fans out across thousands of objects.
   *
   * @param {object} patch
   * @param {{silent?:boolean, source?:string}} [opts]
   * @returns {string[]} keys that changed
   */
  setState(patch, opts = {}) {
    const changed = [];
    for (const [k, v] of Object.entries(patch)) {
      if (Object.is(this.state[k], v)) continue;
      const previous = this.state[k];
      this.state[k] = v;
      this._dirty.add(k);
      changed.push(k);
      if (!opts.silent) {
        this.emit('state', { key: k, value: v, previous, source: opts.source });
      }
    }
    if (changed.length && !opts.silent) {
      this.emit('changed', { keys: changed, source: opts.source });
    }
    return changed;
  }

  /** @param {string} key @returns {*} */
  get(key) { return this.state[key]; }

  /**
   * Predicate match used by ObjectRegistry.query(). Accepts exact values,
   * arrays (any-of) and predicate functions.
   * @param {object} criteria
   */
  matches(criteria = {}) {
    for (const [k, want] of Object.entries(criteria)) {
      const have = k === 'type' ? this.type
                 : k === 'owner' ? this.owner
                 : this.state[k] !== undefined ? this.state[k]
                 : this.metadata[k];
      if (typeof want === 'function') { if (!want(have, this)) return false; }
      else if (Array.isArray(want))   { if (!want.includes(have)) return false; }
      else if (have !== want)         return false;
    }
    return true;
  }

  /* ======================================================================
   * TRANSFORM
   * ==================================================================== */

  setTransform(patch, opts = {}) {
    let touched = false;
    for (const key of ['position', 'rotation', 'scale']) {
      if (!patch[key]) continue;
      const a = this.transform[key], b = patch[key];
      if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) continue;
      this.transform[key] = [b[0], b[1], b[2]];
      this._dirty.add(`transform.${key}`);
      touched = true;
    }
    if (touched && !opts.silent) this.emit('transform', { transform: this.transform });
    return touched;
  }

  /** Squared distance to a point — squared, because callers usually sort. */
  distanceSqTo(x, y, z) {
    const [px, py, pz] = this.transform.position;
    const dx = px - x, dy = py - y, dz = pz - z;
    return dx * dx + dy * dy + dz * dz;
  }

  /* ======================================================================
   * OWNERSHIP
   * ==================================================================== */

  claim(userId, meta = {}) {
    if (this.owner != null && this.owner !== userId) return false;
    this.owner = userId;
    this._dirty.add('owner');
    this.emit('claimed', { userId, ...meta });
    return true;
  }

  release() {
    if (this.owner == null) return false;
    const previous = this.owner;
    this.owner = null;
    this._dirty.add('owner');
    this.emit('released', { userId: previous });
    return true;
  }

  /* ======================================================================
   * EVENTS
   * Per-object hooks. Coarse, venue-wide traffic belongs on the EventBus;
   * these are for "tell me about this one thing".
   * ==================================================================== */

  on(event, handler) {
    let set = this._handlers.get(event);
    if (!set) { set = new Set(); this._handlers.set(event, set); }
    set.add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this._handlers.get(event)?.delete(handler);
  }

  emit(event, payload) {
    const set = this._handlers.get(event);
    if (set) {
      for (const h of [...set]) {
        try { h(payload, this); }
        catch (err) { console.error(`[${this.id}] handler for "${event}" threw:`, err); }
      }
    }
    // Wildcard: registry subscribes here to build the venue-wide change stream.
    const all = this._handlers.get('*');
    if (all) for (const h of [...all]) h({ event, payload }, this);
  }

  /* ======================================================================
   * SERIALIZATION AND NETWORK SYNC
   * ==================================================================== */

  /** Full snapshot. Version-tagged so a schema change is detectable. */
  serialize() {
    return {
      v: 1,
      pid: this.persistentId,
      type: this.type,
      transform: this.transform,
      state: { ...this.state },
      metadata: { ...this.metadata },
      owner: this.owner
    };
  }

  /** Restore in place from a snapshot. Runtime `id` is not restored. */
  hydrate(data, opts = {}) {
    if (data.v !== 1) console.warn(`[${this.id}] snapshot v${data.v}, expected v1`);
    if (data.transform) this.setTransform(data.transform, opts);
    if (data.state) this.setState(data.state, opts);
    if ('owner' in data) this.owner = data.owner;
    this._dirty.clear();
    return this;
  }

  /**
   * Changed fields since the last call, or null if nothing changed. Clearing
   * on read is deliberate: the caller that collects a delta is the one
   * responsible for delivering it.
   */
  collectDelta() {
    if (!this._dirty.size) return null;
    const delta = { pid: this.persistentId, type: this.type };
    for (const key of this._dirty) {
      if (key === 'owner') delta.owner = this.owner;
      else if (key.startsWith('transform.')) {
        delta.transform = delta.transform || {};
        const part = key.slice(10);
        delta.transform[part] = this.transform[part];
      } else {
        delta.state = delta.state || {};
        delta.state[key] = this.state[key];
      }
    }
    this._dirty.clear();
    return delta;
  }

  applyDelta(delta, opts = { silent: false, source: 'network' }) {
    if (delta.transform) this.setTransform(delta.transform, opts);
    if (delta.state) this.setState(delta.state, opts);
    if ('owner' in delta) this.owner = delta.owner;
    this._dirty.clear();      // remote authority wins; don't echo it back
  }

  get isDirty() { return this._dirty.size > 0; }

  /* ======================================================================
   * LIFECYCLE
   * ==================================================================== */

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.emit('disposed', {});
    this._handlers.clear();
    this._dirty.clear();
  }

  get disposed() { return this._disposed; }

  toString() { return `${this.type}(${this.persistentId})`; }
}

/**
 * Compose a persistent id from stable parts. Use this rather than string
 * concatenation at call sites so the separator stays in one place.
 * @param {...(string|number)} parts
 */
export function persistentId(...parts) {
  return parts.map(p => String(p).replace(/:/g, '_')).join(':');
}

export default VenueObject;
