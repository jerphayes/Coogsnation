/**
 * VirtualCollection + VirtualHandle
 * ---------------------------------------------------------------------------
 * The formalised flyweight. This is the base every high-volume object type
 * extends, so the pattern is correct by construction rather than reimplemented
 * — and subtly wrong — each time.
 *
 * THE RULE (ratified, applies to every future object class)
 * --------------------------------------------------------
 *   Any object class that may scale into the tens or hundreds of thousands is
 *   VIRTUAL: backed by the most efficient internal representation available —
 *   typed arrays — and presented through the same VenueObject contract as
 *   everything else.
 *
 *   Any object class that stays in the tens or hundreds is CONCRETE.
 *
 *   Callers cannot tell which they are holding. Querying, events,
 *   serialization, networking, persistence and AI operate identically.
 *
 * WHAT A SUBCLASS PROVIDES
 * ------------------------
 * Only the field accessors over its backing store:
 *
 *   get count()
 *   describe(i)      → { persistentId, metadata }   identity, built once per resolve
 *   readState(i)     → object                       live view
 *   writeState(i, p) → string[]                     keys actually changed
 *   readTransform(i) → { position, rotation, scale }
 *   readOwner(i)     → string|number|null
 *
 * Optional, and worth implementing:
 *
 *   fastQuery(criteria)   → indices | null   answer from arrays, allocate nothing
 *   fastSummary(field)    → counts   | null
 *   isDivergent(i)        → boolean          does this differ from its built default
 *   claimAt(i, spec) / releaseAt(i)
 *
 * Everything else — pooling, persistent-id indexing, delta tracking, snapshot,
 * restore, event dispatch — is handled here, identically for every type.
 *
 * WHY POOLING
 * -----------
 * A registry query can materialise thousands of handles in one frame.
 * Allocating them would reintroduce exactly the garbage pressure the flyweight
 * exists to prevent. The pool is bounded, so a leak degrades to plain
 * allocation rather than unbounded growth.
 *
 * The one caller-visible consequence, documented at every entry point:
 * HOLD THE INDEX, NOT THE HANDLE. The index is a number and is stable; a
 * handle is pooled and may be rebound to a different object after you release
 * your reference to it.
 */

import { VenueObject } from './VenueObject.js';

/* ═══════════════════════════════════════════════════════════════════════
 * HANDLE
 * A VenueObject whose storage lives somewhere else. Every accessor reads
 * through to the collection, so a handle can never hold stale data and two
 * handles for the same object are always consistent — neither owns anything.
 * ═══════════════════════════════════════════════════════════════════════ */

export class VirtualHandle extends VenueObject {
  /**
   * @param {VirtualCollection} collection
   * @param {number} index
   */
  constructor(collection, index) {
    const d = collection.describe(index);
    super({ type: collection.type, persistentId: d.persistentId, metadata: d.metadata });
    this._collection = collection;
    this._index = index;
  }

  /** Re-point at another index. Pool reuse path; never call directly. */
  _rebind(index) {
    const d = this._collection.describe(index);
    this._index = index;
    this.persistentId = d.persistentId;
    this.metadata = Object.freeze(d.metadata || {});
    this._handlers.clear();
    this._dirty.clear();
    this._disposed = false;
    return this;
  }

  /** Stable reference. Hold this, not the handle. */
  get index() { return this._index; }
  get collection() { return this._collection; }
  get isVirtual() { return true; }

  /* ── live views ─────────────────────────────────────────────────────── */

  get state() { return this._collection.readState(this._index); }
  set state(_) { /* the backing store is the source of truth */ }

  get transform() { return this._collection.readTransform(this._index); }
  set transform(_) { /* virtual objects are positioned by their store */ }

  get owner() { return this._collection.readOwner(this._index); }
  set owner(_) { /* ownership flows through claim/release */ }

  /* ── writes ─────────────────────────────────────────────────────────── */

