/**
 * SeatCollection
 * ---------------------------------------------------------------------------
 * Seats as virtual VenueObjects, backed by SeatManager's typed arrays.
 *
 * This file used to be ~200 lines of pooling, id indexing, delta tracking and
 * snapshot logic. All of that now lives in VirtualCollection, and what remains
 * is only the part that is actually about seats: how to read and write six
 * fields in six arrays.
 *
 * That reduction is the point of formalising the pattern. The next high-volume
 * type costs this much, not the original amount.
 */

import { VirtualCollection } from '../core/VirtualCollection.js';
import { OBJECT_TYPE, persistentId } from '../core/VenueObject.js';

/* Flag bits, mirrored from SeatManager. */
const F_RESERVED    = 1 << 0;
const F_VIP         = 1 << 1;
const F_OBSTRUCTED  = 1 << 2;
const F_ADA         = 1 << 3;
const F_MAINTENANCE = 1 << 4;

const OCCUPANCY = ['empty', 'ai', 'user'];

export class SeatCollection extends VirtualCollection {
  /** @param {{seats:SeatManager, venueId:string}} ctx */
  constructor(ctx) {
    super({ type: OBJECT_TYPE.SEAT, venueId: ctx.venueId, poolSize: 1024 });
    this.seats = ctx.seats;
  }

  get count() { return this.seats.count; }

  describe(i) {
    const s = this.seats;
    const section = s.sections[s.section[i]];
    const tier = s.venue.tiers[s.tier[i]];
    const row = s.row[i] + 1, number = s.number[i];

    const base = {
      tier: tier.id,
      tierLabel: tier.label,
      section: section.label,
      row,
      number,
      vip: !!(s.flags[i] & F_VIP),
      ada: !!(s.flags[i] & F_ADA),
      basePrice: tier.basePrice
    };

    // Venues may contribute their own fields (bowl, student flag, camera
    // visibility). Cheap by contract — see VenueDefinition.seatMetadata.
    const extra = s.venue.seatMetadata?.({ tier, section: section.label, row, number });

    return {
      persistentId: persistentId(
        OBJECT_TYPE.SEAT, this.venueId, tier.id, section.label, row, number
      ),
      metadata: extra ? Object.assign(base, extra) : base
    };
  }

  readState(i) {
    const s = this.seats;
    return {
      occupancy: OCCUPANCY[s.occupied[i]],
      occupied: s.occupied[i] === 2,
      reserved: !!(s.flags[i] & F_RESERVED),
      vip: !!(s.flags[i] & F_VIP),
      obstructed: !!(s.flags[i] & F_OBSTRUCTED),
      maintenance: !!(s.flags[i] & F_MAINTENANCE),
      avatarId: s.avatarId[i] >= 0 ? s.avatarId[i] : null,
      username: s.username.get(i) || null
    };
  }

  writeState(i, patch) {
    const s = this.seats;
    const before = this.readState(i);
    const changed = [];
    const bit = (key, mask) => {
      if (!(key in patch)) return;
      const on = !!patch[key];
      if (on) s.flags[i] |= mask; else s.flags[i] &= ~mask;
      if (before[key] !== on) changed.push(key);
    };
    bit('reserved', F_RESERVED);
    bit('obstructed', F_OBSTRUCTED);
    bit('maintenance', F_MAINTENANCE);
    return changed;
  }

  readTransform(i) {
    const s = this.seats;
    return {
      position: [s.position[i * 3], s.position[i * 3 + 1], s.position[i * 3 + 2]],
      rotation: [0, s.yaw[i], 0],
      scale: [1, 1, 1]
    };
  }

  readOwner(i) {
    const id = this.seats.avatarId[i];
    return id >= 0 ? id : null;
  }

  /** Reads the position array directly — no handle, no transform object. */
  positionAt(i) {
    const p = this.seats.position;
    return [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
  }

  claimAt(i, spec) {
    return this.seats.claim(i, {
      userId: spec.userId,
      username: spec.username || String(spec.userId),
      team: spec.team
    });
  }

  releaseAt(i) {
    if (this.seats.occupied[i] !== 2) return false;
    this.seats.release(i);
    return true;
  }

  /** A seat matters to persistence if it is claimed or flagged. */
  isDivergent(i) {
    const s = this.seats;
    return s.occupied[i] === 2 || (s.flags[i] & (F_RESERVED | F_MAINTENANCE | F_OBSTRUCTED)) !== 0;
  }

  /* ------------------------------------------------------------------
   * FAST PATHS
   * The difference between "how many empty VIP seats" costing 60,000
   * allocations and costing one array scan.
   * ---------------------------------------------------------------- */

  fastQuery(criteria) {
    const supported = new Set(['occupancy', 'occupied', 'vip', 'reserved', 'maintenance', 'obstructed', 'tier']);
    const keys = Object.keys(criteria);
    if (!keys.length || !keys.every(k => supported.has(k))) return null;

    const s = this.seats;
    const wantOcc = criteria.occupancy !== undefined ? OCCUPANCY.indexOf(criteria.occupancy) : -1;
    const tierIdx = criteria.tier !== undefined
      ? s.venue.tiers.findIndex(t => t.id === criteria.tier) : -1;
    if (criteria.occupancy !== undefined && wantOcc < 0) return [];
    if (criteria.tier !== undefined && tierIdx < 0) return [];

    const out = [];
    for (let i = 0; i < s.count; i++) {
      if (wantOcc >= 0 && s.occupied[i] !== wantOcc) continue;
      if (criteria.occupied !== undefined && (s.occupied[i] === 2) !== criteria.occupied) continue;
      if (criteria.vip !== undefined && !!(s.flags[i] & F_VIP) !== criteria.vip) continue;
      if (criteria.reserved !== undefined && !!(s.flags[i] & F_RESERVED) !== criteria.reserved) continue;
      if (criteria.maintenance !== undefined && !!(s.flags[i] & F_MAINTENANCE) !== criteria.maintenance) continue;
      if (criteria.obstructed !== undefined && !!(s.flags[i] & F_OBSTRUCTED) !== criteria.obstructed) continue;
      if (tierIdx >= 0 && s.tier[i] !== tierIdx) continue;
      out.push(i);
    }
    return out;
  }

  fastSummary(field) {
    const s = this.seats;
    const counts = Object.create(null);
    if (field === 'occupancy') {
      counts.empty = 0; counts.ai = 0; counts.user = 0;
      for (let i = 0; i < s.count; i++) counts[OCCUPANCY[s.occupied[i]]]++;
      return counts;
    }
    if (field === 'tier') {
      for (let i = 0; i < s.count; i++) {
        const id = s.venue.tiers[s.tier[i]].id;
        counts[id] = (counts[id] || 0) + 1;
      }
      return counts;
    }
    if (field === 'vip' || field === 'reserved' || field === 'maintenance') {
      const mask = field === 'vip' ? F_VIP : field === 'reserved' ? F_RESERVED : F_MAINTENANCE;
      counts.true = 0; counts.false = 0;
      for (let i = 0; i < s.count; i++) counts[(s.flags[i] & mask) ? 'true' : 'false']++;
      return counts;
    }
    return null;
  }
}

export default SeatCollection;
