/**
 * CoogsPersistenceService
 * ---------------------------------------------------------------------------
 * The engine's PersistenceService contract, satisfied by the CoogsNation API.
 *
 * THE ENGINE NEVER TOUCHES THE DATABASE. Every persistent read and write in
 * this file is an HTTP call to the venue API, which validates, authorizes and
 * then goes through IStorage. The engine holds runtime seat state only.
 *
 * Replaces `LocalStoragePersistenceService`, which is deleted.
 *
 * FAILURE POLICY
 * --------------
 * Persistence failures must never take the venue down — per the fault
 * tolerance directive, a subsystem failure degrades gracefully. A failed save
 * is logged and reported through the bridge; the seat stays claimed in the
 * running venue and the user keeps playing. The authoritative record simply
 * did not update, and the next load will reflect that.
 */

import { PersistenceService } from '../services/interfaces.js';
import { VENUE_API } from '@shared/venue';

export class CoogsPersistenceService extends PersistenceService {
  /**
   * @param {object} ctx
   * @param {string} ctx.venueId
   * @param {(name: string, payload: object) => void} [ctx.onError] bridge hook
   * @param {typeof fetch} [ctx.fetchImpl] injectable for tests
   */
  constructor(ctx = {}) {
    super();
    this.venueId = ctx.venueId;
    this.onError = ctx.onError || (() => {});
    this._fetch = ctx.fetchImpl || globalThis.fetch.bind(globalThis);
  }

  async _request(url, options = {}) {
    const response = await this._fetch(url, {
      credentials: 'same-origin',      // the session cookie authenticates
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!response.ok) {
      const error = new Error(`venue API ${options.method || 'GET'} ${url} → ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }

  /**
   * Existing claims for the venue, so the engine can restore ownership on
   * load. A failure here yields an empty list rather than a broken venue:
   * an unpopulated bowl is a far better outcome than no venue at all.
   */
  async loadSeatOwnership(venueId) {
    try {
      const data = await this._request(VENUE_API.claims(venueId || this.venueId));
      return (data?.claims || []).map((claim) => ({
        seatIndex: claim.seatIndex,
        seatPersistentId: claim.seatPersistentId,
        userId: claim.userId,
        username: claim.displayName,
        team: 'home',
      }));
    } catch (error) {
      this.onError('venue:error', {
        scope: 'persistence.load', message: error.message, fatal: false,
      });
      return [];
    }
  }

  /**
   * Persist a seat claim and REPORT THE OUTCOME.
   *
   * This used to swallow every failure and return undefined, on the reasoning
   * that a venue should degrade rather than crash. That is right for a network
   * blip and wrong for a 409: a rejected claim means somebody else owns the
   * seat, and silently keeping the local claim told two members they were
   * sitting in the same chair. Seat ownership is server-authoritative, so the
   * caller has to be able to tell these three cases apart.
   *
   * @returns {Promise<{ok:true, claim:object}|{ok:false, reason:'occupied'|'unauthorized'|'failed', message:string}>}
   */
  async saveSeatClaim(venueId, record) {
    if (!record?.pid) {
      return { ok: false, reason: 'failed', message: 'seat has no persistent id' };
    }
    try {
      const data = await this._request(VENUE_API.claim, {
        method: 'POST',
        body: JSON.stringify({
          venueId: venueId || this.venueId,
          seatPersistentId: record.pid,
          seatIndex: record.index ?? record.seatIndex ?? 0,
          section: String(record.section ?? ''),
          row: Number(record.row ?? 1),
          seatNumber: Number(record.seatNumber ?? 1),
        }),
      });
      return { ok: true, claim: data?.claim ?? null };
    } catch (error) {
      /* 409 is not a malfunction — it is the answer. Distinguish it from a
       * genuine failure so the interface can say "that chair is taken"
       * rather than "something went wrong". */
      if (error.status === 409) {
        return { ok: false, reason: 'occupied', message: 'That seat is already taken.' };
      }
      if (error.status === 401 || error.status === 403) {
        return { ok: false, reason: 'unauthorized', message: 'You are not able to claim a seat here.' };
      }
      this.onError('venue:error', {
        scope: 'persistence.claim', message: error.message, fatal: false,
      });
      return { ok: false, reason: 'failed', message: 'Could not reach the server. Your seat was not changed.' };
    }
  }

  async clearSeatClaim(venueId, seatPersistentId) {
    if (!seatPersistentId) return;
    try {
      await this._request(VENUE_API.release, {
        method: 'POST',
        body: JSON.stringify({
          venueId: venueId || this.venueId,
          seatPersistentId: String(seatPersistentId),
        }),
      });
    } catch (error) {
      this.onError('venue:error', {
        scope: 'persistence.release', message: error.message, fatal: false,
      });
    }
  }

  /**
   * Profiles belong to CoogsNation and are already loaded by the application
   * before the engine boots. The engine has no business fetching them, so
   * these are inert rather than wired to an endpoint.
   */
  async loadProfile() { return null; }
  async saveProfile() { /* the application owns profiles */ }
}

export default CoogsPersistenceService;
