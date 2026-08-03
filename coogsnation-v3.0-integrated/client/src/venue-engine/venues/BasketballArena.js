/**
 * BasketballArena
 * ---------------------------------------------------------------------------
 * A generic COLLEGIATE arena, ~10,000 seats: lower bowl, upper bowl, a
 * dedicated student section behind the west basket, courtside rows, a club
 * level, suites, team benches and a scorer's table. Original design; no real
 * arena referenced, no marks.
 */

import * as THREE from 'three';
import VenueDefinition from './VenueDefinition.js';
import { BASKETBALL_HOOKS, emitVenueEvent, VENUE_EVENTS } from './basketball.hooks.js';

const COURT = {
  length: 28.65,      // 94 ft
  width: 15.24,       // 50 ft
  threePoint: 7.24,
  keyWidth: 4.88,
  keyLength: 5.79,
  rimHeight: 3.05
};

export class BasketballArena extends VenueDefinition {
  constructor() {
    super({
      id: 'basketball',
      label: 'Generic Arena',
      category: 'basketball',

      // Much tighter bowl — the court is a third the length of a pitch.
      footprint: { coreX: 13, coreZ: 3.5, cornerRadius: 11, referenceRadius: 24 },

      tiers: [
        {
          id: 'courtside', label: 'Courtside', sectionPrefix: 0,
          d0: 3.4, d1: 5.6, y0: 0.5, y1: 1.4, rows: 3,
          spans: ['west', 'east'], sectionsPerSpan: 8, vip: true, basePrice: 260
        },
        {
          id: 'student', label: 'Student Section', sectionPrefix: 0,
          d0: 3.4, d1: 9.5, y0: 0.5, y1: 3.6, rows: 9,
          spans: ['south'], sectionsPerSpan: 6, vip: false, basePrice: 10
        },
        {
          id: 'lower', label: 'Lower Bowl', sectionPrefix: 100,
          d0: 10.5, d1: 18.5, y0: 4.4, y1: 10.2, rows: 11,
          spans: 'full', sectionsPerSpan: 20, vip: false, basePrice: 45
        },
        {
          id: 'club', label: 'Club Level', sectionPrefix: 200,
          d0: 19.5, d1: 22.5, y0: 11.6, y1: 13.8, rows: 4,
          spans: ['west', 'east'], sectionsPerSpan: 7, vip: true, basePrice: 140
        },
        {
          id: 'upper', label: 'Upper Bowl', sectionPrefix: 300,
          d0: 24.5, d1: 31, y0: 15.5, y1: 21, rows: 8,
          spans: 'full', sectionsPerSpan: 22, vip: false, basePrice: 18
        }
      ],

      structure: {
        facade: { offset: 33, height: 20, portals: 14, portalHeight: 6 },
        concourse: { level1: 5.5, level2: 14, width: 8 },
        roof: { offset: 34, apexHeight: 31, rimHeight: 20.5 },   // enclosed
        tunnels: { count: 8, width: 3.6, height: 4.2, atRow: 0.5 },
        suites: { span: 'north', offset: 20, y0: 11.6, y1: 14 },
        elevators: { count: 4, shaftWidth: 3.4 },
        approach: { poleLights: 14, radius: [110, 240] },

        /* Parking: virtual objects, no geometry (ADR-013). */
        parking: {
          lots: [
            { id: 'ARENA-N', spaces: 1400, rows: 28, origin: [-120, 0, -150], accessibleRatio: 0.04, evRatio: 0.05 },
            { id: 'ARENA-S', spaces: 1100, rows: 22, origin: [ -90, 0,  160] },
            { id: 'VIP',     spaces: 180,  rows: 9,  origin: [ 105, 0,  -40], accessibleRatio: 0.08 }
          ]
        },

        /* Amenities. Declared as data; the engine builds the twin objects.
         * Positions are concourse-relative and drive wayfinding, not meshes. */
        zones: [
          { id: 'officials-room',  kind: 'officials',  label: "Officials' Room",   capacity: 8,   centre: [-6, 0, -37] },
          { id: 'locker-home',     kind: 'lockerRoom', label: 'Home Locker Room',  capacity: 25,  centre: [-22, 0, -34] },
          { id: 'locker-away',     kind: 'lockerRoom', label: 'Visitor Locker Room', capacity: 25, centre: [ 22, 0, -34] },
          { id: 'media-workroom',  kind: 'media',      label: 'Media Workroom',    capacity: 60,  centre: [  0, 0, -42] },
          { id: 'media-interview', kind: 'media',      label: 'Interview Room',    capacity: 80,  centre: [ 10, 0, -42] },
          { id: 'restroom-n1',     kind: 'restroom',   label: 'Restroom N1',       capacity: 40,  centre: [-14, 0, -30] },
          { id: 'restroom-n2',     kind: 'restroom',   label: 'Restroom N2',       capacity: 40,  centre: [ 14, 0, -30] },
          { id: 'restroom-s1',     kind: 'restroom',   label: 'Restroom S1',       capacity: 40,  centre: [-14, 0,  30] },
          { id: 'restroom-s2',     kind: 'restroom',   label: 'Restroom S2',       capacity: 40,  centre: [ 14, 0,  30] },
          { id: 'restroom-u1',     kind: 'restroom',   label: 'Upper Restroom E',  capacity: 30,  centre: [ 26, 14,  0] },
          { id: 'restroom-u2',     kind: 'restroom',   label: 'Upper Restroom W',  capacity: 30,  centre: [-26, 14,  0] },
          { id: 'concession-n',    kind: 'concession', label: 'North Concourse Grill', capacity: 0, centre: [  0, 0, -32] },
          { id: 'concession-e',    kind: 'concession', label: 'East Marketplace',  capacity: 0,   centre: [ 30, 0,   0] },
          { id: 'concession-w',    kind: 'concession', label: 'West Marketplace',  capacity: 0,   centre: [-30, 0,   0] },
          { id: 'concession-s',    kind: 'concession', label: 'Student Grab-and-Go', capacity: 0, centre: [  0, 0,  32] },
          { id: 'concession-club', kind: 'concession', label: 'Club Lounge Bar',   capacity: 0,   centre: [  0, 12, -22] }
        ],

        /* Entrances, emergency exits and back-of-house doors. Same contract as
         * the generated tunnels, so evacuation logic sees one uniform set. */
        accessPoints: [
          { id: 'main-entrance-n', kind: 'gate', connects: ['exterior', 'concourse-1'], capacityPerMinute: 1400, position: [  0, 0, -36] },
          { id: 'main-entrance-s', kind: 'gate', connects: ['exterior', 'concourse-1'], capacityPerMinute: 1400, position: [  0, 0,  36] },
          { id: 'student-entrance', kind: 'gate', connects: ['exterior', 'concourse-1'], capacityPerMinute: 900, position: [ 12, 0,  34] },
          { id: 'exit-ne', kind: 'emergencyExit', connects: ['concourse-1', 'exterior'], capacityPerMinute: 1100, bidirectional: false, position: [ 24, 0, -24] },
          { id: 'exit-nw', kind: 'emergencyExit', connects: ['concourse-1', 'exterior'], capacityPerMinute: 1100, bidirectional: false, position: [-24, 0, -24] },
          { id: 'exit-se', kind: 'emergencyExit', connects: ['concourse-1', 'exterior'], capacityPerMinute: 1100, bidirectional: false, position: [ 24, 0,  24] },
          { id: 'exit-sw', kind: 'emergencyExit', connects: ['concourse-1', 'exterior'], capacityPerMinute: 1100, bidirectional: false, position: [-24, 0,  24] },
          { id: 'exit-upper-e', kind: 'emergencyExit', connects: ['concourse-2', 'exterior'], capacityPerMinute: 800, bidirectional: false, position: [ 28, 14,  0] },
          { id: 'exit-upper-w', kind: 'emergencyExit', connects: ['concourse-2', 'exterior'], capacityPerMinute: 800, bidirectional: false, position: [-28, 14,  0] },
          { id: 'tunnel-home', kind: 'tunnel', connects: ['locker-home', 'court'], capacityPerMinute: 200, position: [-16, 0, -22] },
          { id: 'tunnel-away', kind: 'tunnel', connects: ['locker-away', 'court'], capacityPerMinute: 200, position: [ 16, 0, -22] },
          { id: 'tunnel-officials', kind: 'door', connects: ['officials-room', 'court'], capacityPerMinute: 60, position: [ -6, 0, -24] },
          { id: 'media-door', kind: 'door', connects: ['media-workroom', 'concourse-1'], capacityPerMinute: 120, position: [  0, 0, -38] }
        ],
        videoBoards: [
          { id: 'centre-hung', end: 'centre', width: 9, height: 5.5, y: 19 }
        ],
        ribbonBoards: [
          { id: 'lower-fascia', tier: 'lower', height: 0.9, atFront: true }
        ]
      },

      lighting: {
        preset: 'indoor',
        fixtures: {
          type: 'catwalk',
          rings: [
            { radius: 20, height: 26, count: 16 },
            { radius: 11, height: 28, count: 10 }
          ]
        }
      },

      camera: {
        orbitTarget: [0, 7, 0],
        orbitMin: 12, orbitMax: 280,
        home: [-58, 40, -64],
        spectator: { min: 16, max: 64, target: [0, 3, 0] },
        broadcast: { radius: 56, height: 18, period: 70 },
        /* The nine required presets. `freeRoam` hands control back to orbit
         * when the flight finishes; every other preset locks the view. */
        views: {
          'broadcast-center': { position: [  0, 14.5, -27 ], target: [0, 1.5, 0] },
          'mid-court':        { position: [  0,  2.2, -12 ], target: [0, 1.8, 0] },
          'baseline-left':    { position: [-19,  2.6,   0 ], target: [0, 2.6, 0] },
          'baseline-right':   { position: [ 19,  2.6,   0 ], target: [0, 2.6, 0] },
          'corner':           { position: [-15,  8.0,  15 ], target: [0, 2.0, 0] },
          'upper-bowl':       { position: [  0, 23.0,  34 ], target: [0, 1.0, 0] },
          'student-section':  { position: [  0,  5.5,  17 ], target: [0, 2.4, 0] },
          'suite':            { position: [  0, 13.0,  24 ], target: [0, 1.6, 0] },
          'free-roam':        { position: [-58, 40.0, -64 ], target: [0, 7.0, 0], freeRoam: true }
        }
      },

      seating: { pitch: 0.48, aisleHalfWidth: 0.6 },
      crowd: { fillRate: 0.92 }
    });

    this.court = COURT;

    /** AI Director integration points. Wiring only — no event logic lives
     *  here or in basketball.hooks.js; see that file's header. */
    this.hooks = BASKETBALL_HOOKS;
    this.events = VENUE_EVENTS;
  }

