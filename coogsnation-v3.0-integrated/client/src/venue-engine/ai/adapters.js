/**
 * ai/adapters.js
 * ---------------------------------------------------------------------------
 * Where the director's vocabulary meets the modules' APIs — and the only
 * place it does.
 *
 * This file is the reason Phase II added an orchestration layer without
 * touching CrowdManager, LightingManager, CameraController or VenueBuilder.
 * Each adapter subscribes to a channel and calls the same public methods a
 * person would call from the console. Modules stayed independent; the director
 * stayed ignorant of them.
 *
 * If you find yourself wanting to import a module inside AIDirector, write an
 * adapter instead. That is the whole discipline.
 */

import { CHANNEL } from './directives.js';
import { EVT } from '../core/EventBus.js';

/**
 * @param {AIDirector} director
 * @param {{bus, crowd, camera, lighting, registry, builder}} modules
 * @returns {() => void} unregister all
 */
export function installDefaultAdapters(director, modules) {
  const { bus, crowd, camera, lighting, registry } = modules;
  const off = [];

  /* ── crowd ─────────────────────────────────────────────────────────── */
  off.push(director.registerAdapter(CHANNEL.CROWD, d => {
    switch (d.action) {
      case 'react':
        // CrowdManager already listens for this event; the director does not
        // need to know CrowdManager exists.
        bus.emit(EVT.CROWD_REACTION, { type: d.params.type, strength: d.params.strength ?? 1 });
        break;
      case 'setDensity':
        crowd?.setDensity?.(d.params.rate);
        break;
      case 'focus': {
        const zone = registry.get(d.params.zone);
        if (zone) zone.setState({ noise: 1 });
        break;
      }
    }
  }));

  /* ── camera ────────────────────────────────────────────────────────── */
  off.push(director.registerAdapter(CHANNEL.CAMERA, d => {
    switch (d.action) {
      case 'mode':
        camera?.setMode(d.params.mode, d.params.options || {});
        break;
      case 'focus': {
        // Directives address objects by persistent id, never by seat index —
        // indices are an implementation detail of the seat store.
        const obj = registry.get(d.params.target);
        if (obj?.type === 'seat') bus.emit(EVT.SEAT_FOCUS, { seatIndex: obj.index });
        break;
      }
      case 'cut':
        camera?.setMode(d.params.preset);
        break;
      case 'dolly':
        camera?.setMode('broadcast');
        break;
    }
  }));

  /* ── lighting ──────────────────────────────────────────────────────── */
  off.push(director.registerAdapter(CHANNEL.LIGHTING, d => {
    switch (d.action) {
      case 'preset':
        lighting?.setPreset(d.params.preset);
        break;
      case 'fixtures':
        lighting?.setFixtures(d.params.on);
        break;
      case 'blackout':
        lighting?.setFixtures(false);
        registry.query({ type: 'light' }).forEach(l => l.blackout());
        break;
      case 'effect':
        registry.query({ type: 'light', ...(d.params.channel ? { channel: d.params.channel } : {}) })
          .forEach(l => l.setEffect(d.params.effect, d.params.params || {}));
        break;
    }
  }));

  /* ── scoreboard ────────────────────────────────────────────────────── */
  off.push(director.registerAdapter(CHANNEL.SCOREBOARD, d => {
    const boards = d.params.boardId
      ? [registry.find({ type: 'scoreboard', boardId: d.params.boardId })].filter(Boolean)
      : registry.query({ type: 'scoreboard' });

    for (const b of boards) {
      if (d.action === 'update') b.showGame(d.params.patch);
      else if (d.action === 'message') b.showMessage(d.params.text, d.params.ttl);
      else if (d.action === 'mode') b.setState({ mode: d.params.mode });
    }
  }));

  /* ── audio, effects, announce ──────────────────────────────────────────
   * No renderer-side implementation yet. Registered as quiet no-ops rather
   * than left unregistered, so behaviours can be written and tested against
   * the real vocabulary today, and the log records intent that the venue
   * could not yet carry out. An unregistered channel would instead spam
   * warnings and tempt someone to stop issuing the directive at all.
   * ------------------------------------------------------------------- */
  for (const ch of [CHANNEL.AUDIO, CHANNEL.EFFECTS, CHANNEL.ANNOUNCE]) {
    off.push(director.registerAdapter(ch, d => {
      bus.emit(EVT.DIRECTOR_UNHANDLED, d);
    }));
  }

  return () => off.forEach(fn => fn());
}

export default installDefaultAdapters;
