/**
 * CoogPawsLounge
 * ---------------------------------------------------------------------------
 * The first immersive LOUNGE venue, and the template for every lounge that
 * follows (cougar dens, alumni lounges, premium rooms, event lounges).
 *
 * A lounge is not a small stadium. A stadium seats tens of thousands facing a
 * real playing surface; a lounge seats eight facing a PROJECTION of one. The
 * engine already supports both without knowing the difference, because a venue
 * supplies geometry, seating configuration and camera presets and nothing
 * else — so this file is a `VenueDefinition` like any other, and every engine
 * subsystem (seat manifest, twin registry, avatars, persistence, claiming,
 * camera flight) works here unchanged.
 *
 * WHY THE SEATS GO THROUGH THE SEAT MANAGER
 * -----------------------------------------
 * It would be less code to draw eight chairs and track occupancy in a local
 * array. That was rejected. Seats built by `SeatManager` get persistent ids,
 * twin objects, claim/release, cross-session ownership through the
 * persistence adapter, avatar placement and `gotoSeat()` camera flight for
 * free. A local array would need all of it rebuilt, would not survive a
 * rebuild, and would make the lounge the one venue where seating behaves
 * differently. The tier below is therefore tuned to produce EXACTLY eight
 * seats from real geometry rather than a hard-coded count — capacity is
 * measured here exactly as it is everywhere else (ADR-016).
 *
 * The tuning: a near-circular plan (core ≈ 0, so the corner arcs close into a
 * circle of radius `cornerRadius + d`), one row, eight sections, and a seat
 * pitch wide enough that each section yields one recliner and no more.
 *
 * NO LICENSED CONTENT. The projections are generic sport surfaces built from
 * primitives — dimensions are the public rules-of-the-game measurements. No
 * marks, names, logos, colours or likenesses of any real team or league.
 */

import * as THREE from 'three';
import VenueDefinition from './VenueDefinition.js';
import HolographicCenterpiece from '../objects/HolographicCenterpiece.js';

/* The chair ring. Everything else is positioned relative to this. */
const RING_RADIUS = 4.3;
const CHAIR_COUNT = 8;
const ROOM_RADIUS = 9.2;
const ROOM_HEIGHT = 6.5;
const HOLO_CENTRE = new THREE.Vector3(0, 2.35, 0);

/* Palette. Cinema-house materials — velvet and brass — against a dark room,
 * so the projection is the brightest thing present. */
const C = {
  carpet: 0x140e22,
  wall: 0x1c1230,
  ceiling: 0x0e0919,
  velvet: 0x6e1b2e,
  piping: 0x3d0f1c,
  frame: 0x1a1426,
  brass: 0xc9a227,
  amber: 0xffb067,
  rose: 0xff5f9e,
  ice: 0x7ce0ff,
  turf: 0x1d5c34,
  hardwood: 0xb07a3c,
  clay: 0xa5543a
};

/**
 * The permanent visual identity of this lounge: three sport balls orbiting the
 * projector like a planetary system, each turning on its own axis.
 *
 * This replaced a switchable field/court/diamond projection. That version made
 * the room ask a question — pick a sport — when the point of Coog Paws is that
 * it is ALL of them. Three balls in one orbit says so with no control to press
 * and nothing to read, which is why there is no projection selector any more.
 *
 * Declared as data. The orbit, shader, particles and lifecycle belong to
 * `objects/HolographicCenterpiece.js`, so a future lounge configures a trophy
 * or a mascot the same way without touching engine or venue geometry.
 *
 * Generic equipment only. No marks, names, logos or livery of any real team,
 * league or manufacturer.
 */