  setState(patch, opts = {}) {
    const before = this.state;
    const changed = this._collection.writeState(this._index, patch) || [];
    if (!changed.length) return changed;

    // Delta tracking lives on the collection, not the handle — the handle may
    // be recycled before anyone collects, and the change must survive that.
    this._collection.markDirty(this._index, changed);

    if (!opts.silent) {
      const after = this.state;
      for (const k of changed) {
        this.emit('state', { key: k, value: after[k], previous: before[k], source: opts.source });
      }
      this.emit('changed', { keys: changed, source: opts.source });
      this._collection.notify(this, 'changed', { keys: changed, source: opts.source });
    }
    return changed;
  }

  setTransform(patch, opts = {}) {
    const changed = this._collection.writeTransform?.(this._index, patch) || false;
    if (changed && !opts.silent) {
      this._collection.markDirty(this._index, ['transform.position']);
      this.emit('transform', { transform: this.transform });
    }
    return changed;
  }

  claim(userId, meta = {}) {
    const ok = this._collection.claimAt(this._index, { userId, ...meta });
    if (ok) {
      this._collection.markDirty(this._index, ['owner']);
      this.emit('claimed', { userId, ...meta });
      this._collection.notify(this, 'claimed', { userId, ...meta });
    }
    return ok;
  }

  release() {
    const previous = this.owner;
    const ok = this._collection.releaseAt(this._index);
    if (ok) {
      this._collection.markDirty(this._index, ['owner']);
      this.emit('released', { userId: previous });
      this._collection.notify(this, 'released', { userId: previous });
    }
    return ok;
  }

  /* ── contract parity ────────────────────────────────────────────────── */

  collectDelta() {
    return this._collection.collectDeltaFor(this._index);
  }

  applyDelta(delta, opts = { silent: true, source: 'network' }) {
    if (delta.state) this._collection.writeState(this._index, delta.state);
    if (delta.transform) this._collection.writeTransform?.(this._index, delta.transform);
    if ('owner' in delta && delta.owner != null) {
      this._collection.claimAt(this._index, { userId: delta.owner, ...(delta.state || {}) });
    } else if ('owner' in delta) {
      this._collection.releaseAt(this._index);
    }
    this._collection.clearDirty(this._index);
  }

  get isDirty() { return this._collection.isDirtyAt(this._index); }

  /** Return to the pool. Optional — the pool is a bounded optimisation. */
  recycle() { this._collection.recycle(this); }
}

/* ═══════════════════════════════════════════════════════════════════════
 * COLLECTION
 * ═══════════════════════════════════════════════════════════════════════ */

export class VirtualCollection {
  /** @param {{type:string, venueId:string, poolSize?:number, HandleClass?:Function}} spec */
  constructor(spec) {
    if (new.target === VirtualCollection) {
      throw new TypeError('VirtualCollection is abstract; subclass it.');
    }
    this.type = spec.type;
    this.venueId = spec.venueId;
    this.HandleClass = spec.HandleClass || VirtualHandle;

    this._pool = [];
    this._poolMax = spec.poolSize ?? 512;
    this._pidIndex = null;                 // built lazily, see resolveByPersistentId
    /** @type {Map<number, Set<string>>} index → changed keys */
    this._dirty = new Map();
    /** @type {Set<Function>} */
    this._watchers = new Set();
  }

  /* ── subclass contract ──────────────────────────────────────────────── */

  get count() { throw new Error(`${this.constructor.name} must implement get count()`); }
  describe(i) { throw new Error(`${this.constructor.name} must implement describe(index)`); }
  readState(i) { throw new Error(`${this.constructor.name} must implement readState(index)`); }
  writeState(i, patch) { return []; }
  readTransform(i) { return { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }; }
  readOwner(i) { return null; }
  claimAt(i, spec) { return false; }
  releaseAt(i) { return false; }
  /** Does this index differ from how it was built? Drives snapshot size. */
  isDivergent(i) { return false; }

