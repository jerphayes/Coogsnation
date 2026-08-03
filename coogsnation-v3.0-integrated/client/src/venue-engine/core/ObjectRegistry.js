/**
 * ObjectRegistry
 * ---------------------------------------------------------------------------
 * The digital twin. Every VenueObject is reachable from here, and the venue is
 * queryable as live state rather than as a rendered scene:
 *
 *   registry.query({ type: 'seat', occupancy: 'empty', vip: true })
 *   registry.query({ type: 'accessPoint', state: 'closed' })
 *   registry.near(x, y, z, 25, { type: 'avatar' })
 *   registry.get('seat:lower:112:14:7')
 *
 * TWO KINDS OF MEMBERSHIP
 * -----------------------
 * Concrete: an instance is stored. Right for anything countable in hundreds —
 * scoreboards, doors, light rigs, cameras, suites, concessions.
 *
 * Virtual: a *collection provider* is stored, and objects are materialised on
 * demand. Right for anything countable in tens of thousands. Seats are the
 * motivating case: 60,000 stored instances would undo the typed-array storage
 * decision, so SeatManager registers a provider that can resolve a handle by
 * index or persistent id and iterate cheaply.
 *
 * Query, state, events, serialization and delta collection behave identically
 * for both. Callers cannot tell which they are holding, and must not need to.
 *
 * COST HONESTY
 * ------------
 * A query with no `type` filter walks every provider, and for seats that means
 * 60,000 predicate evaluations. Providers may therefore expose `fastQuery` to
 * answer common criteria from their backing arrays without materialising
 * anything — SeatManager uses this for occupancy, which is the query the UI
 * runs constantly. Where no fast path exists, the walk is honest and O(n); it
 * is not hidden behind an index that silently goes stale.
 */

import { VenueObject } from './VenueObject.js';
import { VirtualCollection } from './VirtualCollection.js';

/**
 * @typedef {object} CollectionProvider
 * @property {string}   type
 * @property {number}   count
 * @property {(index:number) => VenueObject|null}     resolveByIndex
 * @property {(pid:string) => VenueObject|null}       resolveByPersistentId
 * @property {(criteria:object) => number[]|null}    [fastQuery]  indices, or null to fall back
 * @property {() => Iterable<number>}                [indices]    defaults to 0..count-1
 */

export class ObjectRegistry {
  /** @param {{bus?:object}} [ctx] */
  constructor(ctx = {}) {
    this.bus = ctx.bus || null;

    /** @type {Map<string, VenueObject>} persistentId → instance */
    this._objects = new Map();
    /** @type {Map<string, Set<string>>} type → persistentIds */
    this._byType = new Map();
    /** @type {Map<string, CollectionProvider>} type → provider */
    this._collections = new Map();
    /** @type {Set<VenueObject>} concrete objects with pending deltas */
    this._dirty = new Set();
    /** @type {Set<Function>} */
    this._watchers = new Set();
  }

  /* ======================================================================
   * REGISTRATION
   * ==================================================================== */

  /**
   * @param {VenueObject} obj
   * @returns {VenueObject}
   */
  add(obj) {
    if (!(obj instanceof VenueObject)) {
      throw new TypeError(`ObjectRegistry.add expects a VenueObject, got ${obj?.constructor?.name}`);
    }
    if (this._objects.has(obj.persistentId)) {
      throw new Error(`Duplicate persistentId "${obj.persistentId}" — ids must be unique across the venue`);
    }
    this._objects.set(obj.persistentId, obj);
    if (!this._byType.has(obj.type)) this._byType.set(obj.type, new Set());
    this._byType.get(obj.type).add(obj.persistentId);

    obj.on('*', ({ event, payload }) => this._onObjectEvent(obj, event, payload));
    return obj;
  }

  remove(persistentIdOrObj) {
    const pid = typeof persistentIdOrObj === 'string' ? persistentIdOrObj : persistentIdOrObj.persistentId;
    const obj = this._objects.get(pid);
    if (!obj) return false;
    this._objects.delete(pid);
    this._byType.get(obj.type)?.delete(pid);
    this._dirty.delete(obj);
    obj.dispose();
    return true;
  }

  /**
   * Register a high-cardinality type backed by its own storage.
   * @param {CollectionProvider} provider
   */
  registerCollection(provider) {
    if (!provider?.type) throw new TypeError('CollectionProvider requires a type');
    for (const fn of ['resolveByIndex', 'resolveByPersistentId']) {
      if (typeof provider[fn] !== 'function') {
        throw new TypeError(`CollectionProvider("${provider.type}") must implement ${fn}()`);
      }
    }
    this._collections.set(provider.type, provider);

    // Virtual objects must reach the venue-wide change stream, or a watcher
    // would silently see concrete events only — one of the ways a caller could
    // otherwise tell the two apart.
    if (typeof provider.watch === 'function') {
      provider.watch(evt => this._fanout(evt.object, evt.event, evt.payload));
    }
    return provider;
  }

