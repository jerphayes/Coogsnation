/**
 * objects/builtins.js
 * ---------------------------------------------------------------------------
 * Concrete VenueObject types — the low-cardinality half of the object model.
 * These are ordinary instances stored in the registry, because a venue has
 * tens of them, not tens of thousands.
 *
 * Each one exists to make a piece of the venue *queryable and directable*
 * rather than merely drawn. A scoreboard that is only a texture cannot be
 * asked what it is showing, and cannot be told to show something else without
 * a direct reference to the module that drew it. As a VenueObject it can be
 * both, and the AIDirector can address it without knowing VenueBuilder exists.
 *
 * The pattern for every one of these: state lives here, rendering subscribes.
 * The object never imports three.js.
 */

import { VenueObject, OBJECT_TYPE, persistentId } from '../core/VenueObject.js';

/* ═══════════════════════════════════════════════════════════════════════
 * SCOREBOARD / DISPLAY
 * ═══════════════════════════════════════════════════════════════════════ */

export class ScoreboardObject extends VenueObject {
  /** @param {{venueId:string, boardId:string, width:number, height:number, position:number[]}} spec */
  constructor(spec) {
    super({
      type: OBJECT_TYPE.SCOREBOARD,
      persistentId: persistentId(OBJECT_TYPE.SCOREBOARD, spec.venueId, spec.boardId),
      transform: { position: spec.position || [0, 0, 0] },
      metadata: { boardId: spec.boardId, width: spec.width, height: spec.height, faces: spec.faces || 1 },
      state: {
        mode: 'idle',            // 'idle' | 'game' | 'replay' | 'sponsor' | 'message' | 'off'
        content: null,           // mode-specific payload
        animation: null,         // active transition name
        brightness: 1,
        home: 0, away: 0, period: 1, clock: '15:00', situation: ''
      }
    });
  }

  /** Convenience wrappers that keep call sites declarative. */
  showGame(patch) { this.setState({ mode: 'game', ...patch }); }
  showMessage(text, ttl = 8) { this.setState({ mode: 'message', content: { text, ttl } }); }
  showSponsor(sponsorId) { this.setState({ mode: 'sponsor', content: { sponsorId } }); }
  blank() { this.setState({ mode: 'off', content: null }); }
}

/* ═══════════════════════════════════════════════════════════════════════
 * ACCESS POINT — door, tunnel, gate, escalator, elevator
 *
 * One type rather than five, because they answer the same questions: can a
 * person pass, in which direction, and how many are passing. Crowd flow,
 * wayfinding and evacuation logic all consume that shape identically.
 * ═══════════════════════════════════════════════════════════════════════ */

export class AccessPointObject extends VenueObject {
  /**
   * @param {{venueId:string, key:string, kind:'door'|'tunnel'|'gate'|'escalator'|'elevator',
   *          position:number[], connects:[string,string], capacityPerMinute?:number}} spec
   */
  constructor(spec) {
    super({
      type: OBJECT_TYPE.ACCESS_POINT,
      persistentId: persistentId(OBJECT_TYPE.ACCESS_POINT, spec.venueId, spec.key),
      transform: { position: spec.position || [0, 0, 0] },
      metadata: {
        kind: spec.kind,
        connects: spec.connects || [],
        capacityPerMinute: spec.capacityPerMinute ?? 600,
        bidirectional: spec.bidirectional ?? true
      },
      state: {
        status: 'open',          // 'open' | 'closed' | 'restricted' | 'maintenance'
        direction: 'both',       // 'both' | 'in' | 'out'
        throughput: 0,           // people per minute, live
        queueLength: 0
      }
    });
  }

  open(direction = 'both') { this.setState({ status: 'open', direction }); }
  close() { this.setState({ status: 'closed', throughput: 0 }); }
  restrict(reason) { this.setState({ status: 'restricted', content: reason }); }

  get passable() { return this.state.status === 'open'; }
}

/* ═══════════════════════════════════════════════════════════════════════
 * LIGHT FIXTURE
 * ═══════════════════════════════════════════════════════════════════════ */

export class LightFixtureObject extends VenueObject {
  /** @param {{venueId:string, key:string, kind:string, position:number[]}} spec */
  constructor(spec) {
    super({
      type: OBJECT_TYPE.LIGHT,
      persistentId: persistentId(OBJECT_TYPE.LIGHT, spec.venueId, spec.key),
      transform: { position: spec.position || [0, 0, 0] },
      metadata: { kind: spec.kind, channel: spec.channel || 'house' },
      state: {
        on: true,
        intensity: 1,
        color: spec.color || '#fff1d6',
        preset: 'default',
        effect: null             // 'strobe' | 'chase' | 'pulse' | null
      }
    });
  }

  setEffect(effect, params = {}) { this.setState({ effect, content: params }); }
  blackout() { this.setState({ on: false, intensity: 0, effect: null }); }
}

/* ═══════════════════════════════════════════════════════════════════════
 * AVATAR
 *
 * Mirrors AvatarManager's records into the twin so a user is queryable
 * ("who is in section 112", "who is talking") without any consumer reaching
 * into the rendering module.
 * ═══════════════════════════════════════════════════════════════════════ */

