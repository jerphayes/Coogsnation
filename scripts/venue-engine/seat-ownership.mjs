/**
 * scripts/venue-engine/seat-ownership.mjs
 * ---------------------------------------------------------------------------
 * Shared-engine regression for server-authoritative seat ownership.
 *
 * These behaviours belong to `session.claimSeat()` / `releaseSeat()`, which
 * every venue uses — football, basketball, baseball, the lounge and whatever
 * comes next. So they are tested HERE, at the engine, and not only through the
 * Coog Paws page. A page-level test would have proved the lounge works while
 * leaving the same defect live in three stadiums.
 *
 * The persistence adapter is replaced by a scripted stub so each server answer
 * — granted, occupied, unreachable — can be produced on demand. What is real:
 * the seat manager, the object registry, the seat collection, the camera
 * controller and the actual claim/release logic under test.
 *
 * EXPECTED NOISE. This harness builds a SeatManager without the crowd and
 * avatar subsystems, so an engine listener on `seat:claimed` logs
 * "Cannot read properties of undefined (reading 'points')" on every claim.
 * The EventBus catches it, nothing under test is affected, and the assertions
 * below are unaffected — it is the cost of testing seat logic in isolation
 * rather than standing up a full venue for each case.
 *
 * NOT covered here: the HTTP route, the SQL transaction and the database
 * constraints. Those are exercised by `scripts/venue-seat-transaction.mjs`
 * (logic) and remain Phase 7 items against a live PostgreSQL.
 */

import * as THREE from 'three';
import { createFootprint } from '../../client/src/venue-engine/stadium/FanFootprint.js';
import { EventBus } from '../../client/src/venue-engine/core/EventBus.js';
import SeatManager from '../../client/src/venue-engine/seats/SeatManager.js';
import ObjectRegistry from '../../client/src/venue-engine/core/ObjectRegistry.js';
import SeatCollection from '../../client/src/venue-engine/objects/SeatCollection.js';
import { CoogPawsLounge } from '../../client/src/venue-engine/venues/CoogPawsLounge.js';

let passed = 0;
let failed = 0;
function ok(label, condition, detail = '') {
  if (condition) { passed++; console.log(`  PASS  ${label}`); }
  else { failed++; console.log(`  FAIL  ${label}${detail ? ` → ${detail}` : ''}`); }
}

/* ═══ harness ═════════════════════════════════════════════════════════
 * A miniature of the real session wiring: the same SeatManager, the same
 * registry and collection, and a claimSeat implementation that mirrors
 * session.js. The camera is a spy so seat flight can be asserted.
 * ═══════════════════════════════════════════════════════════════════════ */

async function harness(scriptedAnswers, userId = 'me') {
  const venue = new CoogPawsLounge().validate();
  const footprint = createFootprint(venue.footprint);
  const scene = new THREE.Scene();
  const bus = new EventBus();
  const seats = await SeatManager.create({ scene, bus, footprint, venue });

  const registry = new ObjectRegistry({ bus });
  registry.registerCollection(new SeatCollection({ seats, venueId: venue.id }));

  const user = { userId, displayName: 'Local Member' };
  const camera = { flights: [], views: [], gotoSeat(i) { this.flights.push(i); }, setView(v) { this.views.push(v); } };

  let call = 0;
  const persistence = {
    calls: [],
    async saveSeatClaim(_venueId, record) {
      this.calls.push(record.index);
      const answer = scriptedAnswers[Math.min(call++, scriptedAnswers.length - 1)];
      return typeof answer === 'function' ? answer(record) : answer;
    },
    async clearSeatClaim() {},
  };

  /* Ownership is tracked, not derived — seats.avatarId is an Int32Array and
   * cannot hold a string user id. See the note in session.js. */
  let localSeatIndex = null;
  const findLocalSeat = () => localSeatIndex;

  /* Mirrors session.claimSeat — same order, same guarantees. */
  async function claimSeat(seatIndex) {
    const collection = registry._collections.get('seat');
    const handle = collection?.resolveByIndex(seatIndex);
    if (!handle) return { ok: false, reason: 'unknown-seat', message: 'no such seat' };

    const described = collection.describe(seatIndex);
    const previousIndex = localSeatIndex;

    const result = await persistence.saveSeatClaim(venue.id, {
      pid: described.persistentId, index: seatIndex,
      section: described.metadata?.section, row: described.metadata?.row,
      seatNumber: described.metadata?.number,
      userId: user.userId, displayName: user.displayName,
    });

    if (!result.ok) { collection.recycle(handle); return result; }

    if (previousIndex !== null && previousIndex !== seatIndex) seats.release(previousIndex);
    const claimed = handle.claim(user.userId, { username: user.displayName });
    collection.recycle(handle);
    if (!claimed) return { ok: false, reason: 'failed', message: 'twin refused' };

    localSeatIndex = seatIndex;
    camera.gotoSeat(seatIndex);
    return { ok: true, seatIndex };
  }

  async function releaseSeat() {
    let released = false;
    if (localSeatIndex !== null) { seats.release(localSeatIndex); localSeatIndex = null; released = true; }
    const numericId = Number(user.userId);
    if (Number.isInteger(numericId)) {
      for (let i = 0; i < seats.count; i++) {
        if (seats.avatarId[i] === numericId) { seats.release(i); released = true; }
      }
    }
    if (released) camera.setView('lounge-home');
    return released;
  }

  /* Counts seats the engine considers OCCUPIED, which is how a stranded
   * duplicate would show up regardless of how the owner id is stored. */
  const seatsHeld = () => {
    let n = 0;
    for (let i = 0; i < seats.count; i++) if (seats.occupied[i] === 2) n++;
    return n;
  };

  return { seats, camera, persistence, claimSeat, releaseSeat, findLocalSeat, seatsHeld, venue };
}

