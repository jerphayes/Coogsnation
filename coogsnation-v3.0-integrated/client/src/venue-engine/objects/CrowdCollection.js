/**
 * CrowdCollection
 * ---------------------------------------------------------------------------
 * AI crowd members as virtual VenueObjects, backed by CrowdManager's GPU
 * attribute buffers.
 *
 * ~50,000 spectators. Under the ratified rule this is unambiguously virtual,
 * and the backing store is already the most efficient representation
 * available — the same Float32Arrays the vertex shader reads. A crowd member
 * object adds a queryable identity over that data and costs nothing until
 * someone asks for one.
 *
 * What this buys, concretely: an AI director can now ask "how loud is section
 * 112" or "who is standing in the south stands" without CrowdManager exposing
 * its internals, and a future crowd-simulation service can address individual
 * spectators through the same API it uses for avatars.
 *
 * Indexing: crowd members live in per-section chunks. A global index is
 * flattened across chunks via a prefix-sum offset table, computed once.
 */

import { VirtualCollection } from '../core/VirtualCollection.js';
import { OBJECT_TYPE, persistentId } from '../core/VenueObject.js';

/** Crowd members are not a canonical engine type; they extend the vocabulary. */
export const CROWD_MEMBER = 'crowdMember';

export class CrowdCollection extends VirtualCollection {
  /** @param {{crowd:CrowdManager, seats:SeatManager, venueId:string}} ctx */
  constructor(ctx) {
    super({ type: CROWD_MEMBER, venueId: ctx.venueId, poolSize: 512 });
    this.crowd = ctx.crowd;
    this.seats = ctx.seats;
    this._rebuildOffsets();
  }

  /** Prefix sums so a global index resolves to (chunk, local) in O(log n). */
  _rebuildOffsets() {
    this._offsets = [];
    let total = 0;
    for (const chunk of this.crowd.chunks) {
      this._offsets.push(total);
      total += chunk.seatIndices.length;
    }
    this._count = total;
  }

  get count() { return this._count; }

  _locate(i) {
    const offs = this._offsets;
    let lo = 0, hi = offs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offs[mid] <= i) lo = mid; else hi = mid - 1;
    }
    return { chunk: this.crowd.chunks[lo], local: i - offs[lo] };
  }

  describe(i) {
    const { chunk, local } = this._locate(i);
    const seatIndex = chunk.seatIndices[local];
    const s = this.seats;
    const section = s.sections[s.section[seatIndex]];
    return {
      persistentId: persistentId(CROWD_MEMBER, this.venueId, section.label, seatIndex),
      metadata: {
        seatIndex,
        section: section.label,
        tier: s.venue.tiers[s.tier[seatIndex]].id
      }
    };
  }

  readState(i) {
    const { chunk, local } = this._locate(i);
    const geo = chunk.points.geometry;
    const vis = geo.getAttribute('aVisible').array[local];
    const col = geo.getAttribute('aColor').array;
    const seatIndex = chunk.seatIndices[local];
    return {
      present: vis > 0.5,
      // A hidden crowd member means a real user took the seat.
      displacedBy: vis > 0.5 ? null : (this.seats.avatarId[seatIndex] >= 0
        ? this.seats.avatarId[seatIndex] : null),
      activity: vis > 0.5 ? 'seated' : 'absent',
      color: [col[local * 3], col[local * 3 + 1], col[local * 3 + 2]],
      seatIndex
    };
  }

  writeState(i, patch) {
    const { chunk, local } = this._locate(i);
    const geo = chunk.points.geometry;
    const changed = [];

    if ('present' in patch) {
      const attr = geo.getAttribute('aVisible');
      const want = patch.present ? 1 : 0;
      if (attr.array[local] !== want) {
        attr.array[local] = want;
        attr.needsUpdate = true;
        changed.push('present', 'activity');
      }
    }
    if ('color' in patch && Array.isArray(patch.color)) {
      const attr = geo.getAttribute('aColor');
      attr.array[local * 3] = patch.color[0];
      attr.array[local * 3 + 1] = patch.color[1];
      attr.array[local * 3 + 2] = patch.color[2];
      attr.needsUpdate = true;
      changed.push('color');
    }
    return changed;
  }

  readTransform(i) {
    const { chunk, local } = this._locate(i);
    const p = chunk.points.geometry.getAttribute('position').array;
    return {
      position: [p[local * 3], p[local * 3 + 1], p[local * 3 + 2]],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    };
  }

  /** Crowd members are scenery — nobody owns one. */
  readOwner() { return null; }

  positionAt(i) {
    const { chunk, local } = this._locate(i);
    const p = chunk.points.geometry.getAttribute('position').array;
    return [p[local * 3], p[local * 3 + 1], p[local * 3 + 2]];
  }

  /** Never persisted: the crowd is regenerated from fillRate on every boot. */
  isDivergent() { return false; }

  fastQuery(criteria) {
    const keys = Object.keys(criteria);
    if (!keys.length || !keys.every(k => k === 'present' || k === 'activity')) return null;
    const want = criteria.present !== undefined ? !!criteria.present
               : criteria.activity === 'seated';
    const out = [];
    for (let c = 0; c < this.crowd.chunks.length; c++) {
      const chunk = this.crowd.chunks[c];
      const vis = chunk.points.geometry.getAttribute('aVisible').array;
      const base = this._offsets[c];
      for (let j = 0; j < vis.length; j++) {
        if ((vis[j] > 0.5) === want) out.push(base + j);
      }
    }
    return out;
  }

  fastSummary(field) {
    if (field !== 'present' && field !== 'activity') return null;
    let present = 0, absent = 0;
    for (const chunk of this.crowd.chunks) {
      const vis = chunk.points.geometry.getAttribute('aVisible').array;
      for (let j = 0; j < vis.length; j++) vis[j] > 0.5 ? present++ : absent++;
    }
    return field === 'present'
      ? { true: present, false: absent }
      : { seated: present, absent };
  }
}

export default CrowdCollection;
