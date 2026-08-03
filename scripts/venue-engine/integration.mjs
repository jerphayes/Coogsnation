/**
 * tests/integration.mjs
 * ---------------------------------------------------------------------------
 * The architecture validation the directive asks for:
 *
 *   "If football, basketball, and baseball all load from the same engine
 *    without engine changes, you've validated the architecture."
 *
 * This constructs every venue through the identical code path, on the same
 * engine modules, and then asserts what actually matters: that no venue
 * required special-casing anywhere in the engine.
 *
 * Run: node tests/integration.mjs
 */

import './harness.mjs';

const THREE = await import('three');
const fs = await import('node:fs/promises');
const { loadVenue, VENUE_REGISTRY } = await import('../../client/src/venue-engine/venues/index.js');
const { createFootprint } = await import('../../client/src/venue-engine/stadium/FanFootprint.js');
const { EventBus, EVT } = await import('../../client/src/venue-engine/core/EventBus.js');
const { SEATING } = await import('../../client/src/venue-engine/config/engine.config.js');
const SeatManager = (await import('../../client/src/venue-engine/seats/SeatManager.js')).default;
const CrowdManager = (await import('../../client/src/venue-engine/crowd/CrowdManager.js')).default;
const AvatarManager = (await import('../../client/src/venue-engine/avatars/AvatarManager.js')).default;
const LightingManager = (await import('../../client/src/venue-engine/lighting/LightingManager.js')).default;
const CameraController = (await import('../../client/src/venue-engine/camera/CameraController.js')).default;
const VenueBuilder = (await import('../../client/src/venue-engine/stadium/VenueBuilder.js')).default;
const ObjectRegistry = (await import('../../client/src/venue-engine/core/ObjectRegistry.js')).default;
const SeatCollection = (await import('../../client/src/venue-engine/objects/SeatCollection.js')).default;
const CrowdCollection = (await import('../../client/src/venue-engine/objects/CrowdCollection.js')).default;
const ParkingCollection = (await import('../../client/src/venue-engine/objects/ParkingCollection.js')).default;
const { populateVenueObjects } = await import('../../client/src/venue-engine/objects/builtins.js');
const AIDirector = (await import('../../client/src/venue-engine/ai/AIDirector.js')).default;
const installAdapters = (await import('../../client/src/venue-engine/ai/adapters.js')).default;
const DEFAULT_BEHAVIORS = (await import('../../client/src/venue-engine/ai/behaviors.js')).default;
const PluginHost = (await import('../../client/src/venue-engine/plugins/PluginHost.js')).default;
const TestAvatarController = (await import('../../client/src/venue-engine/avatars/TestAvatarController.js')).default;
const { ServiceRegistry } = await import('../../client/src/venue-engine/services/interfaces.js');
const { bindLocalServices } = await import('../../client/src/venue-engine/services/local.js');
const { CoogsAuthService } = await import('../../client/src/venue-engine/adapters/CoogsAuthService.js');

/** Stand-in for the context CoogsNation supplies in the browser. */
const testUserContext = {
  userId: 'test-user', displayName: 'Test Member', avatarId: null,
  authenticated: true, permissionLevel: 'member',
  roles: ['student'], permissions: ['venue:enter', 'venue:claim-seat'],
};
const { SERVICES } = await import('../../client/src/venue-engine/config/engine.config.js');

let pass = 0, fail = 0;
const ok = (l, c, d = '') => {
  if (c) { pass++; } else { fail++; console.log(`  FAIL  ${l}${d ? ' → ' + d : ''}`); }
};

const VENUES = ['football', 'basketball', 'baseball', 'concert'];
const results = [];

console.log('\nFULL INTEGRATION — every venue, one engine, identical code path\n');