  /**
   * Emit a named venue event as director directives.
   * The single entry point a game feed, operator console or AI director uses.
   * @param {AIDirector} director
   * @param {string} event  one of `this.events`
   * @param {object} [payload]
   * @returns {number} directives issued, -1 if unknown
   */
  emit(director, event, payload) {
    return emitVenueEvent(director, event, payload);
  }

  /* ------------------------------------------------------------------ */

  /**
   * Courtside and the student section share numeric prefix 0, which collided
   * in the twin's zone ids (caught by the duplicate-persistentId guard — the
   * loud failure doing its job). Collegiate convention letters them instead:
   * CS1.. courtside, ST1.. student.
   */
  sectionLabel(tier, spanName, ordinal) {
    if (tier.id === 'courtside') return `CS${ordinal}`;
    if (tier.id === 'student') return `ST${ordinal}`;
    return super.sectionLabel(tier, spanName, ordinal);
  }

  /* ====================================================================
   * SEAT METADATA — per-section, precomputed, shared by reference
   *
   * `seatMetadata()` runs once per seat description and sits on the hot
   * describe() path, so it must not allocate. Every section resolves to ONE
   * frozen object built on first use; seats merge a reference to it.
   *
   * Camera visibility is per-section by decision (Option 1). The shape is
   * deliberately a plain array of preset names so a future release can swap
   * in true line-of-sight results from this same hook without any consumer
   * changing.
   * ================================================================== */