  /**
   * Position without materialising a handle. The default routes through
   * readTransform, which allocates; subclasses over typed arrays should
   * override to read the array directly. This is what makes spatial queries
   * affordable at 60,000 objects.
   * @returns {[number,number,number]}
   */
  positionAt(i) { return this.readTransform(i).position; }

  /* ── fast paths, guarded ────────────────────────────────────────────── */

  /**
   * Wrapper around a subclass `fastQuery`. Subclasses answer from their
   * backing arrays; this enforces the contract they are easy to get wrong.
   *
   * The failure it prevents is specific and was found in review: a subclass
   * that omits the empty-criteria guard returns `[]` instead of `null` for
   * `query({ type })`, so an unfiltered query silently yields ZERO results and
   * reports no error. Nothing downstream can distinguish "no matches" from
   * "the fast path was wrong", so the guard belongs here, once, not in every
   * subclass.
   *
   * @returns {number[]|null} indices, or null to fall back to the generic walk
   */
  safeQueryIndices(criteria) {
    if (!criteria || Object.keys(criteria).length === 0) return null;
    if (typeof this.fastQuery !== 'function') return null;

    const out = this.fastQuery(criteria);
    if (out == null) return null;
    if (!Array.isArray(out)) {
      console.error(`[${this.type}] fastQuery must return an array or null, got ${typeof out} — ignoring`);
      return null;
    }
    if (out.length && (out[0] < 0 || out[out.length - 1] >= this.count)) {
      console.error(`[${this.type}] fastQuery returned an out-of-range index — ignoring`);
      return null;
    }
    return out;
  }

  /** Same guarantee for summaries. */
  safeSummary(field) {
    if (typeof this.fastSummary !== 'function') return null;
    const out = this.fastSummary(field);
    if (out == null) return null;
    if (typeof out !== 'object') {
      console.error(`[${this.type}] fastSummary must return an object or null — ignoring`);
      return null;
    }
    return out;
  }

