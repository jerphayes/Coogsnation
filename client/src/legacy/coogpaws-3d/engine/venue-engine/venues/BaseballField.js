/**
 * BaseballField
 * ---------------------------------------------------------------------------
 * A generic collegiate ballpark, 3,000–5,000 seats. Original design; no real
 * facility referenced, no marks.
 *
 * This venue exists on the FanFootprint — the open offset-V plan — and is the
 * proof that the footprint seam holds for asymmetric venues: SeatManager,
 * CrowdManager, the twin and the director all run here unmodified.
 *
 * Layout: home plate at the origin, center field along +X. The grandstand
 * wraps from beyond third base (+Z), behind home, to beyond first base (−Z).
 */

import * as THREE from 'three';
import VenueDefinition from './VenueDefinition.js';

const FIELD = {
  baseline: 27.43,          // 90 ft between bases
  moundDist: 18.44,         // 60'6"
  infieldRadius: 29,        // dirt arc from the mound
  foulLine: 100.6,          // 330 ft down the lines
  centerField: 121.9,       // 400 ft
  wallHeight: 3.0,
  warningTrack: 4.5
};

export class BaseballField extends VenueDefinition {
  constructor() {
    super({
      id: 'baseball',
      label: 'Generic Ballpark',
      category: 'baseball',

      /* The open plan. `kind: 'fan'` routes createFootprint() to FanFootprint. */
      footprint: { kind: 'fan', backstop: 16, baseline: 52, referenceRadius: 16 },

      tiers: [
        {
          id: 'field', label: 'Field Boxes', sectionPrefix: 0,
          d0: 1.2, d1: 6.5, y0: 0.9, y1: 3.6, rows: 7,
          spans: 'full', sectionsPerSpan: 18, vip: true, basePrice: 28
        },
        {
          id: 'main', label: 'Grandstand', sectionPrefix: 100,
          d0: 8, d1: 18, y0: 4.8, y1: 10.8, rows: 12,
          spans: 'full', sectionsPerSpan: 16, vip: false, basePrice: 14
        },
        {
          id: 'club', label: 'Home Plate Club', sectionPrefix: 200,
          d0: 19.5, d1: 23.5, y0: 12, y1: 14.4, rows: 4,
          spans: ['home'], sectionsPerSpan: 6, vip: true, basePrice: 55
        }
      ],

      structure: {
        facade: { offset: 21, height: 12.5, portals: 10, portalHeight: 5 },
        concourse: { level1: 5.5, level2: 11, width: 7 },
        suites: { span: 'plate', offset: 20, y0: 10.8, y1: 13.4 },
        pressBox: { span: 'plate', centreFraction: [0.3, 0.7], d0: 24, d1: 31, y0: 13.5, y1: 18.5 },
        tunnels: { count: 6, width: 3.4, height: 4.0, atRow: 0.5 },
        approach: { poleLights: 10, radius: [90, 200] },
        parking: {
          lots: [
            { id: 'GA', spaces: 900, rows: 18, origin: [-140, 0, 60] },
            { id: 'RES', spaces: 350, rows: 10, origin: [-120, 0, -90], accessibleRatio: 0.05 }
          ]
        },
        videoBoards: [
          /* Explicit placement — "north end" means nothing on an open plan.
           * The board stands in left-center, facing home plate. */
          { id: 'centerfield', width: 16, height: 9,
            position: [108, 14, 34], facing: [0, 2, 0] }
        ],
        ribbonBoards: [
          { id: 'grandstand-fascia', tier: 'main', height: 0.8, atFront: true }
        ]
      },

      lighting: {
        preset: 'night',
        fixtures: {
          /* Six poles ringing fair territory, collegiate pattern. */
          type: 'poles', height: 27,
          positions: [
            [-24, 34], [-24, -34],          // behind the grandstand wings
            [52, 78], [52, -78],            // outfield foul-side pair
            [118, 42], [118, -42]           // center field pair
          ]
        }
      },

      camera: {
        orbitTarget: [34, 4, 0],
        orbitMin: 14, orbitMax: 380,
        home: [-64, 46, -70],
        spectator: { min: 18, max: 90, target: [20, 2, 0] },
        broadcast: { radius: 95, height: 26, period: 80 },
        /* Named views for the director and future UI. */
        views: {
          'press-level':   { position: [-26, 17, 0],  target: [30, 1, 0] },
          'high-home':     { position: [-30, 24, 0],  target: [60, 0, 0] },
          'first-dugout':  { position: [14, 2.2, -16], target: [0, 1, 0] },
          'center-field':  { position: [118, 6, 0],   target: [0, 1.5, 0] }
        }
      },

      seating: { pitch: 0.52, aisleHalfWidth: 0.62 },
      crowd: { fillRate: 0.78 }
    });

    this.field = FIELD;
  }

  /* ==================================================================== */