  seatMetadata({ tier, section }) {
    if (!this._seatMeta) this._seatMeta = new Map();
    let meta = this._seatMeta.get(section);
    if (meta) return meta;

    const bowl = tier.id === 'upper' ? 'upper'
               : tier.id === 'club' ? 'club'
               : tier.id === 'courtside' ? 'floor'
               : tier.id === 'student' ? 'lower'
               : 'lower';

    meta = Object.freeze({
      bowl,
      student: tier.id === 'student',
      courtside: tier.id === 'courtside',
      accessible: bowl !== 'floor',        // floor rows have no ADA path
      cameras: Object.freeze(this._camerasFor(tier))
    });
    this._seatMeta.set(section, meta);
    return meta;
  }

  /** Which presets have a clear view of a section. Coarse by design. */
  _camerasFor(tier) {
    const all = ['broadcast-center', 'mid-court', 'free-roam'];
    switch (tier.id) {
      case 'courtside': return [...all, 'baseline-left', 'baseline-right'];
      case 'student':   return [...all, 'student-section', 'corner'];
      case 'lower':     return [...all, 'baseline-left', 'baseline-right', 'corner'];
      case 'club':      return [...all, 'suite', 'corner'];
      case 'upper':     return [...all, 'upper-bowl', 'corner'];
      default:          return all;
    }
  }

