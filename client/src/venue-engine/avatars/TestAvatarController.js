/**
 * TestAvatarController
 * ---------------------------------------------------------------------------
 * Places named avatars into chosen seats without a server, and holds several
 * at once. This is the vertical slice's answer to requirements 5 and 6.
 *
 * It goes through exactly the same AvatarManager API that the network path
 * uses — `add()` / `remove()` — so anything that works here works for a real
 * user. Nothing about test avatars is special-cased downstream. If a test
 * avatar renders, seats correctly and hides the AI spectator beneath it, so
 * will a networked one.
 *
 * Synthetic ids start at AVATARS.testIdBase so they can never collide with
 * server-issued ones.
 */

import { AVATARS } from '../config/engine.config.js';
import { EVT } from '../core/EventBus.js';

const HANDLES = [
  'Ash', 'Rook', 'Vale', 'Quinn', 'Iris', 'Kade', 'Wren', 'Sol', 'Nova', 'Bex',
  'Juno', 'Rhys', 'Mira', 'Otto', 'Sage', 'Talon', 'Vega', 'Pike', 'Lux', 'Fen'
];

export class TestAvatarController {
  /** @param {{bus, seats, avatars}} ctx */
  constructor(ctx) {
    this.bus = ctx.bus;
    this.seats = ctx.seats;
    this.avatars = ctx.avatars;
    this._nextId = AVATARS.testIdBase;
    /** @type {Set<number>} ids this controller created */
    this.owned = new Set();
  }

  /* ------------------------------------------------------------------ */

  /**
   * Seat a named avatar.
   * @param {{seatIndex:number, username?:string, team?:'home'|'away'|'neutral'}} spec
   * @returns {number|null} the synthetic userId, or null if the seat was taken
   */
  place({ seatIndex, username, team }) {
    if (seatIndex == null || seatIndex < 0 || seatIndex >= this.seats.count) return null;
    const existing = this.avatars.getBySeat(seatIndex);
    if (existing) {
      this.bus.emit(EVT.UI_NOTICE, {
        text: `Seat already held by ${existing.username}`, level: 'warn'
      });
      return null;
    }

    const userId = this._nextId++;
    const ok = this.avatars.add({
      userId,
      username: username?.trim() || this.suggestName(),
      team: team || (Math.random() < 0.6 ? 'home' : 'away'),
      seatIndex
    });
    if (!ok) return null;

    this.owned.add(userId);
    return userId;
  }

  /** Scatter n avatars into random free seats. Useful for load-testing labels. */
  placeRandom(n = 5, tierId = null) {
    const placed = [];
    for (let i = 0; i < n; i++) {
      const seatIndex = this._randomFreeSeat(tierId);
      if (seatIndex < 0) break;
      const id = this.place({ seatIndex });
      if (id != null) placed.push(id);
    }
    return placed;
  }

  /** Move one of ours to a different seat, preserving name and team. */
  relocate(userId, seatIndex) {
    if (!this.owned.has(userId)) return false;
    return this.avatars.move(userId, seatIndex);
  }

  remove(userId) {
    if (!this.owned.has(userId)) return false;
    this.avatars.remove(userId);
    this.owned.delete(userId);
    return true;
  }

  /** Remove only the avatars this controller created — leaves networked ones. */
  clear() {
    for (const id of [...this.owned]) this.remove(id);
  }

  /** @returns {Array<{userId, username, team, seatIndex, seat}>} */
  list() {
    return [...this.owned].map(id => {
      const rec = this.avatars.getByUser(id);
      if (!rec) return null;
      return { ...rec, seat: this.seats.getSeat(rec.seatIndex) };
    }).filter(Boolean);
  }

  suggestName() {
    const h = HANDLES[(Math.random() * HANDLES.length) | 0];
    return `${h}${(Math.random() * 900 + 10) | 0}`;
  }

  /* ------------------------------------------------------------------ */

  _randomFreeSeat(tierId) {
    const s = this.seats;
    for (let attempt = 0; attempt < 60; attempt++) {
      const i = (Math.random() * s.count) | 0;
      if (s.occupied[i] === 2) continue;
      if (tierId && s.venue.tiers[s.tier[i]].id !== tierId) continue;
      return i;
    }
    return s.findAvailable(tierId);
  }
}

export default TestAvatarController;