  /**
   * Indices within `radius` of a point, computed from positions alone.
   * No handles are built for objects that fail the distance test — which is
   * the difference between a proximity query costing 117ms and costing 2ms.
   */
  nearIndices(x, y, z, radius, indices) {
    const r2 = radius * radius;
    const out = [];
    const list = indices ?? this._allIndices();
    for (const i of list) {
      const p = this.positionAt(i);
      const dx = p[0] - x, dy = p[1] - y, dz = p[2] - z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 <= r2) out.push(i);
    }
    return out;
  }

  /* ── resolution ─────────────────────────────────────────────────────── */

  resolveByIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) return null;
    const pooled = this._pool.pop();
    return pooled ? pooled._rebind(index) : new this.HandleClass(this, index);
  }

  /**
   * Persistent id → handle. The index is built on first use, not at boot:
   * most sessions never look one up by id, and 60,000 string keys is several
   * megabytes we would otherwise pay for unconditionally.
   */
  resolveByPersistentId(pid) {
    if (!this._pidIndex) {
      this._pidIndex = new Map();
      for (let i = 0; i < this.count; i++) {
        this._pidIndex.set(this.describe(i).persistentId, i);
      }
    }
    const i = this._pidIndex.get(pid);
    return i === undefined ? null : this.resolveByIndex(i);
  }

  /** Invalidate the id index — call if persistent ids can change. */
  invalidateIdIndex() { this._pidIndex = null; }

  recycle(handle) {
    if (handle && this._pool.length < this._poolMax) this._pool.push(handle);
  }

  /**
   * Run a function over every index without leaking handles. Preferred over
   * materialising an array when you only need to look.
   * @param {(handle:VirtualHandle, index:number) => void} fn
   * @param {number[]} [indices]
   */
  forEach(fn, indices) {
    const list = indices ?? this._allIndices();
    for (const i of list) {
      const h = this.resolveByIndex(i);
      if (!h) continue;
      try { fn(h, i); } finally { this.recycle(h); }
    }
  }

  * _allIndices() { for (let i = 0; i < this.count; i++) yield i; }
  indices() { return this._allIndices(); }

  /* ── change tracking ────────────────────────────────────────────────── */

  markDirty(index, keys) {
    let set = this._dirty.get(index);
    if (!set) { set = new Set(); this._dirty.set(index, set); }
    for (const k of keys) set.add(k);
  }

  clearDirty(index) { this._dirty.delete(index); }
  isDirtyAt(index) { return this._dirty.has(index); }

  collectDeltaFor(index) {
    const keys = this._dirty.get(index);
    if (!keys) return null;
    const delta = { pid: this.describe(index).persistentId, type: this.type };
    const state = this.readState(index);
    for (const k of keys) {
      if (k === 'owner') delta.owner = this.readOwner(index);
      else if (k.startsWith('transform.')) delta.transform = this.readTransform(index);
      else { delta.state = delta.state || {}; delta.state[k] = state[k]; }
    }
    this._dirty.delete(index);
    return delta;
  }

  /**
   * Deltas for everything changed since the last call. This is what closes the
   * last gap in the indistinguishability guarantee: virtual objects now
   * participate in network sync exactly as concrete ones do.
   */
  collectDeltas() {
    if (!this._dirty.size) return [];
    const out = [];
    for (const index of [...this._dirty.keys()]) {
      const d = this.collectDeltaFor(index);
      if (d) out.push(d);
    }
    return out;
  }

  /* ── events ─────────────────────────────────────────────────────────── */

  /**
   * Handles are transient, so a per-handle subscription would vanish on
   * recycle. The collection carries the venue-wide stream instead, and the
   * registry subscribes here — which is why `registry.watch()` sees virtual
   * object events identically to concrete ones.
   */
  watch(handler) {
    this._watchers.add(handler);
    return () => this._watchers.delete(handler);
  }

  notify(handle, event, payload) {
    for (const w of [...this._watchers]) {
      try { w({ object: handle, event, payload }); }
      catch (err) { console.error(`[${this.type}] watcher threw:`, err); }
    }
  }

  /* ── persistence ────────────────────────────────────────────────────── */

  /**
   * Only indices that diverge from their built default are worth persisting.
   * A venue of untouched objects snapshots to almost nothing, which is what
   * makes persistence affordable at this cardinality.
   */
  snapshot() {
    const entries = [];
    for (let i = 0; i < this.count; i++) {
      if (!this.isDivergent(i)) continue;
      entries.push({
        pid: this.describe(i).persistentId,
        index: i,
        state: this.readState(i),
        owner: this.readOwner(i)
      });
    }
    return { v: 1, type: this.type, count: this.count, entries };
  }

  restore(payload) {
    if (!payload?.entries) return 0;
    let applied = 0;
    for (const e of payload.entries) {
      const i = this._indexForPid(e.pid);
      if (i == null) continue;
      this.writeState(i, e.state);
      if (e.owner != null) this.claimAt(i, { userId: e.owner, ...e.state });
      this.clearDirty(i);
      applied++;
    }
    return applied;
  }

  _indexForPid(pid) {
    if (!this._pidIndex) this.resolveByPersistentId(pid);
    return this._pidIndex.get(pid) ?? null;
  }

  /* ── diagnostics ────────────────────────────────────────────────────── */

  stats() {
    return {
      type: this.type,
      count: this.count,
      pooled: this._pool.length,
      poolMax: this._poolMax,
      dirty: this._dirty.size,
      idIndexBuilt: !!this._pidIndex
    };
  }

  dispose() {
    this._pool.length = 0;
    this._dirty.clear();
    this._watchers.clear();
    this._pidIndex = null;
  }
}

export default VirtualCollection;
