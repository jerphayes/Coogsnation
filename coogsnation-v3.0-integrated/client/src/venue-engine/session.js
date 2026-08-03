/**
 * client/src/venue-engine/session.js
 * ---------------------------------------------------------------------------
 * The engine's entry point as an application subsystem.
 *
 * Replaces the standalone `main.js` boot, which assumed it owned the page:
 * it grabbed `#viewport` and `#ui-root` by id, wrote to `document.title`,
 * started rendering on import, and had no teardown. None of that is
 * acceptable inside a single-page application where the user navigates away.
 *
 * What changed, and why:
 *
 *   owns the page      → renders into a container the application provides
 *   boots on import    → boots when `createVenueSession()` is called
 *   never stops        → `dispose()` releases GPU resources and the frame loop
 *   local auth         → receives an application-supplied permission context
 *   localStorage       → persists through the CoogsNation venue API
 *   global console API → returns a typed session handle
 *
 * The engine's internals are untouched. This is composition, not redesign:
 * every module is constructed in the same order `main.js` used.
 */

import * as THREE from 'three';
import './ui/ui.css';
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
import { ServiceRegistry } from './services/interfaces.js';
import { bindLocalServices } from './services/local.js';
import { loadVenue, VENUE_REGISTRY } from './venues/index.js';
import CoogsAuthService from './adapters/CoogsAuthService.js';
import CoogsPersistenceService from './adapters/CoogsPersistenceService.js';
import { createEventBridge } from './bridge/eventBridge.js';

/** Venues this build can render. Cheap — no engine construction. */
export function availableVenues() {
  return Object.entries(VENUE_REGISTRY).map(([id, entry]) => ({
    id,
    label: entry.label,
    category: entry.category,
  }));
}

/**
 * Boot a venue into a container element.
 * @param {import('./index').VenueSessionOptions} options
 * @returns {Promise<import('./index').VenueSession>}
 */
