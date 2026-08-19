/**
 * ParkingCollection
 * ---------------------------------------------------------------------------
 * Parking spaces as virtual VenueObjects.
 *
 * A large venue has 15,000–25,000 spaces. Under the ratified rule that is
 * virtual, and this file is the evidence the pattern now generalises: the
 * entire type is ~120 lines, has its own typed-array store, and required no
 * change to VenueObject, ObjectRegistry, the director or any plugin.
 *
 * It also has no geometry at all. That is deliberate and worth noticing — the
 * digital twin is not a view of the scene graph. An object can be queryable,
 * claimable, persistable and network-synced while never being drawn. Parking
 * happens to be the clearest case: the lots exist as data long before anyone
 * models them.
 */

import { VirtualCollection } from '../core/VirtualCollection.js';
import { OBJECT_TYPE, persistentId } from '../core/VenueObject.js';

const STATUS = ['free', 'occupied', 'reserved', 'blocked'];
const KIND = ['standard', 'accessible', 'ev', 'oversize', 'staff'];

export class ParkingCollection extends VirtualCollection {
  /**
   * @param {{venueId:string, lots:Array<{id:string, spaces:number, rows?:number,
   *          accessibleRatio?:number, evRatio?:number, origin?:number[]}>}} ctx
   */
  constructor(ctx) {
    super({ type: OBJECT_TYPE.PARKING, venueId: ctx.venueId, poolSize: 256 });

    this.lots = ctx.lots || [];
    const total = this.lots.reduce((n, l) => n + l.spaces, 0);
    this._count = total;

    // Backing store: three bytes per space. 20,000 spaces ≈ 60 KB.
    this.status = new Uint8Array(total);
    this.kind = new Uint8Array(total);
    this.lotOf = new Uint8Array(total);
    this.ownerOf = new Array(total).fill(null);   // sparse in practice

    this._offsets = [];
    let cursor = 0;
    this.lots.forEach((lot, li) => {
      this._offsets.push(cursor);
      const acc = Math.floor(lot.spaces * (lot.accessibleRatio ?? 0.02));
      const ev = Math.floor(lot.spaces * (lot.evRatio ?? 0.03));
      for (let k = 0; k < lot.spaces; k++) {
        const i = cursor + k;
        this.lotOf[i] = li;
        this.kind[i] = k < acc ? 1 : k < acc + ev ? 2 : 0;
      }
      cursor += lot.spaces;
    });
  }

  get count() { return this._count; }

  _lotIndex(i) { return this.lots[this.lotOf[i]]; }
  _spaceNumber(i) { return i - this._offsets[this.lotOf[i]] + 1; }

  describe(i) {
    const lot = this._lotIndex(i);
    const n = this._spaceNumber(i);
    const rows = lot.rows || 20;
    const perRow = Math.ceil(lot.spaces / rows);
    return {
      persistentId: persistentId(OBJECT_TYPE.PARKING, this.venueId, lot.id, n),
      metadata: {
        lot: lot.id,
        space: n,
        row: Math.floor((n - 1) / perRow) + 1,
        kind: KIND[this.kind[i]]
      }
    };
  }

  readState(i) {
    return {
      status: STATUS[this.status[i]],
      available: this.status[i] === 0,
      kind: KIND[this.kind[i]],
      vehicle: this.ownerOf[i]?.vehicle ?? null
    };
  }

  writeState(i, patch) {
    const changed = [];
    if ('status' in patch) {
      const next = STATUS.indexOf(patch.status);
      if (next >= 0 && next !== this.status[i]) { this.status[i] = next; changed.push('status', 'available'); }
    }
    if ('available' in patch) {
      const next = patch.available ? 0 : 1;
      if (next !== this.status[i]) { this.status[i] = next; changed.push('status', 'available'); }
    }
    return changed;
  }

  readTransform(i) {
    // Synthetic layout: lots ring the venue. Geometry can be attached later
    // without any consumer of this collection noticing.
    const lot = this._lotIndex(i);
    const origin = lot.origin || [0, 0, 0];
    const n = this._spaceNumber(i) - 1;
    const rows = lot.rows || 20;
    const perRow = Math.ceil(lot.spaces / rows);
    return {
      position: [
        origin[0] + (n % perRow) * 2.6,
        origin[1],
        origin[2] + Math.floor(n / perRow) * 5.4
      ],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    };
  }

  readOwner(i) { return this.ownerOf[i]?.userId ?? null; }

  claimAt(i, spec) {
    if (this.status[i] !== 0) return false;
    this.status[i] = 1;
    this.ownerOf[i] = { userId: spec.userId, vehicle: spec.vehicle || null };
    return true;
  }

  releaseAt(i) {
    if (!this.ownerOf[i]) return false;
    this.status[i] = 0;
    this.ownerOf[i] = null;
    return true;
  }

  isDivergent(i) { return this.status[i] !== 0; }

  fastQuery(criteria) {
    const keys = Object.keys(criteria);
    if (!keys.length || !keys.every(k => ['status', 'available', 'kind', 'lot'].includes(k))) return null;
    const wantStatus = criteria.status !== undefined ? STATUS.indexOf(criteria.status) : -1;
    const wantKind = criteria.kind !== undefined ? KIND.indexOf(criteria.kind) : -1;
    const wantLot = criteria.lot !== undefined ? this.lots.findIndex(l => l.id === criteria.lot) : -1;
    const out = [];
    for (let i = 0; i < this._count; i++) {
      if (wantStatus >= 0 && this.status[i] !== wantStatus) continue;
      if (criteria.available !== undefined && (this.status[i] === 0) !== criteria.available) continue;
      if (wantKind >= 0 && this.kind[i] !== wantKind) continue;
      if (wantLot >= 0 && this.lotOf[i] !== wantLot) continue;
      out.push(i);
    }
    return out;
  }

  fastSummary(field) {
    const counts = Object.create(null);
    if (field === 'status') {
      STATUS.forEach(s => counts[s] = 0);
      for (let i = 0; i < this._count; i++) counts[STATUS[this.status[i]]]++;
      return counts;
    }
    if (field === 'kind') {
      KIND.forEach(k => counts[k] = 0);
      for (let i = 0; i < this._count; i++) counts[KIND[this.kind[i]]]++;
      return counts;
    }
    if (field === 'lot') {
      this.lots.forEach(l => counts[l.id] = l.spaces);
      return counts;
    }
    return null;
  }
}

export default ParkingCollection;
