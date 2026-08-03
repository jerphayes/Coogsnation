/**
 * smoke.mjs — executes the engine's real code path headlessly.
 *
 * Real three.js r160, real jsdom DOM, real venue/geometry/seat/crowd modules.
 * Only two things are stubbed, and only because they need a GPU:
 *   - WebGLRenderer  (replaced with a recording stub)
 *   - CanvasRenderingContext2D (replaced with a recording stub; jsdom has none)
 *
 * Everything else is the shipped code, running for the first time.
 */

import { JSDOM } from 'jsdom';

/* ── DOM ─────────────────────────────────────────────────────────────── */
const dom = new JSDOM(
  `<!DOCTYPE html><html><body>
     <canvas id="viewport"></canvas><div id="ui-root"></div>
     <div id="loader"><i id="loader-fill"></i><p id="loader-msg"></p></div>
   </body></html>`,
  { url: 'http://localhost/', pretendToBeVisual: true }
);

const ctx2d = () => {
  const noop = () => {};
  const c = new Proxy({}, {
    get(_, k) {
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop });
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'canvas') return { width: 1, height: 1 };
      return typeof k === 'string' ? noop : undefined;
    },
    set() { return true; }
  });
  return c;
};
dom.window.HTMLCanvasElement.prototype.getContext = function (type) {
  return type === '2d' ? ctx2d() : null;
};

globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.self = dom.window;
globalThis.location = dom.window.location;
globalThis.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.addEventListener = () => {};
globalThis.innerWidth = 1600; globalThis.innerHeight = 900; globalThis.devicePixelRatio = 1;
globalThis.fetch = async (url) => {
  const fs = await import('node:fs/promises');
  const path = String(url).startsWith('/')
    ? `client/public${url}`
    : String(url).replace(/^\.\//, '');
  try { return { ok: true, status: 200, json: async () => JSON.parse(await fs.readFile(path, 'utf8')) }; }
  catch (e) { return { ok: false, status: 404, json: async () => { throw e; } }; }
};

/* ── renderer stub ───────────────────────────────────────────────────── */
const rendererStub = {
  domElement: dom.window.document.getElementById('viewport'),
  capabilities: { getMaxAnisotropy: () => 16, isWebGL2: true },
  shadowMap: { enabled: false, type: 0 },
  info: { render: { calls: 0, triangles: 0 } },
  outputColorSpace: '', toneMapping: 0, toneMappingExposure: 1,
  setPixelRatio() {}, getPixelRatio() { return 1; }, setSize() {},
  setClearColor() {}, render() {}, dispose() {}
};

/* ── harness ─────────────────────────────────────────────────────────── */
const findings = [];
const step = async (label, fn) => {
  const t0 = performance.now();
  try {
    const r = await fn();
    const ms = (performance.now() - t0).toFixed(0);
    console.log(`  ok    ${label.padEnd(40)} ${ms.padStart(6)}ms`);
    return r;
  } catch (err) {
    console.log(`  FAIL  ${label}`);
    console.log(`        ${err.constructor.name}: ${err.message}`);
    const frame = (err.stack || '').split('\n').find(l => l.includes('/src/'));
    if (frame) console.log(`        ${frame.trim()}`);
    findings.push({ label, err });
    return null;
  }
};

console.log('\nEXECUTING THE ENGINE (real three.js r160, stubbed GPU)\n');

const THREE = await import('three');
const scene = new THREE.Scene();

const { loadVenue } = await import('../../client/src/venue-engine/venues/index.js');
const { EventBus, EVT } = await import('../../client/src/venue-engine/core/EventBus.js');
const bus = new EventBus();

for (const venueId of ['football', 'basketball', 'baseball', 'concert']) {
  console.log(`\n── venue: ${venueId} ──`);
  const venue = await step('loadVenue + validate', () => loadVenue(venueId));
  if (!venue) continue;

  const { createFootprint } = await import('../../client/src/venue-engine/stadium/FanFootprint.js');
  const footprint = await step('Footprint', () => createFootprint(venue.footprint));
  if (!footprint) continue;

  const VenueBuilder = (await import('../../client/src/venue-engine/stadium/VenueBuilder.js')).default;
  await step('VenueBuilder (all geometry + surface)',
    () => new VenueBuilder({ scene, footprint, venue, renderer: rendererStub }));

  const SeatManager = (await import('../../client/src/venue-engine/seats/SeatManager.js')).default;
  const seats = await step('SeatManager (manifest + instancing)',
    () => new SeatManager({ scene, bus, footprint, venue }));
  if (!seats) continue;
  console.log(`        → ${seats.count.toLocaleString()} seats, ${seats.sections.length} sections`);

  const CrowdManager = (await import('../../client/src/venue-engine/crowd/CrowdManager.js')).default;
  const crowd = await step('CrowdManager (shader + buffers)',
    () => new CrowdManager({ scene, bus, seats, renderer: rendererStub, venue }));

  const AvatarManager = (await import('../../client/src/venue-engine/avatars/AvatarManager.js')).default;
  const avatars = await step('AvatarManager',
    () => new AvatarManager({ scene, bus, seats, camera: new THREE.PerspectiveCamera(), assets: null }));

  const LightingManager = (await import('../../client/src/venue-engine/lighting/LightingManager.js')).default;
  await step('LightingManager (fixtures + presets)',
    () => new LightingManager({ scene, renderer: rendererStub, footprint, venue }));

  const ObjectRegistry = (await import('../../client/src/venue-engine/core/ObjectRegistry.js')).default;
  const registry = await step('ObjectRegistry', () => new ObjectRegistry({ bus }));

  const SeatCollection = (await import('../../client/src/venue-engine/objects/SeatCollection.js')).default;
  const CrowdCollection = (await import('../../client/src/venue-engine/objects/CrowdCollection.js')).default;
  const ParkingCollection = (await import('../../client/src/venue-engine/objects/ParkingCollection.js')).default;
  const { populateVenueObjects } = await import('../../client/src/venue-engine/objects/builtins.js');

  await step('register SeatCollection',
    () => registry.registerCollection(new SeatCollection({ seats, venueId: venue.id })));
  if (crowd) await step('register CrowdCollection',
    () => registry.registerCollection(new CrowdCollection({ crowd, seats, venueId: venue.id })));
  if (venue.structure?.parking) await step('register ParkingCollection',
    () => registry.registerCollection(new ParkingCollection({ venueId: venue.id, lots: venue.structure.parking.lots })));
  await step('populateVenueObjects', () => populateVenueObjects({ venue, seats, registry }));

  await step('registry.stats()', () => {
    const s = registry.stats();
    console.log(`        → ${JSON.stringify(s.byType)}`);
    return s;
  });

  const AIDirector = (await import('../../client/src/venue-engine/ai/AIDirector.js')).default;
  const installAdapters = (await import('../../client/src/venue-engine/ai/adapters.js')).default;
  const behaviors = (await import('../../client/src/venue-engine/ai/behaviors.js')).default;
  const director = await step('AIDirector + adapters + behaviours', () => {
    const d = new AIDirector({ bus, registry });
    installAdapters(d, { bus, registry, crowd, camera: null, lighting: null });
    behaviors.forEach(b => d.addBehavior(b));
    return d;
  });

  await step('director: 5 simulated seconds', () => {
    for (let f = 0; f < 300; f++) director.update(1 / 60, f / 60);
    return director.history(50).length;
  });

  if (avatars) {
    const TestAvatarController = (await import('../../client/src/venue-engine/avatars/TestAvatarController.js')).default;
    const test = await step('TestAvatarController',
      () => new TestAvatarController({ bus, seats, avatars }));
    if (test) await step('place 25 test avatars', () => {
      const placed = test.placeRandom(25);
      if (placed.length !== 25) throw new Error(`only ${placed.length}/25 placed`);
      return placed.length;
    });
  }

  await step('twin queries', () => {
    const census = registry.summary('seat', 'occupancy');
    const vip = registry.query({ type: 'seat', vip: true, occupancy: 'empty' }, { limit: 5 });
    console.log(`        → census ${JSON.stringify(census)}, vip sample ${vip.length}`);
    return true;
  });
}

console.log(`\n${'─'.repeat(60)}`);
console.log(findings.length ? `${findings.length} failure(s)` : 'no failures');
process.exit(findings.length ? 1 : 0);