export class AvatarObject extends VenueObject {
  /** @param {{venueId:string, userId:string|number, username:string, team:string}} spec */
  constructor(spec) {
    super({
      type: OBJECT_TYPE.AVATAR,
      persistentId: persistentId(OBJECT_TYPE.AVATAR, spec.venueId, spec.userId),
      metadata: { userId: spec.userId, test: !!spec.test },
      owner: spec.userId,
      state: {
        username: spec.username,
        team: spec.team || 'home',
        activity: 'seated',      // 'seated' | 'walking' | 'talking' | 'away' | 'idle'
        seatId: spec.seatId || null,
        emote: null,
        speaking: false,
        visible: true
      }
    });
  }

  seat(seatPersistentId, position) {
    this.setState({ activity: 'seated', seatId: seatPersistentId });
    if (position) this.setTransform({ position });
  }
  stand() { this.setState({ activity: 'walking', seatId: null }); }
  setEmote(emote) { this.setState({ emote }); }
  setSpeaking(on) { this.setState({ speaking: on, activity: on ? 'talking' : 'seated' }); }
}

/* ═══════════════════════════════════════════════════════════════════════
 * CAMERA
 *
 * Concrete: a venue has a handful. Mirrors CameraController so the active
 * viewpoint is queryable and directable like anything else — a replay system
 * or an AI director should not need a reference to the controller to know
 * where the camera is.
 * ═══════════════════════════════════════════════════════════════════════ */

export class CameraObject extends VenueObject {
  /** @param {{venueId:string, key?:string, modes:string[]}} spec */
  constructor(spec) {
    super({
      type: OBJECT_TYPE.CAMERA,
      persistentId: persistentId(OBJECT_TYPE.CAMERA, spec.venueId, spec.key || 'primary'),
      metadata: { key: spec.key || 'primary', modes: spec.modes || [], primary: spec.primary !== false },
      state: {
        mode: 'orbit',
        target: null,        // persistentId of a focused object, if any
        seatIndex: null,
        moving: false,
        fov: spec.fov ?? 42
      }
    });
  }

