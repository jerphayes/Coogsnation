/**
 * Event Bridge regression check.
 *
 * Asserts the property the directive actually cares about: internal engine
 * traffic must NOT cross into the application. A bridge that forwards
 * everything would pass a "does it work" test and fail the requirement.
 */
import './harness.mjs';

const { EventBus, EVT } = await import('../../client/src/venue-engine/core/EventBus.js');
const { createEventBridge } = await import('../../client/src/venue-engine/bridge/eventBridge.js');

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) pass++; else { fail++; console.log(`  FAIL  ${label}${detail ? ' → ' + detail : ''}`); }
};

const bus = new EventBus();
const seen = [];
const stubCollection = {
  describe: (i) => ({
    persistentId: `seat:basketball:lower:112:1:${i}`,
    metadata: { section: '112', row: 1, number: i },
  }),
};
const bridge = createEventBridge({
  bus, venueId: 'basketball', userId: 'u1',
  seats: {}, registry: { _collections: new Map([['seat', stubCollection]]) },
});
bridge.onAny((e) => seen.push(e.name));

/* ── internal traffic must NOT cross ─────────────────────────────────── */
bus.emit(EVT.ENGINE_TICK, { dt: 0.016, elapsed: 1 });
bus.emit(EVT.ENGINE_TICK, { dt: 0.016, elapsed: 2 });
bus.emit(EVT.CAMERA_MODE, { mode: 'orbit' });
bus.emit(EVT.SEAT_HOVER, { seatIndex: 5 });
bus.emit(EVT.CROWD_REACTION, { type: 'wave' });
bus.emit(EVT.LOAD_PROGRESS, { fraction: 0.5, message: 'x' });
ok('frame ticks do not cross the bridge', seen.length === 0, seen.join(','));

/* ── application events MUST cross ───────────────────────────────────── */
bus.emit(EVT.SEAT_CLAIMED, { seatIndex: 7, userId: 'u1', username: 'Member' });
ok('seat claim crosses', seen.includes('venue:seat-claimed'));
const claim = seen.length;

bus.emit(EVT.SEAT_RELEASED, { seatIndex: 7, userId: 'u1' });
ok('seat release crosses', seen.includes('venue:seat-released'));

bus.emit(EVT.AVATAR_ADDED, { userId: 'u2', username: 'Other', seatIndex: 9 });
ok('avatar entry crosses', seen.includes('venue:avatar-entered'));

bus.emit(EVT.AVATAR_REMOVED, { userId: 'u2' });
ok('avatar exit crosses', seen.includes('venue:avatar-exited'));

/* ── director: only significant directives ───────────────────────────── */
const before = seen.length;
bus.emit(EVT.DIRECTOR_DIRECTIVE, { channel: 'crowd', action: 'react', priority: 10 });
ok('ambient director traffic is suppressed', seen.length === before);
bus.emit(EVT.DIRECTOR_DIRECTIVE, { channel: 'scoreboard', action: 'message', priority: 50, reason: 'timeout' });
ok('event-priority directives cross', seen.includes('venue:director-notification'));

/* ── payload shape: persistent id, not an engine index alone ─────────── */
let captured = null;
bridge.on('venue:seat-claimed', (e) => { captured = e; });
bus.emit(EVT.SEAT_CLAIMED, { seatIndex: 42, userId: 'u1', username: 'Member' });
ok('payload carries a persistent seat id',
   captured?.payload?.seatPersistentId === 'seat:basketball:lower:112:1:42');
ok('event carries venue and user identity',
   captured?.venueId === 'basketball' && captured?.userId === 'u1');

/* ── application → engine direction ──────────────────────────────────── */
let entered = null;
bridge.on('venue:entered', (e) => { entered = e; });
bridge.emit('venue:entered', { venueId: 'basketball', capacity: 10630, sections: 78 });
ok('application can publish into the bridge', entered?.payload?.capacity === 10630);

/* ── teardown ────────────────────────────────────────────────────────── */
bridge.dispose();
const afterDispose = seen.length;
bus.emit(EVT.SEAT_CLAIMED, { seatIndex: 1, userId: 'u1', username: 'x' });
ok('dispose unsubscribes from the engine bus', seen.length === afterDispose);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