  /* ======================================================================
   * LOOKUP
   * ==================================================================== */

  /** @param {string} persistentId @returns {VenueObject|null} */
  get(persistentId) {
    const direct = this._objects.get(persistentId);
    if (direct) return direct;
    // Virtual types encode their type as the first segment of the id.
    const type = String(persistentId).split(':')[0];
    return this._collections.get(type)?.resolveByPersistentId(persistentId) || null;
  }

  has(persistentId) { return !!this.get(persistentId); }

  /** @param {string} type @returns {VenueObject[]} */
  ofType(type) {
    const provider = this._collections.get(type);
    if (provider) return this._materialiseAll(provider);
    const ids = this._byType.get(type);
    return ids ? [...ids].map(id => this._objects.get(id)) : [];
  }

  /** Number of objects of a type without materialising any of them. */
  countOfType(type) {
    const provider = this._collections.get(type);
    if (provider) return provider.count;
    return this._byType.get(type)?.size || 0;
  }

  /** Every type currently known, concrete or virtual. */
  types() {
    return [...new Set([...this._byType.keys(), ...this._collections.keys()])];
  }

  /* ======================================================================
   * QUERY
   * ==================================================================== */

  /**
   * @param {object} criteria  matched by VenueObject.matches(); `type` narrows
   *                           the search before anything is materialised
   * @param {{limit?:number}} [opts]
   * @returns {VenueObject[]}
   */
  query(criteria = {}, opts = {}) {
    const limit = opts.limit ?? Infinity;
    const out = [];
    const { type, ...rest } = criteria;
    const types = type
      ? (Array.isArray(type) ? type : [type])
      : this.types();

    for (const t of types) {
      if (out.length >= limit) break;
      const provider = this._collections.get(t);

      if (provider) {
        // Ask the backing store first — it can answer occupancy questions from
        // a typed array without building a single handle. safeQueryIndices
        // enforces the contract rather than trusting each subclass with it.
        const fast = provider.safeQueryIndices
          ? provider.safeQueryIndices(rest)
          : (provider.fastQuery?.(rest) ?? null);
        const indices = fast ?? (opts.indices ?? provider.indices?.() ?? this._range(provider.count));
        for (const i of indices) {
          if (out.length >= limit) break;
          const obj = provider.resolveByIndex(i);
          if (!obj) continue;
          if (fast || obj.matches(rest)) out.push(obj);
          else provider.recycle?.(obj);   // non-matches go back to the pool
        }
      } else {
        for (const pid of this._byType.get(t) || []) {
          if (out.length >= limit) break;
          const obj = this._objects.get(pid);
          if (obj && obj.matches(rest)) out.push(obj);
        }
      }
    }
    return out;
  }

  /** First match, or null. Cheaper than query() when you want one thing. */
  find(criteria) { return this.query(criteria, { limit: 1 })[0] || null; }

  /**
   * Objects within `radius` of a point, nearest first.
   * @param {number} x @param {number} y @param {number} z @param {number} radius
   * @param {object} [criteria]
   */
  /**
   * Objects within `radius` of a point, nearest first.
   *
   * For virtual collections the distance test runs over raw positions and only
   * survivors are materialised. The naive order — materialise everything, then
   * filter — cost 117ms and 60,000 handles to return 317 objects, which made
   * this API unusable for the proximity work it exists to serve.
   */
  near(x, y, z, radius, criteria = {}) {
    const r2 = radius * radius;
    const { type, ...rest } = criteria;
    const types = type ? (Array.isArray(type) ? type : [type]) : this.types();
    const scored = [];

    for (const t of types) {
      const provider = this._collections.get(t);
      if (provider?.nearIndices) {
        const prefilter = provider.safeQueryIndices ? provider.safeQueryIndices(rest) : null;
        const indices = provider.nearIndices(x, y, z, radius, prefilter ?? undefined);
        for (const i of indices) {
          const obj = provider.resolveByIndex(i);
          if (!obj) continue;
          if (!prefilter && Object.keys(rest).length && !obj.matches(rest)) {
            provider.recycle?.(obj);
            continue;
          }
          scored.push({ o: obj, d: obj.distanceSqTo(x, y, z) });
        }
      } else {
        for (const obj of this.query({ type: t, ...rest })) {
          const d = obj.distanceSqTo(x, y, z);
          if (d <= r2) scored.push({ o: obj, d });
        }
      }
    }
    return scored.sort((a, b) => a.d - b.d).map(e => e.o);
  }