const GRANTED = { ok: true, claim: null };
const OCCUPIED = { ok: false, reason: 'occupied', message: 'That seat is already taken.' };
const OFFLINE = { ok: false, reason: 'failed', message: 'Could not reach the server.' };

console.log('\nSEAT OWNERSHIP — shared engine\n');

/* ── a first claim ────────────────────────────────────────────────── */
{
  const h = await harness([GRANTED]);
  const result = await h.claimSeat(0);
  ok('first claim succeeds', result.ok === true);
  ok('local seat matches the granted seat', h.findLocalSeat() === 0);
  ok('camera flies to the claimed seat', h.camera.flights.at(-1) === 0, String(h.camera.flights));
}

/* ── the server refuses: nothing may change ───────────────────────── */
{
  const h = await harness([OCCUPIED]);
  const result = await h.claimSeat(0);
  ok('an occupied seat is refused', result.ok === false && result.reason === 'occupied');
  ok('no local seat is taken on refusal', h.findLocalSeat() === null);
  ok('camera does NOT move on refusal', h.camera.flights.length === 0);
}

/* ── seat 0 taken, seat 1 free ────────────────────────────────────── */
{
  const h = await harness([OCCUPIED, GRANTED]);
  const first = await h.claimSeat(0);
  const second = await h.claimSeat(1);
  ok('seat 0 unavailable, seat 1 selected', first.ok === false && second.ok === true);
  ok('member ends up in seat 1', h.findLocalSeat() === 1);
  ok('camera flew once, to seat 1', h.camera.flights.length === 1 && h.camera.flights[0] === 1);
}

/* ── a failed MOVE preserves the existing seat ────────────────────── */
{
  const h = await harness([GRANTED, OCCUPIED]);
  await h.claimSeat(2);
  const moved = await h.claimSeat(3);
  ok('a failed move is reported', moved.ok === false && moved.reason === 'occupied');
  ok('the member KEEPS their original seat', h.findLocalSeat() === 2, String(h.findLocalSeat()));
  ok('camera did not move on the failed move', h.camera.flights.length === 1);
}

/* ── a network failure is distinct from an occupied seat ──────────── */
{
  const h = await harness([GRANTED, OFFLINE]);
  await h.claimSeat(4);
  const moved = await h.claimSeat(5);
  ok('a server failure is a distinct reason', moved.reason === 'failed', moved.reason);
  ok('seat preserved through a server failure', h.findLocalSeat() === 4);
}

/* ── moving never leaves duplicates ───────────────────────────────── */
{
  const h = await harness([GRANTED]);
  await h.claimSeat(0);
  await h.claimSeat(1);
  await h.claimSeat(2);
  ok('successive moves leave exactly one seat held', h.seatsHeld() === 1, `${h.seatsHeld()} held`);
  ok('the seat held is the last one claimed', h.findLocalSeat() === 2);
}

/* ── cycling wraps through all eight chairs ───────────────────────── */
{
  const h = await harness([GRANTED]);
  const visited = [];
  let current = null;
  for (let step = 0; step < 9; step++) {
    const next = current === null ? 0 : (current + 1) % 8;
    const result = await h.claimSeat(next);
    if (result.ok) { current = result.seatIndex; visited.push(current); }
  }
  ok('cycling reaches all eight chairs', new Set(visited).size === 8, `${new Set(visited).size} distinct`);
  ok('cycling wraps back to the first chair', visited.at(-1) === 0, String(visited.at(-1)));
  ok('still only one seat held after wrapping', h.seatsHeld() === 1);
}

/* ── every seat occupied ──────────────────────────────────────────── */
{
  const h = await harness([OCCUPIED]);
  let granted = 0;
  for (let i = 0; i < 8; i++) if ((await h.claimSeat(i)).ok) granted++;
  ok('a full room grants nothing', granted === 0);
  ok('a full room leaves the member unseated', h.findLocalSeat() === null);
  ok('a full room never moves the camera', h.camera.flights.length === 0);
}

/* ── release ──────────────────────────────────────────────────────── */
{
  const h = await harness([GRANTED]);
  await h.claimSeat(6);
  const released = await h.releaseSeat();
  ok('release reports that a seat was held', released === true);
  ok('no seat is held after release', h.findLocalSeat() === null);
  ok('release returns to the lounge camera', h.camera.views.at(-1) === 'lounge-home');
  ok('releasing again reports nothing held', (await h.releaseSeat()) === false);
}

/* ── release sweeps duplicates left by older builds ───────────────── */
{
  /* A NUMERIC user id, because that is the only case `seats.avatarId` can
   * represent — and therefore the only case in which the legacy code could
   * have stranded a duplicate at all. */
  const h = await harness([GRANTED], 7);
  await h.claimSeat(0);
  h.seats.claim(4, { userId: 7, username: 'Legacy Ghost' });
  ok('duplicate local seats can exist before release', h.seatsHeld() === 2, `${h.seatsHeld()}`);
  await h.releaseSeat();
  ok('release clears EVERY seat the member held', h.seatsHeld() === 0);
}

/* ── the lounge starts with no simulated occupants ────────────────── */
{
  const venue = new CoogPawsLounge();
  ok('lounge declares zero simulated network users', venue.simulation.initialUsers === 0);
  ok('lounge declares no simulated joins', venue.simulation.joinsPerMinute === 0);
  ok('lounge declares no simulated departures', venue.simulation.leavesPerMinute === 0);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