  buildSurface(ctx) {
    const { group, renderer } = ctx;
    group.add(this._grass(renderer));
    this._foulPoles(group);
    this._outfieldWall(group);
    this._dugouts(group);
    this._bullpens(group);
  }

  /**
   * One canvas for the whole playing field: grass, dirt arc, basepaths, mound,
   * foul lines, warning track. Painting it in 2D is far cheaper than composing
   * meshes, and at field scale a single 2048² texture reads cleanly.
   */
  _grass(renderer) {
    const F = this.field;
    const EXT = F.centerField + 12;          // canvas covers to beyond the wall
    const W = 2048, H = 2048;
    const m2p = W / (EXT * 2);
    const cx = W * 0.28, cy = H / 2;         // home plate, biased so CF fits
    const P = (x, z) => [cx + x * m2p, cy - z * m2p];

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');

    // outfield grass with mow stripes radiating from home
    g.fillStyle = '#1c5137'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 18; i++) {
      if (i % 2) continue;
      g.beginPath();
      g.moveTo(...P(0, 0));
      const a0 = -Math.PI / 4 + (i / 18) * (Math.PI / 2);
      const a1 = -Math.PI / 4 + ((i + 1) / 18) * (Math.PI / 2);
      g.arc(...P(0, 0), F.centerField * m2p, -a0, -a1, true);
      g.closePath();
      g.fillStyle = 'rgba(255,255,255,0.045)';
      g.fill();
    }

    const dirt = '#9a6b43', dirtEdge = '#8a5d38';

    // warning track: annulus just inside the wall
    g.strokeStyle = dirt;
    g.lineWidth = F.warningTrack * m2p;
    g.beginPath();
    g.arc(...P(0, 0), (F.centerField - F.warningTrack / 2) * m2p, -Math.PI / 4 - 0.04, Math.PI / 4 + 0.04, false);
    g.stroke();

    // infield dirt: arc of radius infieldRadius about the mound, squared to the basepaths
    const mound = [F.moundDist, 0];
    g.fillStyle = dirt;
    g.beginPath();
    g.arc(...P(...mound), F.infieldRadius * m2p, 0, Math.PI * 2);
    g.fill();

    // infield grass diamond inside the basepaths
    const base = F.baseline;
    const first = [base * Math.SQRT1_2, -base * Math.SQRT1_2];
    const second = [base * Math.SQRT2, 0];
    const third = [base * Math.SQRT1_2, base * Math.SQRT1_2];
    const inset = 3.2;
    g.fillStyle = '#237a4a';
    g.beginPath();
    g.moveTo(...P(inset, 0));
    g.lineTo(...P(first[0], first[1] + inset));
    g.lineTo(...P(second[0] - inset, 0));
    g.lineTo(...P(third[0], third[1] - inset));
    g.closePath();
    g.fill();

    // basepaths
    g.strokeStyle = dirtEdge; g.lineWidth = 2.2 * m2p;
    g.beginPath();
    g.moveTo(...P(0, 0)); g.lineTo(...P(...first)); g.lineTo(...P(...second));
    g.lineTo(...P(...third)); g.closePath(); g.stroke();

    // mound and home circle
    g.fillStyle = dirtEdge;
    g.beginPath(); g.arc(...P(...mound), 2.7 * m2p, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(...P(0, 0), 3.9 * m2p, 0, Math.PI * 2); g.fill();

    // bases
    g.fillStyle = '#f4f6f7';
    for (const b of [first, second, third]) {
      g.save(); g.translate(...P(...b)); g.rotate(Math.PI / 4);
      g.fillRect(-0.55 * m2p, -0.55 * m2p, 1.1 * m2p, 1.1 * m2p);
      g.restore();
    }
    // home plate
    g.save(); g.translate(...P(0, 0));
    g.beginPath();
    g.moveTo(-0.55 * m2p, -0.4 * m2p); g.lineTo(0.55 * m2p, -0.4 * m2p);
    g.lineTo(0.55 * m2p, 0.15 * m2p); g.lineTo(0, 0.6 * m2p); g.lineTo(-0.55 * m2p, 0.15 * m2p);
    g.closePath(); g.fill(); g.restore();

    // foul lines to the poles
    g.strokeStyle = '#f4f6f7'; g.lineWidth = 0.35 * m2p;
    for (const s of [1, -1]) {
      g.beginPath();
      g.moveTo(...P(1.2 * Math.SQRT1_2, s * 1.2 * Math.SQRT1_2));
      g.lineTo(...P(F.foulLine * Math.SQRT1_2, s * F.foulLine * Math.SQRT1_2));
      g.stroke();
    }
    // batter's boxes
    g.lineWidth = 0.18 * m2p;
    g.strokeRect(...P(-0.4, 1.0), 1.6 * m2p, 1.3 * m2p);
    g.strokeRect(...P(-0.4, -2.3), 1.6 * m2p, 1.3 * m2p);

    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.PlaneGeometry(EXT * 2, EXT * 2);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    // shift so home plate (canvas cx) sits at the world origin
    mesh.position.set(EXT - (2 * EXT) * 0.28, 0.02, 0);
    mesh.receiveShadow = true;
    mesh.name = 'playing-surface';
    return mesh;
  }

