/**
 * main.js — composition root
 * ---------------------------------------------------------------------------
 * The only file that knows the full module set. Everything else talks through
 * the EventBus or through an injected dependency, which is what keeps the
 * seams real rather than aspirational.
 *
 * Assembly order:
 *    1. venue        the definition; validated before anything reads it
 *    2. engine       renderer, scene, frame loop, module registry
 *    3. services     auth / chat / voice / persistence / crowd AI contracts
 *    4. assets       optional GLB + Draco + KTX2; procedural fallback
 *    5. footprint    plan geometry every builder measures against
 *    6. venueBuilder structure and playing surface
 *    7. seats        manifest + per-section instanced chunks
 *    8. crowd        AI spectators bound to the same chunks
 *    9. avatars      real users
 *   10. lighting     fixtures declared by the venue
 *   11. camera       modes, framed by the venue
 *   12. net          transport + presence
 *   13. registry     the digital twin — seats as a virtual collection
 *   14. director     orchestration; issues directives, adapters translate
 *   15. plugins      capability-scoped extension host
 *   16. testAvatars  manual placement
 *   17. ui           DOM overlay; owns nothing, observes everything
 *
 * Layering, restated because it is the thing worth protecting:
 *   the renderer draws, the engine manages, the director orchestrates,
 *   and applications consume. Nothing application-specific belongs above.
 */

import engineConfig, { SERVICES } from './config/engine.config.js';
import { EVT } from './core/EventBus.js';
import VenueEngine from './core/VenueEngine.js';
import AssetLoader from './core/AssetLoader.js';
import { createFootprint } from './stadium/FanFootprint.js';
import VenueBuilder from './stadium/VenueBuilder.js';
import SeatManager from './seats/SeatManager.js';
import CrowdManager from './crowd/CrowdManager.js';
import AvatarManager from './avatars/AvatarManager.js';
import TestAvatarController from './avatars/TestAvatarController.js';
import LightingManager from './lighting/LightingManager.js';
import CameraController from './camera/CameraController.js';
import NetworkManager from './net/NetworkManager.js';
import { createTransport } from './net/transports.js';
import UIManager from './ui/UIManager.js';
import ObjectRegistry from './core/ObjectRegistry.js';
import { populateVenueObjects, AvatarObject } from './objects/builtins.js';
import SeatCollection from './objects/SeatCollection.js';
import CrowdCollection from './objects/CrowdCollection.js';
import ParkingCollection from './objects/ParkingCollection.js';
import AIDirector from './ai/AIDirector.js';
import installDefaultAdapters from './ai/adapters.js';
import DEFAULT_BEHAVIORS from './ai/behaviors.js';
import PluginHost from './plugins/PluginHost.js';
import { PollingPlugin, AnalyticsPlugin } from './plugins/examples.js';
import { ServiceRegistry } from './services/interfaces.js';
import { bindLocalServices } from './services/local.js';
import { loadVenue, venueIdFromLocation } from './venues/index.js';

const loaderEl = document.getElementById('loader');
const fillEl = document.getElementById('loader-fill');
const msgEl = document.getElementById('loader-msg');

/** Advance the progress bar and yield so the browser can paint between phases. */
const step = (fraction, message) => {
  fillEl.style.width = `${Math.round(fraction * 100)}%`;
  msgEl.textContent = message;
  return new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
};