  /** Called by a throttled sync, not every frame — position is not an event. */
  syncFrom(camera, mode) {
    this.setTransform({ position: camera.position.toArray() }, { silent: true });
    if (this.state.mode !== mode) this.setState({ mode });
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 * ZONE — section, concourse, lot, suite, GA floor
 *
 * Zones are how anything reasons about "where" without knowing geometry.
 * A sponsorship plugin targets a zone; an evacuation model drains one; a
 * heat map colours them. None of that needs the footprint maths.
 * ═══════════════════════════════════════════════════════════════════════ */

export class ZoneObject extends VenueObject {
  /**
   * @param {{venueId:string, key:string, kind:string, label:string,
   *          seatRange?:[number,number], centre?:number[]}} spec
   */
  constructor(spec) {
    super({
      type: OBJECT_TYPE.ZONE,
      persistentId: persistentId(OBJECT_TYPE.ZONE, spec.venueId, spec.key),
      transform: { position: spec.centre || [0, 0, 0] },
      metadata: {
        kind: spec.kind,             // 'section' | 'concourse' | 'lot' | 'suite' | 'floor'
        label: spec.label,
        tier: spec.tier || null,
        seatRange: spec.seatRange || null,
        capacity: spec.capacity ?? 0
      },
      state: {
        occupancy: 0,                // 0..1
        status: 'open',
        noise: 0                     // 0..1, drives crowd audio and reactions
      }
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 * FACTORY
 * Builds the concrete object set for a venue from its definition. Called once
 * by main.js after VenueBuilder; keeps the twin construction in one readable
 * place instead of scattered through the geometry builders.
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * @param {{venue:object, seats:SeatManager, registry:ObjectRegistry}} ctx
 * @returns {{scoreboards:ScoreboardObject[], accessPoints:AccessPointObject[], zones:ZoneObject[]}}
 */
export function populateVenueObjects({ venue, seats, registry }) {
  const vid = venue.id;
  const structure = venue.structure || {};
  const made = { scoreboards: [], accessPoints: [], zones: [], lights: [] };

  for (const cfg of structure.videoBoards || []) {
    const x = cfg.end === 'north' ? 120 : cfg.end === 'south' ? -120 : 0;
    made.scoreboards.push(registry.add(new ScoreboardObject({
      venueId: vid, boardId: cfg.id, width: cfg.width, height: cfg.height,
      position: [x, cfg.y, 0], faces: cfg.end === 'centre' ? 4 : 1
    })));
  }
  for (const cfg of structure.ribbonBoards || []) {
    made.scoreboards.push(registry.add(new ScoreboardObject({
      venueId: vid, boardId: cfg.id, width: 0, height: cfg.height, position: [0, 0, 0]
    })));
  }

  const t = structure.tunnels;
  if (t) {
    for (let i = 0; i < t.count; i++) {
      made.accessPoints.push(registry.add(new AccessPointObject({
        venueId: vid, key: `tunnel-${i + 1}`, kind: 'tunnel',
        connects: ['concourse-1', 'bowl'], capacityPerMinute: 900,
        position: [0, 0, 0]
      })));
    }
  }
  for (const [kind, cfg] of [['escalator', structure.escalators], ['elevator', structure.elevators]]) {
    if (!cfg) continue;
    for (let i = 0; i < cfg.count; i++) {
      made.accessPoints.push(registry.add(new AccessPointObject({
        venueId: vid, key: `${kind}-${i + 1}`, kind,
        connects: ['concourse-1', 'concourse-2'],
        capacityPerMinute: kind === 'escalator' ? 480 : 90,
        position: [0, 0, 0]
      })));
    }
  }
  if (structure.facade?.portals) {
    for (let i = 0; i < structure.facade.portals; i++) {
      made.accessPoints.push(registry.add(new AccessPointObject({
        venueId: vid, key: `gate-${i + 1}`, kind: 'gate',
        connects: ['exterior', 'concourse-1'], capacityPerMinute: 1200,
        position: [0, 0, 0]
      })));
    }
  }

  // One zone per seating section, with its seat range so a zone can resolve
  // its own seats through the registry without touching SeatManager.
  for (const section of seats.sections) {
    if (!section.count) continue;
    made.zones.push(registry.add(new ZoneObject({
      venueId: vid,
      key: `section-${section.label}`,
      kind: 'section',
      label: String(section.label),
      tier: section.tierId,
      seatRange: [section.start, section.start + section.count],
      capacity: section.count,
      centre: section.centre ? [section.centre.x, section.centre.y, section.centre.z] : [0, 0, 0]
    })));
  }

  made.camera = registry.add(new CameraObject({
    venueId: vid, key: 'primary', modes: venue.camera?.modes || []
  }));
  for (const [key, view] of Object.entries(venue.camera?.views || {})) {
    const cam = registry.add(new CameraObject({ venueId: vid, key, primary: false }));
    cam.setTransform({ position: view.position }, { silent: true });
    cam.setState({ mode: 'fixed', target: null }, { silent: true });
  }

  // Tailgate areas: zones with no geometry — data first, meshes later.
  (structure.tailgate?.areas || []).forEach(a => {
    made.zones.push(registry.add(new ZoneObject({
      venueId: vid, key: `tailgate-${a.id}`, kind: 'tailgate',
      label: a.label || `Tailgate ${a.id}`, capacity: a.capacity ?? 0,
      centre: a.centre || [0, 0, 0]
    })));
  });

  /* Generic venue-declared amenities. Restrooms, concessions, media areas,
   * officials' rooms and locker rooms are all "a named place with a capacity"
   * — one declarative list rather than a builder per type. Geometry is
   * optional and can be attached later without any consumer noticing
   * (ADR-013: the twin is not a view of the scene graph). */
  (structure.zones || []).forEach(z => {
    made.zones.push(registry.add(new ZoneObject({
      venueId: vid, key: z.id, kind: z.kind || 'amenity',
      label: z.label || z.id, capacity: z.capacity ?? 0,
      tier: z.tier || null, centre: z.centre || [0, 0, 0]
    })));
  });

  /* Venue-declared access points: entrances, emergency exits, locker-room
   * and tunnel doors. Same contract as the generated ones, so evacuation and
   * wayfinding logic sees a single uniform set. */
  (structure.accessPoints || []).forEach(a => {
    made.accessPoints.push(registry.add(new AccessPointObject({
      venueId: vid, key: a.id, kind: a.kind || 'door',
      connects: a.connects || [], capacityPerMinute: a.capacityPerMinute ?? 600,
      bidirectional: a.bidirectional ?? true,
      position: a.position || [0, 0, 0]
    })));
  });

  const fixtures = venue.lighting?.fixtures;
  if (fixtures?.type === 'masts') {
    for (let i = 0; i < 4; i++) {
      made.lights.push(registry.add(new LightFixtureObject({
        venueId: vid, key: `mast-${i + 1}`, kind: 'mast', channel: 'field',
        position: [0, fixtures.height, 0]
      })));
    }
  } else if (fixtures?.type === 'poles') {
    (fixtures.positions || []).forEach(([px, pz], i) => {
      made.lights.push(registry.add(new LightFixtureObject({
        venueId: vid, key: `pole-${i + 1}`, kind: 'pole', channel: 'field',
        position: [px, fixtures.height, pz]
      })));
    });
  } else if (fixtures?.type === 'catwalk') {
    (fixtures.rings || []).forEach((ring, i) => {
      made.lights.push(registry.add(new LightFixtureObject({
        venueId: vid, key: `catwalk-${i + 1}`, kind: 'catwalk', channel: 'house',
        position: [0, ring.height, 0]
      })));
    });
  }

  return made;
}

export default {
  ScoreboardObject, AccessPointObject, LightFixtureObject, AvatarObject,
  CameraObject, ZoneObject, populateVenueObjects
};
