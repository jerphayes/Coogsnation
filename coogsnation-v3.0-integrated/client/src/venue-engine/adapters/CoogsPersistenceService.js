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

  /** @param {string} venueId @param {object} record */
  async saveSeatClaim(venueId, record) {
    if (!record?.pid) return;          // nothing identifiable to persist
    try {
      await this._request(VENUE_API.claim, {
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
    } catch (error) {
      // Degrade, do not crash. The seat remains claimed in the live venue.
      this.onError('venue:error', {
        scope: 'persistence.claim', message: error.message, fatal: false,
      });
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