  /** Aggregate a state field into counts. `summary('seat','occupancy')`. */
  summary(type, field) {
    const counts = Object.create(null);
    const provider = this._collections.get(type);
    if (provider) {
      const fast = provider.safeSummary ? provider.safeSummary(field)
                                        : provider.fastSummary?.(field);
      if (fast) return fast;
    }
    for (const obj of this.ofType(type)) {
      const v = obj.state[field] ?? obj.metadata[field] ?? 'undefined';
      counts[v] = (counts[v] || 0) + 1;
    }
    return counts;
  }

  /* ======================================================================
   * CHANGE STREAM
   * ==================================================================== */

  /**
   * Observe every object event in the venue. This is what an analytics
   * plugin, a replay recorder or a network authority subscribes to.
   * @param {(evt:{object:VenueObject, event:string, payload:any}) => void} handler
   * @returns {() => void} unsubscribe
   */
  watch(handler) {
    this._watchers.add(handler);
    return () => this._watchers.delete(handler);
  }

  _onObjectEvent(obj, event, payload) {
    if (obj.isDirty) this._dirty.add(obj);
    this._fanout(obj, event, payload);
  }

  _fanout(object, event, payload) {
    for (const w of [...this._watchers]) {
      try { w({ object, event, payload }); }
      catch (err) { console.error('[ObjectRegistry] watcher threw:', err); }
    }
  }

  /**
   * Deltas for everything changed since the last call — concrete AND virtual.
   *
   * Virtual collections track dirt per index on the collection rather than on
   * the handle, precisely because handles are pooled and may be recycled
   * before anyone collects. Cost is proportional to what CHANGED, never to
   * cardinality: a venue of 60,000 untouched seats collects nothing.
   *
   * This is what makes networking identical across both representations. An
   * earlier revision excluded virtual objects here; that was a place callers
   * could tell the difference, and it is closed.
   */
  collectDeltas() {
    const out = [];
    for (const obj of this._dirty) {
      const d = obj.collectDelta();
      if (d) out.push(d);
    }
    this._dirty.clear();
    for (const provider of this._collections.values()) {
      if (typeof provider.collectDeltas === 'function') out.push(...provider.collectDeltas());
    }
    return out;
  }

  applyDeltas(deltas) {
    for (const d of deltas) this.get(d.pid)?.applyDelta(d);
  }

  /* ======================================================================
   * SNAPSHOT
   * ==================================================================== */

  /**
   * Full venue snapshot, covering both representations. Virtual collections
   * contribute only indices that diverge from their built default, so a venue
   * of untouched objects snapshots to almost nothing — which is what makes
   * persistence affordable at this cardinality.
   */
  snapshot() {
    const objects = [...this._objects.values()].map(o => o.serialize());
    const collections = {};
    for (const [type, provider] of this._collections) {
      collections[type] = provider.snapshot?.() ?? { count: provider.count, entries: [] };
    }
    return { v: 1, at: Date.now(), objects, collections };
  }

  restore(snap) {
    if (snap.v !== 1) throw new Error(`Unsupported snapshot version ${snap.v}`);
    for (const data of snap.objects) {
      this._objects.get(data.pid)?.hydrate(data, { source: 'restore' });
    }
    for (const [type, payload] of Object.entries(snap.collections || {})) {
      this._collections.get(type)?.restore?.(payload);
    }
  }

  /* ======================================================================
   * INTERNALS
   * ==================================================================== */

  * _range(n) { for (let i = 0; i < n; i++) yield i; }

  _materialiseAll(provider) {
    const out = [];
    const indices = provider.indices?.() ?? this._range(provider.count);
    for (const i of indices) {
      const o = provider.resolveByIndex(i);
      if (o) out.push(o);
    }
    return out;
  }

  stats() {
    const byType = {};
    for (const t of this.types()) byType[t] = this.countOfType(t);
    return {
      concrete: this._objects.size,
      collections: this._collections.size,
      total: Object.values(byType).reduce((a, b) => a + b, 0),
      byType
    };
  }

  dispose() {
    for (const obj of this._objects.values()) obj.dispose();
    this._objects.clear();
    this._byType.clear();
    this._collections.clear();
    this._watchers.clear();
    this._dirty.clear();
  }
}

export default ObjectRegistry;