  _foulPoles(group) {
    const F = this.field;
    const mat = new THREE.MeshStandardMaterial({ color: 0xe8c73a, roughness: 0.4, metalness: 0.6 });
    const geo = new THREE.CylinderGeometry(0.12, 0.15, 12, 8);
    for (const s of [1, -1]) {
      const pole = new THREE.Mesh(geo, mat);
      pole.position.set(F.foulLine * Math.SQRT1_2, 6, s * F.foulLine * Math.SQRT1_2);
      pole.castShadow = true;
      group.add(pole);
    }
  }

  /** Curved wall from foul pole to foul pole, with padding colour. */
  _outfieldWall(group) {
    const F = this.field;
    const seg = 64, pts = [];
    for (let i = 0; i <= seg; i++) {
      const a = -Math.PI / 4 + (i / seg) * (Math.PI / 2);
      pts.push(new THREE.Vector3(Math.cos(a) * F.centerField, 0, Math.sin(a) * F.centerField));
    }
    const shape = new THREE.BufferGeometry();
    const v = [], idx = [];
    pts.forEach((p, i) => {
      v.push(p.x, 0, p.z, p.x, F.wallHeight, p.z);
      if (i < seg) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    });
    shape.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    shape.setIndex(idx);
    shape.computeVertexNormals();
    const wall = new THREE.Mesh(shape, new THREE.MeshStandardMaterial({
      color: 0x14401f, roughness: 0.9, side: THREE.DoubleSide
    }));
    wall.name = 'outfield-wall';
    group.add(wall);

    const capGeo = new THREE.CylinderGeometry(0.14, 0.14, 1, 6);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xd9dde0, roughness: 0.5 });
    for (let i = 0; i <= seg; i += 8) {
      const p = pts[i];
      const post = new THREE.Mesh(capGeo, capMat);
      post.scale.y = F.wallHeight + 0.4;
      post.position.set(p.x, (F.wallHeight + 0.4) / 2, p.z);
      group.add(post);
    }
  }

  /** Sunken dugouts along each baseline, facing the field. */
  _dugouts(group) {
    const shell = new THREE.MeshStandardMaterial({ color: 0x22282f, roughness: 0.85 });
    const bench = new THREE.MeshStandardMaterial({ color: 0x51330f, roughness: 0.8 });
    for (const s of [1, -1]) {
      const grp = new THREE.Group();
      grp.name = s > 0 ? 'dugout-third' : 'dugout-first';

      const box = new THREE.Mesh(new THREE.BoxGeometry(11, 2.4, 3.4), shell);
      box.position.y = 1.2;
      grp.add(box);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.25, 3.8), shell);
      roof.position.y = 2.55;
      grp.add(roof);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.35, 0.6), bench);
      seat.position.set(0, 0.55, -1.1);
      grp.add(seat);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(11, 0.09, 0.09),
        new THREE.MeshStandardMaterial({ color: 0xc4ccd2, metalness: 0.7, roughness: 0.35 }));
      rail.position.set(0, 1.05, 1.75);
      grp.add(rail);

      // Along the baseline direction (C, s·C) at distance `mid` from home,
      // pushed 6.4m onto foul ground (perpendicular, away from fair territory).
      const C = Math.SQRT1_2, mid = 16, foul = 6.4;
      grp.position.set(mid * C - foul * C, 0, s * (mid * C + foul * C));
      grp.rotation.y = s > 0 ? -Math.PI / 4 : Math.PI / 4;
      group.add(grp);
    }
  }

  /** Bullpens beyond the outfield ends of the grandstand, along the lines. */
  _bullpens(group) {
    const clay = new THREE.MeshStandardMaterial({ color: 0x9a6b43, roughness: 0.95 });
    const fence = new THREE.MeshStandardMaterial({
      color: 0x555e66, roughness: 0.6, transparent: true, opacity: 0.55
    });
    for (const s of [1, -1]) {
      const grp = new THREE.Group();
      grp.name = s > 0 ? 'bullpen-third' : 'bullpen-first';
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), clay);
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.03;
      grp.add(pad);
      for (const dz of [-3, 3]) {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.4), fence);
        f.position.set(0, 0.7, dz);
        grp.add(f);
      }
      // two mounds + plates
      for (const dx of [-3.4, 3.4]) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.24, 10), clay);
        m.position.set(dx, 0.12, -1.4);
        grp.add(m);
      }
      const C = Math.SQRT1_2;
      const along = 68;                       // beyond the grandstand wing
      grp.position.set(along * C - 9 * C, 0, s * (along * C + 9 * C));
      grp.rotation.y = s > 0 ? -Math.PI / 4 : Math.PI / 4;
      group.add(grp);
    }
  }
}

export default BaseballField;