const CENTERPIECE = {
  height: 2.35,
  radius: 1.15,
  period: 30,          // a full orbit every half minute — present, not busy
  tilt: 0.22,
  spin: 0.55,
  particleCount: 260,
  objects: [
    // A football is a prolate spheroid, not a squashed sphere.
    { shape: 'spheroid', radius: 0.26, elongation: 1.6, tint: 0xc4703a, accent: 0xffd9a0, detail: 'laces' },
    { shape: 'sphere',   radius: 0.27, tint: 0xff8a3c, accent: 0xffd9a0, detail: 'panels' },
    { shape: 'sphere',   radius: 0.22, tint: 0xf2f2f2, accent: 0xff5f9e, detail: 'seams' },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════
 * Geometry helpers — local, allocation-conscious, no engine imports.
 * ═══════════════════════════════════════════════════════════════════════ */

/** Line geometry from a flat list of [x,z] pairs, laid on the XZ plane. */
function flatLine(points, y = 0) {
  const positions = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    positions[i * 3] = points[i][0];
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = points[i][1];
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function circlePoints(radius, segments = 48) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    points.push([Math.cos(t) * radius, Math.sin(t) * radius]);
  }
  return points;
}

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** A soft upholstered box. Bevelled extrusion reads as a cushion; a plain
 *  BoxGeometry reads as a crate, and at eight chairs the difference is the
 *  whole impression of the room. */
function cushionGeometry(w, h, d, r) {
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), {
    depth: d - r,
    bevelEnabled: true,
    bevelThickness: r * 0.55,
    bevelSize: r * 0.55,
    bevelSegments: 3,
    curveSegments: 6
  });
  geometry.center();
  return geometry;
}

/** Line geometry from a flat list of [x,z] pairs, laid on the XZ plane. */
/* ═══════════════════════════════════════════════════════════════════════
 * The holographic material.
 *
 * Deliberately NOT a solid miniature. Fresnel edge emphasis, travelling scan
 * lines and additive blending read as projected light rather than a painted
 * model — the brief's distinction, and the reason this is a shader rather
 * than a MeshStandardMaterial with emissive turned up.
 * ═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
 * THE VENUE
 * ═══════════════════════════════════════════════════════════════════════ */

export class CoogPawsLounge extends VenueDefinition {
  constructor() {
    super({
      id: 'coogpaws',
      label: 'Coog Paws Lounge',
      category: 'lounge',

      /* Near-circular plan: with core ≈ 0 the four corner arcs close into a
       * circle of radius `cornerRadius + d`, which is what puts the chair ring
       * at RING_RADIUS once treadOffset is added. */
      footprint: { coreX: 0.001, coreZ: 0.001, cornerRadius: 3.6, referenceRadius: 4.0 },

      tiers: [
        {
          id: 'lounge',
          label: 'Lounge Ring',
          sectionPrefix: 0,
          d0: 0.4, d1: 0.6,
          y0: 0.0, y1: 0.0,
          rows: 1,
          spans: 'full',
          sectionsPerSpan: CHAIR_COUNT,
          vip: true,
          basePrice: 0
        }
      ],

      /* A recliner is three times the width of a stadium seat, and the wide
       * pitch is also what limits each section to exactly one of them. */
      seating: { pitch: 1.5, aisleHalfWidth: 0.68, treadOffset: 0.30 },

      /* No crowd simulation in a lounge — the occupants are real users. */
      crowd: { enabled: false, density: 0 },

      /* And no simulated NETWORK occupants either. The stadium mock seeds 40
       * synthetic spectators; this room has eight chairs and its roster comes
       * from the real /lounge namespace. Zero means zero: no seeding, no
       * joins, no departures, no timers. */
      simulation: { initialUsers: 0, joinsPerMinute: 0, leavesPerMinute: 0 },

      lighting: {
        preset: 'indoor',
        fixtures: {
          type: 'catwalk',
          rings: [{ radius: 6.2, height: 5.9, count: 8 }]
        }
      },

      camera: {
        orbitTarget: [0, 1.7, 0],
        orbitMin: 2.6,
        orbitMax: 16,
        home: [0, 3.4, 9.6],
        spectator: { min: 2.4, max: 9, target: [0, 1.7, 0] },
        broadcast: { radius: 7.4, height: 3.2, period: 48 },
        views: {
          'lounge-home': { position: [0, 3.4, 9.6], target: [0, 1.7, 0], freeRoam: true, seconds: 1.6 },
          'projector': { position: [0, 2.9, 3.6], target: HOLO_CENTRE.toArray(), seconds: 1.4 },
          'overhead': { position: [0, 8.4, 0.01], target: [0, 0.6, 0], seconds: 1.8 },
          'free-roam': { position: [0, 3.4, 9.6], target: [0, 1.7, 0], freeRoam: true, seconds: 1.4 }
        }
      }
    });

    /* Presentation state. Mutable, non-persisted, never an access decision. */
    this._houseLights = false;

    /* Populated during buildSurface, read during update. */
    this._centerpiece = null;
    this._beamMaterial = null;
    this._dust = null;
    this._dustSeeds = null;
    this._sconces = [];
    this._ambient = null;
    this._projectorLight = null;
    this._seatMeta = null;
  }