  /* ==================================================================== */

  buildSurface(ctx) {
    const { group, renderer } = ctx;
    group.add(this._floor(renderer));
    this._hoops(group);
    this._benchesAndTable(group);
    this._officialsAndTunnels(group);
  }

  /**
   * Officials' area beside the scorer's table, plus the two team tunnel
   * portals and the officials' door. Geometry only — the queryable records
   * are the twin objects declared in `structure`.
   */
  _officialsAndTunnels(group) {
    const C = this.court;
    const z = -(C.width / 2 + 1.6);

    // officials' table: shorter, offset from the scorer's table
    const dark = new THREE.MeshStandardMaterial({ color: 0x14181e, roughness: 0.7 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.78, 0.7), dark);
    table.position.set(-6.0, 0.39, z - 0.9);
    group.add(table);
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x2b3440, roughness: 0.6 });
    for (const dx of [-0.8, 0, 0.8]) {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.85, 0.5), chairMat);
      ch.position.set(-6.0 + dx, 0.42, z - 1.7);
      group.add(ch);
    }

    // tunnel portals behind the bench sideline
    const portalMat = new THREE.MeshStandardMaterial({ color: 0x090c10, roughness: 1 });
    const jamb = new THREE.MeshStandardMaterial({ color: 0x8f2233, roughness: 0.55 });
    for (const [x, name] of [[-16, 'tunnel-home'], [16, 'tunnel-away']]) {
      const mouth = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.4), portalMat);
      mouth.position.set(x, 1.7, z - 2.6);
      mouth.name = name;
      group.add(mouth);
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.6, 0.35), jamb);
        post.position.set(x + s * 2.28, 1.8, z - 2.6);
        group.add(post);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.35, 0.35), jamb);
      lintel.position.set(x, 3.6, z - 2.6);
      group.add(lintel);
    }
  }

  /** Team benches flanking a scorer's table on the sideline, as required. */
  _benchesAndTable(group) {
    const C = this.court;
    const z = -(C.width / 2 + 1.6);          // scorer's-table sideline

    const tableMat = new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 0.6 });
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x061018, emissive: 0x2f7fa8, emissiveIntensity: 1.6, roughness: 1
    });
    const table = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.8, 0.8), tableMat);
    table.position.set(0, 0.4, z);
    group.add(table);
    const led = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 0.5), ledMat);
    led.position.set(0, 0.45, z + 0.42);
    group.add(led);

    const seatMat = new THREE.MeshStandardMaterial({ color: 0x8f2233, roughness: 0.55 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, metalness: 0.7, roughness: 0.4 });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const x = side * (6.6 + i * 0.72);
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.55), seatMat);
        chair.position.set(x, 0.45, z);
        group.add(chair);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), legMat);
        leg.position.set(x, 0.2, z);
        group.add(leg);
      }
    }
  }

  _floor(renderer) {
    const C = this.court;
    const W = 2048, H = Math.round(W * C.width / C.length);
    const m2p = W / C.length;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');

    // hardwood
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#b8823f'); grad.addColorStop(0.5, '#c9924a'); grad.addColorStop(1, '#b07a38');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.10;
    for (let i = 0; i < 120; i++) {
      g.fillStyle = i % 2 ? '#000' : '#fff';
      g.fillRect(0, (i / 120) * H, W, 1.5);
    }
    g.globalAlpha = 1;

    g.strokeStyle = '#f7f9fa'; g.lineWidth = 5;
    g.strokeRect(6, 6, W - 12, H - 12);
    g.beginPath(); g.moveTo(W / 2, 6); g.lineTo(W / 2, H - 6); g.stroke();
    g.beginPath(); g.arc(W / 2, H / 2, 1.83 * m2p, 0, Math.PI * 2); g.stroke();

    [0, 1].forEach(side => {
      const sx = side ? W : 0, dir = side ? -1 : 1;
      // key
      g.strokeRect(sx + dir * 6, H / 2 - (C.keyWidth / 2) * m2p,
                   dir * C.keyLength * m2p, C.keyWidth * m2p);
      // free-throw circle
      g.beginPath();
      g.arc(sx + dir * C.keyLength * m2p, H / 2, 1.83 * m2p, 0, Math.PI * 2);
      g.stroke();
      // three-point arc
      g.beginPath();
      g.arc(sx + dir * 1.575 * m2p, H / 2, C.threePoint * m2p,
            side ? Math.PI * 0.5 : -Math.PI * 0.5, side ? Math.PI * 1.5 : Math.PI * 0.5);
      g.stroke();
    });

    g.save(); g.translate(W / 2, H / 2);
    g.fillStyle = 'rgba(247,249,250,.9)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${Math.round(H * 0.16)}px Impact, "Arial Narrow", sans-serif`;
    g.fillText('ARENA', 0, 0); g.restore();

    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(C.length, C.width);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.32, metalness: 0.05
    }));
    m.position.y = 0.02;
    m.receiveShadow = true;
    m.name = 'playing-surface';
    return m;
  }

  _hoops(group) {
    const C = this.court;
    const steel = new THREE.MeshStandardMaterial({ color: 0xc2ccd2, roughness: 0.4, metalness: 0.7 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0xcfe6f2, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.42
    });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe8622a, roughness: 0.45, metalness: 0.5 });

    [-1, 1].forEach(s => {
      const x = s * (C.length / 2 + 1.2);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 4.2, 8), steel);
      post.position.set(x + s * 1.1, 2.1, 0);
      post.castShadow = true;
      group.add(post);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.18), steel);
      arm.position.set(x + s * 0.4, 3.6, 0);
      group.add(arm);

      const board = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 1.8), glass);
      board.position.set(x - s * 0.2, 3.5, 0);
      group.add(board);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.229, 0.02, 8, 20), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(x - s * 0.42, C.rimHeight, 0);
      group.add(rim);
    });
  }
}

export default BasketballArena;