export async function createVenueSession(options) {
  const { container, venueId, user, persistence, onProgress, logger } = options;
  if (!container) throw new Error('createVenueSession requires a container element');
  if (!user?.userId) throw new Error('createVenueSession requires an authenticated user context');

  const log = logger || {
    info: (m, meta) => console.info(`[venue] ${m}`, meta || ''),
    warn: (m, meta) => console.warn(`[venue] ${m}`, meta || ''),
    error: (m, meta) => console.error(`[venue] ${m}`, meta || ''),
  };
  const progress = (fraction, message) => {
    try { onProgress?.(fraction, message); } catch { /* reporting must never break boot */ }
  };

  /* The engine needs a canvas and a UI root. It creates its own INSIDE the
   * container rather than reaching for document ids, so several venues could
   * in principle coexist and teardown is exact. */
  const canvas = document.createElement('canvas');
  canvas.className = 'venue-viewport';
  const uiRoot = document.createElement('div');
  uiRoot.className = 'venue-ui-root';
  container.append(canvas, uiRoot);

  progress(0.04, 'Reading venue definition');
  const venue = await loadVenue(venueId);

  const engine = new VenueEngine({ canvas });
  const { bus, scene, renderer, cameraObject } = engine;

  /* Services. Auth and persistence come from the application; the engine's
   * own implementations were removed during integration. */
  progress(0.08, 'Binding services');
  const bridgeRef = { current: null };
  const auth = new CoogsAuthService({ user });
  const persistenceService = persistence || new CoogsPersistenceService({
    venueId,
    onError: (name, payload) => bridgeRef.current?.emit(name, payload),
  });
  const services = engine.register('services', bindLocalServices(new ServiceRegistry(), SERVICES, {
    auth,
    persistence: persistenceService,
  }));
  const session = await services.get('auth').resolve();

  progress(0.14, 'Loading assets');
  const assets = engine.register('assets', new AssetLoader({ renderer, bus }));
  await assets.loadManifest();
  await assets.loadEnvironment(scene);

  progress(0.2, 'Surveying the site');
  const footprint = engine.register('footprint', createFootprint(venue.footprint));
  engine.register('venue', venue);

  engine.register('builder', await VenueBuilder.create(
    { scene, footprint, venue, renderer },
    (f, label) => progress(0.3 + f * 0.2, `Building ${label}`),
  ));

  const seats = engine.register('seats', await SeatManager.create(
    { scene, bus, footprint, venue },
    (f, label) => progress(0.5 + f * 0.18, `Setting ${label}`),
  ));

  progress(0.68, 'Filling the house');
  const crowd = engine.register('crowd', new CrowdManager({ scene, bus, seats, renderer, venue }));

  progress(0.78, 'Preparing avatars');
  const avatars = engine.register('avatars', new AvatarManager({
    scene, bus, seats, camera: cameraObject, assets,
  }));

  progress(0.85, 'Striking the lights');
  engine.register('lighting', new LightingManager({ scene, renderer, footprint, venue }));

  progress(0.9, 'Rigging cameras');
  const camera = engine.register('camera', new CameraController({
    camera: cameraObject, domElement: renderer.domElement, bus, seats, venue,
  }));
  camera.setMode('orbit', { autoRotate: true });

  progress(0.94, 'Connecting');
  const transport = createTransport({
    seatCount: seats.count,
    pickSeat: () => {
      for (let attempt = 0; attempt < 30; attempt++) {
        const i = (Math.random() * seats.count) | 0;
        if (seats.occupied[i] !== 2) return i;
      }
      return seats.findAvailable();
    },
  });
  const net = engine.register('net', new NetworkManager({ bus, transport }));

  progress(0.95, 'Indexing the venue');
  const registry = engine.register('registry', new ObjectRegistry({ bus }));
  registry.registerCollection(new SeatCollection({ seats, venueId: venue.id }));
  registry.registerCollection(new CrowdCollection({ crowd, seats, venueId: venue.id }));
  if (venue.structure?.parking) {
    registry.registerCollection(new ParkingCollection({
      venueId: venue.id, lots: venue.structure.parking.lots,
    }));
  }
  populateVenueObjects({ venue, seats, registry });

  const director = engine.register('director', new AIDirector({ bus, registry }));
  engine.director = director;
  installDefaultAdapters(director, {
    bus, registry, crowd, camera, lighting: engine.get('lighting'), builder: engine.get('builder'),
  });
  DEFAULT_BEHAVIORS.forEach((b) => director.addBehavior(b));

  registry.query({ type: 'scoreboard' }).forEach((board) => {
    board.on('changed', () => {
      engine.get('builder')?.drawBoards(engine.clock.elapsedTime, board.state);
    });
  });

  const plugins = engine.register('plugins', new PluginHost({
    engine, bus, registry, director, services, uiRoot, config: engineConfig,
  }));
  engine.plugins = plugins;

  const testAvatars = engine.register('testAvatars', new TestAvatarController({ bus, seats, avatars }));

  /* ── event bridge: application-level events only ─────────────────── */
  const bridge = createEventBridge({
    bus, venueId: venue.id, userId: user.userId, seats, registry,
  });
  bridgeRef.current = bridge;

  /* ── integration wiring ──────────────────────────────────────────── */
  bus.on(EVT.NET_PRESENCE, ({ joined, left }) => {
    joined.forEach((u) => avatars.add(u));
    left.forEach((id) => avatars.remove(id));
  });

  bus.on(EVT.AVATAR_ADDED, ({ userId, seatIndex, username, team }) => {
    const obj = new AvatarObject({ venueId: venue.id, userId, username, team });
    obj.seat(null, [
      seats.position[seatIndex * 3],
      seats.position[seatIndex * 3 + 1],
      seats.position[seatIndex * 3 + 2],
    ]);
    try { registry.add(obj); } catch { /* already seated */ }
  });
  bus.on(EVT.AVATAR_REMOVED, ({ userId }) => registry.remove(`avatar:${venue.id}:${userId}`));
  bus.on(EVT.AVATAR_EMOTE, ({ userId, emote }) =>
    registry.get(`avatar:${venue.id}:${userId}`)?.setEmote(emote));

  services.get('chat').onMessage((msg) => bus.emit(EVT.NET_CHAT, msg));
  services.get('crowdAI').onDirective((d) => bus.emit(EVT.CROWD_REACTION, d));
  bus.on(EVT.ENGINE_TICK, ({ dt, elapsed }) => {
    services.get('crowdAI').tick(dt, { population: avatars.population, elapsed });
  });

  /* Persistence flows through the twin, so any claimable object persists by
   * the same path. The adapter reaches the CoogsNation API, never the DB. */
  registry.watch(({ object, event, payload }) => {
    if (event === 'claimed') {
      persistenceService.saveSeatClaim(venue.id, {
        pid: object.persistentId,
        index: object.index ?? null,
        section: object.metadata?.section,
        row: object.metadata?.row,
        seatNumber: object.metadata?.number,
        userId: payload.userId,
        displayName: payload.username,
      });
    } else if (event === 'released') {
      persistenceService.clearSeatClaim(venue.id, object.persistentId);
    }
  });

  const cameraObj = registry.find({ type: 'camera' });
  let camSync = 0;
  bus.on(EVT.ENGINE_TICK, ({ dt }) => {
    camSync += dt;
    if (camSync < 0.25) return;
    camSync = 0;
    cameraObj?.syncFrom(cameraObject, camera.mode);
  });

  progress(0.98, 'Opening the gates');
  engine.register('ui', new UIManager({
    root: uiRoot, bus, seats, engine, venue, testAvatars,
  }));

  /* Restore seat ownership the application already holds. */
  try {
    const existing = await persistenceService.loadSeatOwnership(venue.id);
    for (const claim of existing) {
      if (typeof claim.seatIndex === 'number') {
        seats.claim(claim.seatIndex, {
          userId: claim.userId, username: claim.username, team: claim.team,
        });
      }
    }
    if (existing.length) log.info(`restored ${existing.length} seat claim(s)`);
  } catch (error) {
    log.warn('seat ownership restore failed', { message: error.message });
  }

  await net.connect({ username: session.username, team: 'home' });

  progress(1, 'Ready');
  engine.start();

  const stats = {
    venueId: venue.id,
    label: venue.label,
    seats: seats.count,
    sections: seats.sections.length,
    twinObjects: registry.stats().total,
    cameraPresets: camera.views(),
  };
  const enteredAt = Date.now();
  bridge.emit('venue:entered', {
    venueId: venue.id, capacity: stats.seats, sections: stats.sections,
  });
  log.info(`entered ${venue.label}`, stats);

  let disposed = false;

  /* Development console handle.
   *
   * Guarded by import.meta.env.DEV so it is stripped from production builds:
   * a global reference to the live session would otherwise pin the whole
   * engine in memory after teardown, defeating dispose(). Present in dev
   * because browser validation needs a way to drive the venue by hand. */
  const exposeDevHandle = (session) => {
    if (import.meta.env?.DEV) globalThis.venue = session;
  };

  const publicSession = {
    venueId: venue.id,
    stats,
    bridge,

    setCameraView(name) { return camera.setView(name); },
    cameraViews() { return camera.views(); },

    async claimSeat(seatIndex) {
      const collection = registry._collections.get('seat');
      const handle = collection?.resolveByIndex(seatIndex);
      if (!handle) return false;
      const claimed = handle.claim(user.userId, { username: user.displayName });
      collection.recycle(handle);
      return claimed;
    },

    async releaseSeat() {
      for (let i = 0; i < seats.count; i++) {
        if (seats.avatarId[i] === user.userId) { seats.release(i); return; }
      }
    },

    occupancy() { return registry.summary('seat', 'occupancy') || {}; },

    pause() { engine.stop(); },
    resume() { engine.start(); },

    async dispose() {
      if (disposed) return;
      disposed = true;
      bridge.emit('venue:exited', { venueId: venue.id, durationMs: Date.now() - enteredAt });
      try {
        engine.stop();
        bridge.dispose();
        await plugins.dispose?.();
        director.dispose?.();
        registry.dispose?.();
        net.disconnect?.();
        seats.dispose?.();
        crowd.dispose?.();
        avatars.dispose?.();
        engine.dispose?.();
        // Free GPU memory explicitly — a SPA may enter several venues per session.
        scene.traverse((object) => {
          object.geometry?.dispose?.();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose?.());
          else material?.dispose?.();
        });
        renderer.dispose?.();
        THREE.Cache.clear();
      } catch (error) {
        log.error('venue teardown incomplete', { message: error.message });
      } finally {
        canvas.remove();
        uiRoot.remove();
        if (globalThis.venue === publicSession) delete globalThis.venue;
      }
      log.info(`exited ${venue.label}`);
    },
  };

  exposeDevHandle(publicSession);
  return publicSession;
}

export default createVenueSession;