  /* ── seating identity ─────────────────────────────────────────────── */

  /** One ring, so a bare ordinal reads better than a stadium section code. */
  sectionLabel(tier, spanName, ordinal) {
    return `L${ordinal + 1}`;
  }

  /** The lounge is free to enter; commerce belongs to the application. */
  seatPrice() { return 0; }

  /**
   * Shared per section — see the cost contract in VENUE-AUTHORING.md. Eight
   * sections means eight frozen objects for the lifetime of the venue.
   */
  seatMetadata(ctx) {
    if (!this._seatMeta) this._seatMeta = new Map();
    const key = String(ctx.section);
    const existing = this._seatMeta.get(key);
    if (existing) return existing;
    const meta = Object.freeze({
      lounge: true,
      recliner: true,
      accessible: true,
      cameras: Object.freeze(['lounge-home', 'projector', 'overhead'])
    });
    this._seatMeta.set(key, meta);
    return meta;
  }

  /* ── presentation options (ADR-020) ───────────────────────────────── */

  options() {
    return [
      { key: 'houseLights', label: 'House lights', kind: 'toggle', value: this._houseLights },
    ];
  }

  setOption(key, value) {
    if (key === 'houseLights') {
      this._houseLights = value === true || value === 'true';
      return true;
    }
    return false;
  }

  /* ── the room ─────────────────────────────────────────────────────── */

  buildSurface(ctx) {
    const group = ctx.group;

    this._buildRoom(group);
    this._buildChairs(group);
    this._buildProjector(group);

    /* The centerpiece is engine-owned. The venue declares it and nothing more. */
    this._centerpiece = new HolographicCenterpiece(CENTERPIECE, group);
  }

