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
    /* Venue-declared. A lounge starts with zero simulated occupants. */
    simulation: venue.simulation,
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
  /* Set while `claimSeat()` is driving a claim it has ALREADY persisted, so
   * the watcher below does not POST the same claim a second time. Any other
   * path into the twin (a plugin, a future tool) still persists normally. */
  let suppressClaimPersist = false;

  registry.watch(({ object, event, payload }) => {
    if (event === 'claimed') {
      if (suppressClaimPersist) return;
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

  /**
   * The seat the local user holds, tracked by the session.
   *
   * It CANNOT be derived from `seats.avatarId`. That is an Int32Array — a
   * numeric id per seat, sized for a 58,000-seat bowl — while CoogsNation user
   * ids are strings. `seats.avatarId[i] === user.userId` compares a number to
   * a string and is therefore false for every seat, always. The previous
   * `releaseSeat()` was built on exactly that comparison, which means it never
   * released anything: it looped the whole manifest, matched nothing, and
   * returned silently.
   *
   * So local ownership is held here, updated only when the SERVER has
   * confirmed a claim, and cleared on release.
   */
  let localSeatIndex = null;

  const publicSession = {
    venueId: venue.id,
    stats,
    bridge,

    setCameraView(name) { return camera.setView(name); },
    cameraViews() { return camera.views(); },

    /* Presentation options — see VenueDefinition.options() (ADR-020). The
     * session forwards and reports; it does not interpret. Errors from a venue
     * are contained here so a bad option can never take down the frame loop. */
    venueOptions() {
      try { return venue.options() || []; }
      catch (error) { log.warn('venue.options() threw', { message: error.message }); return []; }
    },

    setVenueOption(key, value) {
      try { return venue.setOption(key, value) === true; }
      catch (error) {
        log.warn('venue.setOption() threw', { key, message: error.message });
        return false;
      }
    },

    /**
     * Move the local user to a seat. THE SERVER DECIDES.
     *
     * Order is the whole correctness argument here. The previous version
     * claimed the seat locally, returned true, and let persistence catch up
     * asynchronously — so a member whose claim was rejected with a 409 still
     * saw themselves sitting there, and two members could each believe they
     * held the same chair while the database had recorded only one of them.
     *
     * Now: persist first, and touch local state and the camera only once the
     * server has confirmed ownership. A refusal changes nothing at all.
     *
     * The three outcomes are reported separately — an occupied seat and an
     * unreachable server call for different words in the interface, and
     * collapsing them into a boolean is what made the old failure invisible.
     *
     * @returns {Promise<{ok:true, seatIndex:number}|{ok:false, reason:'occupied'|'unauthorized'|'failed'|'unknown-seat', message:string}>}
     */
    async claimSeat(seatIndex) {
      const collection = registry._collections.get('seat');
      const handle = collection?.resolveByIndex(seatIndex);
      if (!handle) {
        return { ok: false, reason: 'unknown-seat', message: 'That seat does not exist.' };
      }

      const described = collection.describe(seatIndex);
      const previousIndex = localSeatIndex;

      /* Ask the server FIRST. Nothing local has changed yet, so a refusal
       * leaves the member exactly where they were. */
      const result = await persistenceService.saveSeatClaim(venue.id, {
        pid: described.persistentId,
        index: seatIndex,
        section: described.metadata?.section,
        row: described.metadata?.row,
        seatNumber: described.metadata?.number,
        userId: user.userId,
        displayName: user.displayName,
      });

      if (!result.ok) {
        collection.recycle(handle);
        return result;
      }

      /* Confirmed. Release the old seat only now — the member has never been
       * seatless at any point in this sequence. */
      if (previousIndex !== null && previousIndex !== seatIndex) {
        seats.release(previousIndex);
      }

      suppressClaimPersist = true;
      let claimed = false;
      try {
        claimed = handle.claim(user.userId, { username: user.displayName });
      } finally {
        suppressClaimPersist = false;
        collection.recycle(handle);
      }

      if (!claimed) {
        /* The server granted it but the local twin refused — the two are out
         * of step. Report rather than pretend. */
        return { ok: false, reason: 'failed', message: 'The seat could not be occupied.' };
      }

      localSeatIndex = seatIndex;

      /* The public contract says claiming a seat MOVES the local user to it.
       * Until now nothing flew the camera, so the contract was aspirational.
       * Camera flight happens only after a confirmed claim, never on failure. */
      try { camera.gotoSeat(seatIndex); } catch { /* venue may declare no seat view */ }

      return { ok: true, seatIndex };
    },

    /**
     * Release the seat the local user holds and return to the venue's default
     * view. Also sweeps any seat still recorded against a NUMERIC id matching
     * this session, which is how the legacy code path could strand a seat.
     */
    async releaseSeat() {
      let released = false;

      if (localSeatIndex !== null) {
        seats.release(localSeatIndex);
        persistenceService.clearSeatClaim(
          venue.id,
          registry._collections.get('seat')?.describe(localSeatIndex)?.persistentId,
        );
        localSeatIndex = null;
        released = true;
      }

      /* Defensive sweep for duplicates. Only matches when the id is numeric,
       * which is the only case the seat array can represent at all. */
      const numericId = Number(user.userId);
      if (Number.isInteger(numericId)) {
        for (let i = 0; i < seats.count; i++) {
          if (seats.avatarId[i] === numericId) { seats.release(i); released = true; }
        }
      }

      if (released) {
        try { camera.setView('lounge-home'); } catch { /* venue may not declare it */ }
      }
      return released;
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