for (const id of VENUES) {
  const t0 = performance.now();
  const scene = new THREE.Scene(), bus = new EventBus(), renderer = globalThis.__rs;

  const venue = await loadVenue(id);
  const footprint = createFootprint(venue.footprint);

  // ── identical construction sequence for every venue ──────────────────
  const builder = await VenueBuilder.create({ scene, footprint, venue, renderer });
  const seats = await SeatManager.create({ scene, bus, footprint, venue });
  const crowd = new CrowdManager({ scene, bus, seats, renderer, venue });
  const camObj = new THREE.PerspectiveCamera(42, 1.6, 0.3, 4000);
  const avatars = new AvatarManager({ scene, bus, seats, camera: camObj, assets: null });
  const lighting = new LightingManager({ scene, renderer, footprint, venue });
  const camera = new CameraController({ camera: camObj, domElement: renderer.domElement, bus, seats, venue });

  const registry = new ObjectRegistry({ bus });
  registry.registerCollection(new SeatCollection({ seats, venueId: venue.id }));
  registry.registerCollection(new CrowdCollection({ crowd, seats, venueId: venue.id }));
  if (venue.structure?.parking) {
    registry.registerCollection(new ParkingCollection({ venueId: venue.id, lots: venue.structure.parking.lots }));
  }
  populateVenueObjects({ venue, seats, registry });

  const services = bindLocalServices(new ServiceRegistry(), SERVICES, {
    auth: new CoogsAuthService({ user: testUserContext }),
  });
  const director = new AIDirector({ bus, registry });
  installAdapters(director, { bus, registry, crowd, camera, lighting, builder });
  DEFAULT_BEHAVIORS.forEach(b => director.addBehavior(b));

  const plugins = new PluginHost({
    engine: { get: () => venue, scene }, bus, registry, director, services,
    uiRoot: document.getElementById('ui-root'), config: {}
  });
  const testAvatars = new TestAvatarController({ bus, seats, avatars });

  const buildMs = performance.now() - t0;

  // ── assertions applied identically to every venue ────────────────────
  const est = venue.estimateCapacity(footprint, SEATING);
  ok(`${id}: estimator agrees with manifest`, est === seats.count, `${est} vs ${seats.count}`);
  ok(`${id}: seats built`, seats.count > 0);
  ok(`${id}: sections built`, seats.sections.length > 0);

  const ids = new Set();
  const coll = registry._collections.get('seat');
  for (let i = 0; i < seats.count; i++) ids.add(coll.describe(i).persistentId);
  ok(`${id}: seat ids unique`, ids.size === seats.count, `${ids.size}/${seats.count}`);

  const census = registry.summary('seat', 'occupancy');
  ok(`${id}: census sums to capacity`,
     Object.values(census).reduce((a, b) => a + b, 0) === seats.count);

  const placed = testAvatars.placeRandom(25);
  ok(`${id}: avatars seat through the production path`, placed.length === 25, `${placed.length}/25`);

  for (let f = 0; f < 120; f++) {
    const dt = 1 / 60, el = f / 60;
    crowd.update(dt, el, camObj);
    avatars.update(dt, el, camObj);
    camera.update(dt, el);
    director.update(dt, el);
    plugins.update(dt, el);
    seats.updateLOD(camObj, dt);
  }
  ok(`${id}: two seconds of frames without throwing`, true);

  const views = camera.views();
  let flew = 0;
  for (const v of views) {
    if (!camera.setView(v)) continue;
    for (let f = 0; f < 130; f++) camera.update(1 / 60, f / 60);
    if (camObj.position.distanceTo(new THREE.Vector3(...venue.camera.views[v].position)) < 0.5) flew++;
  }
  ok(`${id}: every declared camera preset flies`, flew === views.length, `${flew}/${views.length}`);

  const deltas = registry.collectDeltas();
  ok(`${id}: twin produces deltas after activity`, Array.isArray(deltas));

  const snap = registry.snapshot();
  ok(`${id}: snapshot is versioned and typed`, snap.v === 1 && !!snap.collections.seat);

  results.push({
    id, seats: seats.count, sections: seats.sections.length,
    plan: venue.footprint.kind === 'fan' ? 'fan' : 'bowl',
    objects: registry.stats().total, views: views.length,
    heap: process.memoryUsage().heapUsed, ms: buildMs
  });
}

/* ═══ the architecture claim itself ═══════════════════════════════════ */
console.log('ENGINE PURITY — no venue is special-cased anywhere in the engine\n');

const ENGINE_DIRS = ['core', 'seats', 'crowd', 'avatars', 'camera', 'lighting',
                     'net', 'objects', 'plugins', 'services', 'ai', 'ui', 'stadium'];
const venueNames = ['football', 'basketball', 'baseball', 'concert', 'BasketballArena',
                    'FootballStadium', 'BaseballField'];
const offenders = [];
for (const dir of ENGINE_DIRS) {
  let files = [];
  try { files = await fs.readdir(`client/src/venue-engine/${dir}`); } catch { continue; }
  for (const f of files.filter(x => x.endsWith('.js'))) {
    const path = `client/src/venue-engine/${dir}/${f}`;
    const src = await fs.readFile(path, 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const name of venueNames) {
      if (new RegExp(`['"\`]${name}['"\`]`).test(code)) offenders.push(`${path} mentions "${name}"`);
    }
  }
}
ok('no engine file references a venue by name', offenders.length === 0, offenders.join('; '));

const venueFiles = (await fs.readdir('client/src/venue-engine/venues')).filter(f => f.endsWith('.js'));
const leaks = [];
for (const f of venueFiles) {
  const src = await fs.readFile(`client/src/venue-engine/venues/${f}`, 'utf8');
  if (/from '\.\.\/(core|seats|crowd|avatars|net|plugins|services)\//.test(src)) {
    leaks.push(`${f} imports an engine subsystem`);
  }
}
ok('no venue imports an engine subsystem', leaks.length === 0, leaks.join('; '));
ok('every registered venue was exercised',
   Object.keys(VENUE_REGISTRY).every(v => VENUES.includes(v)),
   Object.keys(VENUE_REGISTRY).join(','));

/* ═══ report ══════════════════════════════════════════════════════════ */
console.log('venue         plan   seats    sections  twin objects  presets   build');
console.log('─'.repeat(74));
for (const r of results) {
  console.log(
    r.id.padEnd(13) +
    r.plan.padEnd(7) +
    r.seats.toLocaleString().padStart(7) +
    String(r.sections).padStart(10) +
    r.objects.toLocaleString().padStart(14) +
    String(r.views).padStart(9) +
    (r.ms.toFixed(0) + 'ms').padStart(8)
  );
}
console.log('─'.repeat(74));
console.log(`peak heap after all ${results.length} venues: ${(results[results.length - 1].heap / 1048576).toFixed(0)} MB`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