  _buildRoom(group) {
    const carpet = new THREE.Mesh(
      new THREE.CircleGeometry(ROOM_RADIUS, 64),
      new THREE.MeshStandardMaterial({ color: C.carpet, roughness: 1 })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.receiveShadow = true;
    group.add(carpet);

    /* Concentric aisle rings. Cheap (four line loops) and they give the floor
     * a readable scale that a flat disc does not. */
    for (let i = 0; i < 4; i++) {
      const radius = 2.2 + i * 1.85;
      const ring = new THREE.Line(
        flatLine(circlePoints(radius, 72), 0.012),
        new THREE.LineBasicMaterial({ color: C.brass, transparent: true, opacity: 0.13 - i * 0.02 })
      );
      group.add(ring);
    }

    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(ROOM_RADIUS, ROOM_RADIUS, ROOM_HEIGHT, 48, 1, true),
      new THREE.MeshStandardMaterial({ color: C.wall, roughness: 0.94, side: THREE.BackSide })
    );
    wall.position.y = ROOM_HEIGHT / 2;
    group.add(wall);

    const ceiling = new THREE.Mesh(
      new THREE.CircleGeometry(ROOM_RADIUS, 48),
      new THREE.MeshStandardMaterial({ color: C.ceiling, roughness: 1 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM_HEIGHT;
    group.add(ceiling);

    /* Brass fluting and sconces. One shared geometry and two shared materials
     * across 16 fins — instancing would be overkill at this count, but a fresh
     * geometry per fin would not be. */
    const finGeometry = new THREE.BoxGeometry(0.07, ROOM_HEIGHT - 0.3, 0.22);
    const brass = new THREE.MeshStandardMaterial({ color: C.brass, roughness: 0.26, metalness: 1 });
    const shadeGeometry = new THREE.CylinderGeometry(0.11, 0.17, 0.34, 12, 1, true);

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const fin = new THREE.Mesh(finGeometry, brass);
      fin.position.set(
        Math.cos(angle) * (ROOM_RADIUS - 0.16),
        ROOM_HEIGHT / 2,
        Math.sin(angle) * (ROOM_RADIUS - 0.16)
      );
      fin.rotation.y = -angle;
      group.add(fin);

      if (i % 2 === 0) {
        /* Each sconce needs its own material because house lights drive
         * `emissive` per fixture; the geometry is still shared. */
        const shade = new THREE.Mesh(shadeGeometry, new THREE.MeshStandardMaterial({
          color: 0x2a1a12, emissive: 0x000000, roughness: 0.7, side: THREE.DoubleSide
        }));
        shade.position.set(
          Math.cos(angle) * (ROOM_RADIUS - 0.42), 2.5, Math.sin(angle) * (ROOM_RADIUS - 0.42)
        );
        group.add(shade);
        this._sconces.push(shade.material);
      }
    }

    /* Ambient and projector fill. The lighting preset handles the room; these
     * two are what the house-lights control moves between. */
    this._ambient = new THREE.AmbientLight(0x40305a, 0.55);
    group.add(this._ambient);

    this._projectorLight = new THREE.PointLight(C.amber, 2.6, 16, 2);
    this._projectorLight.position.copy(HOLO_CENTRE);
    group.add(this._projectorLight);
  }

  /**
   * Eight recliners on the same ring the seat manifest produces, each turned
   * to face the projector. The chairs are decoration over real seats: the
   * geometry here and the claimable seat at the same angle are the same
   * position by construction, not by coincidence.
   */
  _buildChairs(group) {
    /* Shared across all eight chairs — eight identical recliners should cost
     * one set of geometries and materials, not eight. */
    const velvet = new THREE.MeshStandardMaterial({ color: C.velvet, roughness: 0.96 });
    const piping = new THREE.MeshStandardMaterial({ color: C.piping, roughness: 0.85 });
    const frame = new THREE.MeshStandardMaterial({ color: C.frame, roughness: 0.55, metalness: 0.45 });
    const brass = new THREE.MeshStandardMaterial({ color: C.brass, roughness: 0.26, metalness: 1 });
    const glow = new THREE.MeshBasicMaterial({ color: C.amber });

    const parts = {
      plinth: cushionGeometry(1.00, 0.18, 1.05, 0.05),
      trim: new THREE.BoxGeometry(0.98, 0.02, 1.03),
      seat: cushionGeometry(0.86, 0.26, 0.88, 0.11),
      back: cushionGeometry(0.86, 0.92, 0.26, 0.11),
      head: cushionGeometry(0.62, 0.30, 0.24, 0.10),
      seam: cushionGeometry(0.80, 0.03, 0.02, 0.01),
      arm: cushionGeometry(0.18, 0.24, 0.94, 0.08),
      foot: cushionGeometry(0.78, 0.14, 0.38, 0.06),
      ring: new THREE.TorusGeometry(0.052, 0.011, 6, 18),
      well: new THREE.CylinderGeometry(0.05, 0.045, 0.06, 12),
      strip: new THREE.PlaneGeometry(0.62, 0.035)
    };

    const buildChair = () => {
      const chair = new THREE.Group();
      const add = (geometry, material, x, y, z, rotX = 0) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.rotation.x = rotX;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        chair.add(mesh);
        return mesh;
      };

      add(parts.plinth, frame, 0, 0.10, -0.02);
      add(parts.trim, brass, 0, 0.20, -0.02);
      add(parts.seat, velvet, 0, 0.40, 0.06);
      add(parts.back, velvet, 0, 0.90, -0.40, -0.16);
      add(parts.head, velvet, 0, 1.40, -0.53, -0.16);
      add(parts.seam, piping, 0, 0.94, -0.28, -0.16);
      add(parts.foot, velvet, 0, 0.28, 0.62);

      for (const side of [-1, 1]) {
        add(parts.arm, velvet, side * 0.52, 0.62, 0.02);
        const ring = new THREE.Mesh(parts.ring, brass);
        ring.position.set(side * 0.52, 0.745, -0.16);
        ring.rotation.x = Math.PI / 2;
        chair.add(ring);
        const well = new THREE.Mesh(parts.well, frame);
        well.position.set(side * 0.52, 0.715, -0.16);
        chair.add(well);
      }

      const strip = new THREE.Mesh(parts.strip, glow);
      strip.position.set(0, 0.055, 0.53);
      strip.rotation.x = -Math.PI / 2.02;
      chair.add(strip);

      return chair;
    };

    for (let i = 0; i < CHAIR_COUNT; i++) {
      const angle = (i / CHAIR_COUNT) * Math.PI * 2;
      const chair = buildChair();
      chair.position.set(Math.sin(angle) * RING_RADIUS, 0, Math.cos(angle) * RING_RADIUS);
      chair.rotation.y = angle + Math.PI;   // +Z is the chair's forward; face the centre
      group.add(chair);
    }
  }

  _buildProjector(group) {
    const frame = new THREE.MeshStandardMaterial({ color: C.frame, roughness: 0.55, metalness: 0.45 });
    const brass = new THREE.MeshStandardMaterial({ color: C.brass, roughness: 0.26, metalness: 1 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.34, 36), frame);
    base.position.y = 0.17;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.05, 36), brass);
    collar.position.y = 0.36;
    group.add(collar);

    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.78, 36),
      new THREE.MeshBasicMaterial({ color: C.amber, transparent: true, opacity: 0.85 })
    );
    lens.rotation.x = -Math.PI / 2;
    lens.position.y = 0.39;
    group.add(lens);

    /* The beam. Its own shader rather than the hologram's — it fades along the
     * cone rather than reacting to view angle. */
    this._beamMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uNear: { value: new THREE.Color(C.amber) },
        uFar: { value: new THREE.Color(C.rose) },
        uStrength: { value: 1 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vNormalView = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uNear;
        uniform vec3 uFar;
        uniform float uStrength;
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          float edge = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 1.4);
          float fade = pow(1.0 - vUv.y, 1.9);
          float band = 0.5 + 0.5 * sin(vUv.y * 22.0 - uTime * 1.3);
          gl_FragColor = vec4(mix(uNear, uFar, vUv.y * 0.8),
                              fade * edge * (0.30 + 0.18 * band) * uStrength);
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.85, 0.9, 2.9, 36, 1, true),
      this._beamMaterial
    );
    beam.position.y = 1.86;
    group.add(beam);

    /* Dust in the beam. 500 points is the mobile budget; the drift is done on
     * the CPU because the buffer is small and a shader would cost a program. */
    const count = 500;
    const positions = new Float32Array(count * 3);
    this._dustSeeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * 1.8;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 3.4 + 0.4;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      this._dustSeeds[i] = Math.random();
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
      color: 0xe8c86a, size: 0.022, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    group.add(this._dust);
  }

  /* ── lifecycle ────────────────────────────────────────────────────── */

  onBuilt() { /* nothing to do — the centerpiece starts itself */ }

  /**
   * Per-frame venue animation. Everything here is O(1) except the dust drift,
   * which is 500 floats — deliberately the entire per-frame cost of the room.
   */
  update(dt, elapsed) {
    /* One call drives the whole orbit, the per-object spin, the flicker and
     * the particles. */
    if (this._centerpiece) this._centerpiece.update(dt, elapsed);

    const flicker = 0.9 + Math.sin(elapsed * 37) * 0.03 + Math.sin(elapsed * 9.1) * 0.05;

    if (this._beamMaterial) {
      this._beamMaterial.uniforms.uTime.value = elapsed;
      const target = this._houseLights ? 0.35 : 1;
      const strength = this._beamMaterial.uniforms.uStrength;
      strength.value += (target - strength.value) * Math.min(1, dt * 3);
    }

    if (this._projectorLight) {
      this._projectorLight.intensity = (this._houseLights ? 1.3 : 2.6) * flicker;
      /* The room takes its colour from whichever object leads the orbit, so
       * the hologram casts light into the lounge rather than floating in it. */
      if (this._centerpiece) this._projectorLight.color.setHex(this._centerpiece.lightTint());
    }

    if (this._ambient) {
      const target = this._houseLights ? 1.5 : 0.55;
      this._ambient.intensity += (target - this._ambient.intensity) * Math.min(1, dt * 3);
    }

    /* Sconces rise and fall with the house lights. */
    if (this._sconces.length) {
      const level = this._houseLights ? 1 : 0;
      for (const material of this._sconces) {
        const current = material.emissive.r / 0.55 || 0;
        const next = current + (level - current) * Math.min(1, dt * 3);
        material.emissive.setRGB(0.55 * next, 0.34 * next, 0.15 * next);
      }
    }

    if (this._dust) {
      const positions = this._dust.geometry.attributes.position.array;
      for (let i = 0; i < this._dustSeeds.length; i++) {
        positions[i * 3 + 1] += (0.06 + this._dustSeeds[i] * 0.12) * dt;
        if (positions[i * 3 + 1] > 4) positions[i * 3 + 1] = 0.3;
      }
      this._dust.geometry.attributes.position.needsUpdate = true;
    }
  }
}

export default CoogPawsLounge;