async function boot() {
  /* 1 — venue ------------------------------------------------------------ */
  await step(0.04, 'Reading venue definition');
  const venue = await loadVenue(venueIdFromLocation());
  document.title = `${venue.label} — Virtual Venue`;

  /* 2 — engine ----------------------------------------------------------- */
  const engine = new VenueEngine({ canvas: document.getElementById('viewport') });
  const { bus, scene, renderer, cameraObject } = engine;
  bus.on(EVT.LOAD_PROGRESS, ({ fraction, message }) => step(fraction, message));

  /* 3 — services --------------------------------------------------------- */
  await step(0.08, 'Binding services');
  const services = engine.register('services', bindLocalServices(new ServiceRegistry(), SERVICES));
  const session = await services.get('auth').resolve();

  /* 4 — assets ----------------------------------------------------------- */
  await step(0.14, 'Loading assets');
  const assets = engine.register('assets', new AssetLoader({ renderer, bus }));
  await assets.loadManifest();
  await assets.loadEnvironment(scene);

  /* 5 — footprint -------------------------------------------------------- */
  await step(0.2, 'Surveying the site');
  const footprint = engine.register('footprint', createFootprint(venue.footprint));
  engine.register('venue', venue);

  /* 6 — structure -------------------------------------------------------- */
  /* Construction is CHUNKED, not synchronous. Built as straight loops these
   * two phases block the main thread for ~0.9s on desktop and several seconds
   * on a phone — during which the loader cannot even repaint the bar that is
   * reporting progress. See core/scheduler.js. */
  engine.register('builder', await VenueBuilder.create(
    { scene, footprint, venue, renderer },
    (f, label) => step(0.3 + f * 0.2, `Building ${label}`)
  ));

  /* 7 — seats ------------------------------------------------------------ */
  const seats = engine.register('seats', await SeatManager.create(
    { scene, bus, footprint, venue },
    (f, label) => step(0.5 + f * 0.18, `Setting ${label}`)
  ));

  /* 8 — crowd ------------------------------------------------------------ */
  await step(0.68, 'Filling the house');
  engine.register('crowd', new CrowdManager({ scene, bus, seats, renderer, venue }));

  /* 9 — avatars ---------------------------------------------------------- */
  await step(0.78, 'Preparing avatars');
  const avatars = engine.register('avatars', new AvatarManager({
    scene, bus, seats, camera: cameraObject, assets
  }));

  /* 10 — lighting -------------------------------------------------------- */
  await step(0.85, 'Striking the lights');
  engine.register('lighting', new LightingManager({ scene, renderer, footprint, venue }));

  /* 11 — camera ---------------------------------------------------------- */
  await step(0.9, 'Rigging cameras');
  const camera = engine.register('camera', new CameraController({
    camera: cameraObject, domElement: renderer.domElement, bus, seats, venue
  }));
  camera.setMode('orbit', { autoRotate: true });

  /* 12 — network --------------------------------------------------------- */
  await step(0.94, 'Connecting');
  const transport = createTransport({
    seatCount: seats.count,
    pickSeat: () => {
      for (let attempt = 0; attempt < 30; attempt++) {
        const i = (Math.random() * seats.count) | 0;
        if (seats.occupied[i] !== 2) return i;
      }
      return seats.findAvailable();
    }
  });
  const net = engine.register('net', new NetworkManager({ bus, transport }));

  /* 13 — digital twin ----------------------------------------------------- */
  await step(0.95, 'Indexing the venue');
  const registry = engine.register('registry', new ObjectRegistry({ bus }));

  /* THE RULE (see ADR-012): an object class that may scale into the tens or
   * hundreds of thousands is VIRTUAL — backed by typed arrays, presented
   * through the same VenueObject contract. Anything in the tens or hundreds
   * is CONCRETE. Callers cannot tell which they hold. */

  // Virtual: high cardinality, typed-array backed.
  registry.registerCollection(new SeatCollection({ seats, venueId: venue.id }));
  registry.registerCollection(new CrowdCollection({
    crowd: engine.get('crowd'), seats, venueId: venue.id
  }));
  if (venue.structure?.parking) {
    registry.registerCollection(new ParkingCollection({
      venueId: venue.id, lots: venue.structure.parking.lots
    }));
  }

  // Concrete: scoreboards, access points, lights, zones, camera.
  populateVenueObjects({ venue, seats, registry });

  /* 14 — orchestration ----------------------------------------------------- */
  const director = engine.register('director', new AIDirector({ bus, registry }));
  engine.director = director;
  installDefaultAdapters(director, {
    bus, registry,
    crowd: engine.get('crowd'),
    camera,
    lighting: engine.get('lighting'),
    builder: engine.get('builder')
  });
  DEFAULT_BEHAVIORS.forEach(b => director.addBehavior(b));

  // The scoreboard twin drives the rendered board, rather than the render loop
  // owning the score. One direction only.
  registry.query({ type: 'scoreboard' }).forEach(board => {
    board.on('changed', () => {
      engine.get('builder')?.drawBoards(engine.clock.elapsedTime, board.state);
    });
  });

  // Camera twin sync. Throttled: a position is a fact to be read, not an
  // event to be published sixty times a second.
  const cameraObj = registry.find({ type: 'camera' });
  let camSync = 0;
  bus.on(EVT.ENGINE_TICK, ({ dt }) => {
    camSync += dt;
    if (camSync < 0.25) return;
    camSync = 0;
    cameraObj?.syncFrom(cameraObject, camera.mode);
  });

  /* 15 — plugins ----------------------------------------------------------- */
  const plugins = engine.register('plugins', new PluginHost({
    engine, bus, registry, director,
    services, uiRoot: document.getElementById('ui-root'),
    config: engineConfig
  }));
  engine.plugins = plugins;

  /* 16 — test avatars ------------------------------------------------------ */
  const testAvatars = engine.register('testAvatars', new TestAvatarController({ bus, seats, avatars }));

  /* ── integration wiring ────────────────────────────────────────────────
   * These are the only places two subsystems meet, and each is one line of
   * intent. When a real backend arrives, these lines stay as they are.
   * ------------------------------------------------------------------- */

  // Presence → avatars
  bus.on(EVT.NET_PRESENCE, ({ joined, left }) => {
    joined.forEach(u => avatars.add(u));
    left.forEach(id => avatars.remove(id));
  });

  // Avatars → twin. AvatarManager keeps rendering records; the registry keeps
  // the queryable ones. Neither imports the other.
  bus.on(EVT.AVATAR_ADDED, ({ userId, seatIndex, username, team }) => {
    const obj = new AvatarObject({ venueId: venue.id, userId, username, team });
    obj.seat(null, [seats.position[seatIndex * 3], seats.position[seatIndex * 3 + 1], seats.position[seatIndex * 3 + 2]]);
    try { registry.add(obj); } catch { /* duplicate id: user already seated */ }
  });
  bus.on(EVT.AVATAR_REMOVED, ({ userId }) => {
    registry.remove(`avatar:${venue.id}:${userId}`);
  });
  bus.on(EVT.AVATAR_EMOTE, ({ userId, emote }) => {
    registry.get(`avatar:${venue.id}:${userId}`)?.setEmote(emote);
  });

  // Chat service → UI
  services.get('chat').onMessage(msg => bus.emit(EVT.NET_CHAT, msg));

  // Crowd AI service → crowd
  services.get('crowdAI').onDirective(d => bus.emit(EVT.CROWD_REACTION, d));
  bus.on(EVT.ENGINE_TICK, ({ dt, elapsed }) => {
    services.get('crowdAI').tick(dt, { population: avatars.population, elapsed });
  });

  // Persistence now flows through the TWIN rather than through seat-specific
  // events, so any claimable object — a seat, a parking space, a future suite
  // — persists by the same path with no new wiring.
  const persistence = services.get('persistence');
  registry.watch(({ object, event, payload }) => {
    if (event === 'claimed') {
      persistence.saveSeatClaim(venue.id, {
        pid: object.persistentId, type: object.type,
        index: object.index ?? null,
        seatIndex: object.type === 'seat' ? object.index : undefined,
        userId: payload.userId, username: payload.username, team: payload.team
      });
    } else if (event === 'released') {
      persistence.clearSeatClaim(venue.id, object.persistentId);
    }
  });

  // Network sync for the twin. Cost is proportional to what changed, never to
  // cardinality — an untouched venue collects nothing.
  let deltaTimer = 0;
  bus.on(EVT.ENGINE_TICK, ({ dt }) => {
    deltaTimer += dt;
    if (deltaTimer < 0.5) return;
    deltaTimer = 0;
    const deltas = registry.collectDeltas();
    if (deltas.length) bus.emit(EVT.OBJECT_CHANGED, { deltas });
  });

  // Avatar positions → voice, for distance-based subscription. No-op until a
  // voice provider is bound; the call site exists so binding one is enough.
  const voice = services.get('voice');
  if (voice.supported) {
    bus.on(EVT.ENGINE_TICK, () => {
      voice.updateListener({
        position: cameraObject.position.toArray(),
        forward: cameraObject.getWorldDirection(new (cameraObject.position.constructor)()).toArray()
      });
    });
  }

  /* 17 — UI ---------------------------------------------------------------- */
  await step(0.98, 'Opening the gates');
  engine.register('ui', new UIManager({
    root: document.getElementById('ui-root'),
    bus, seats, engine, venue, testAvatars
  }));

  await net.connect({ username: session.username, team: 'home' });

  // Example plugins. Neither required an engine change; both are unloadable
  // at runtime with engine.unloadPlugin(id).
  await engine.loadPlugin(AnalyticsPlugin);
  await engine.loadPlugin(PollingPlugin);

  await step(1, 'Ready');
  engine.start();
  loaderEl.style.opacity = '0';
  setTimeout(() => loaderEl.remove(), 900);

  // Console handles for development.
  window.venue = engine;
  const s = seats.stats();
  console.info(
    `[${venue.id}] ${s.total.toLocaleString()} seats · ${s.sections} sections · ` +
    `signed in as ${session.username}${session.guest ? ' (guest)' : ''}`
  );
  console.info(
    'Try:\n' +
    '  venue.testAvatars.placeRandom(20)\n' +
    "  venue.registry.summary('seat','occupancy')\n" +
    "  venue.registry.query({type:'seat', vip:true, occupancy:'empty'}, {limit:5})\n" +
    "  venue.registry.summary('crowdMember','present')\n" +
    "  venue.registry.summary('parking','status')\n" +
    '  venue.registry.stats()\n' +
    "  venue.director.issue({channel:'crowd', action:'react', params:{type:'wave'}})\n" +
    '  venue.plugins.list()'
  );
}

boot().catch(err => {
  console.error(err);
  msgEl.textContent = 'Failed to start — see console';
  msgEl.style.color = '#ff6b7f';
});
