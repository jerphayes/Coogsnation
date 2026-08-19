/**
 * FootballStadium
 * ---------------------------------------------------------------------------
 * A generic 60,000-seat outdoor football venue. Original design; no real
 * building referenced, no marks, no licensed assets.
 *
 * Capacity comes out of the tier table, not a hard-coded number — the engine
 * reports whatever the geometry actually produces.
 */

import * as THREE from 'three';
import VenueDefinition from './VenueDefinition.js';

const FIELD = {
  length: 109.728,                 // 120 yd, end zones included
  width: 48.768,                   // 53.33 yd
  endZoneDepth: 9.144,
  hashInsetFromSideline: 18.288,   // 60 ft
  homeText: 'HOME',
  awayText: 'VISITORS',
  centreMark: 'VS'
};

export class FootballStadium extends VenueDefinition {
  constructor() {
    super({
      id: 'football',
      label: 'Generic Stadium',
      category: 'football',

      footprint: { coreX: 44, coreZ: 15, cornerRadius: 16, referenceRadius: 38 },

      tiers: [
        {
          id: 'lower', label: 'Lower Bowl', sectionPrefix: 100,
          d0: 0.5, d1: 35, y0: 1.4, y1: 24, rows: 45,
          spans: 'full', sectionsPerSpan: 48, vip: false, basePrice: 65
        },
        {
          id: 'club', label: 'Club Level', sectionPrefix: 200,
          d0: 37, d1: 44, y0: 26, y1: 32, rows: 8,
          spans: ['west', 'east'], sectionsPerSpan: 10, vip: true, basePrice: 240
        },
        {
          id: 'upper', label: 'Upper Deck', sectionPrefix: 300,
          d0: 46, d1: 68, y0: 36, y1: 57, rows: 24,
          spans: ['west', 'east', 'south'], sectionsPerSpan: 14, vip: false, basePrice: 35
        }
      ],

      structure: {
        facade: { offset: 36, height: 26.5, portals: 24, portalHeight: 7 },
        concourse: { level1: 8.5, level2: 33, width: 9 },
        suites: { span: 'west', offset: 36.6, y0: 24.8, y1: 29.6 },
        canopy: { span: 'west', innerOffset: 31, outerOffset: 73, frontY: 61.5, rearY: 55.5, depth: 1.5 },
        pressBox: { span: 'west', centreFraction: [0.32, 0.68], d0: 54, d1: 69, y0: 52, y1: 63 },
        tunnels: { count: 16, width: 4.2, height: 4.6, atRow: 0.52 },
        escalators: { count: 6, width: 3.2 },
        elevators: { count: 4, shaftWidth: 4 },
        approach: { poleLights: 26, radius: [180, 440] },
        /* Tailgate areas: zones in the twin plus light geometry (pads and
         * tents) outside the gates. Capacity counts vehicles, not people. */
        tailgate: {
          areas: [
            { id: 'north-lawn', label: 'North Lawn', centre: [-150, 0, -240], size: [90, 55], capacity: 220 },
            { id: 'east-grove', label: 'East Grove', centre: [ 250, 0,  -60], size: [70, 70], capacity: 180 },
            { id: 'south-yard', label: 'South Yard', centre: [ -80, 0,  260], size: [110, 50], capacity: 260 }
          ]
        },
        /* Parking is a VIRTUAL object class with no geometry at all — proof
         * that the digital twin is not a view of the scene graph. */
        parking: {
          lots: [
            { id: 'A', spaces: 4200, rows: 42, origin: [-320, 0, -180], accessibleRatio: 0.03, evRatio: 0.04 },
            { id: 'B', spaces: 3800, rows: 38, origin: [ 300, 0, -160] },
            { id: 'C', spaces: 5100, rows: 46, origin: [-260, 0,  260] },
            { id: 'D', spaces: 2600, rows: 26, origin: [ 340, 0,  220], accessibleRatio: 0.05 },
            { id: 'VIP', spaces: 480, rows: 12, origin: [ -90, 0, -300], evRatio: 0.12 }
          ]
        },
        videoBoards: [
          { id: 'north-main', end: 'north', width: 52, height: 26, y: 36 },
          { id: 'south-aux',  end: 'south', width: 30, height: 15, y: 30 }
        ],
        ribbonBoards: [
          { id: 'lower-fascia', tier: 'lower', height: 1.1, atFront: false },
          { id: 'upper-fascia', tier: 'upper', height: 1.4, atFront: true }
        ]
      },

      lighting: {
        preset: 'night',
        fixtures: {
          type: 'masts', height: 78, offset: 41,
          corners: true, lampRows: 4, lampsPerRow: 11
        }
      },

      camera: {
        orbitTarget: [0, 16, 0],
        orbitMin: 22, orbitMax: 620,
        home: [-186, 128, -206],
        spectator: { min: 40, max: 150, target: [0, 6, 0] },
        broadcast: { radius: 210, height: 44, period: 90 }
      }
    });

    this.field = FIELD;
  }

  /* ------------------------------------------------------------------ */

  buildSurface(ctx) {
    const { group, materials, renderer } = ctx;
    group.add(this._turf(renderer));
    group.add(this._apron(materials));
    this._goalPosts(group);
  }

  _turf(renderer) {
    const F = this.field;
    const W = 2600, H = Math.round(W * F.width / F.length);
    const m2p = W / F.length;
    const EZ = F.endZoneDepth;

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');

    for (let i = 0; i < 24; i++) {
      g.fillStyle = i % 2 ? '#215c3f' : '#1a4c34';
      g.fillRect(i * W / 24, 0, W / 24 + 1, H);
    }
    [[0, EZ * m2p, F.homeText, 1], [W - EZ * m2p, EZ * m2p, F.awayText, -1]]
      .forEach(([ex, ew, word, dir]) => {
        g.fillStyle = '#2c3a63'; g.fillRect(ex, 0, ew, H);
        g.save(); g.translate(ex + ew / 2, H / 2); g.rotate(dir * Math.PI / 2);
        g.fillStyle = '#f4fafc'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `700 ${Math.round(ew * 0.6)}px Impact, "Arial Narrow", sans-serif`;
        g.fillText(word, 0, 0); g.restore();
      });

    g.strokeStyle = '#f2f8fa'; g.fillStyle = '#f2f8fa';
    for (let yd = 0; yd <= 100; yd += 5) {
      const px = (EZ + yd * 0.9144) * m2p;
      g.lineWidth = yd % 10 === 0 ? 5 : 3.4;
      g.beginPath(); g.moveTo(px, 0); g.lineTo(px, H); g.stroke();
    }
    g.lineWidth = 7; g.strokeRect(3.5, 3.5, W - 7, H - 7);

    const hashOff = (F.width / 2 - F.hashInsetFromSideline) * m2p;
    g.lineWidth = 3.2;
    for (let yd = 1; yd < 100; yd++) {
      if (yd % 5 === 0) continue;
      const px = (EZ + yd * 0.9144) * m2p;
      [H / 2 - hashOff, H / 2 + hashOff].forEach(z => {
        g.beginPath(); g.moveTo(px, z - 10); g.lineTo(px, z + 10); g.stroke();
      });
      g.beginPath(); g.moveTo(px, 5); g.lineTo(px, 24);
      g.moveTo(px, H - 5); g.lineTo(px, H - 24); g.stroke();
    }

    g.font = `700 ${Math.round(H * 0.155)}px Impact, "Arial Narrow", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let yd = 10; yd <= 90; yd += 10) {
      const px = (EZ + yd * 0.9144) * m2p;
      const label = String(yd <= 50 ? yd : 100 - yd);
      [[H * 0.155, 0], [H * 0.845, Math.PI]].forEach(([pz, rot]) => {
        g.save(); g.translate(px, pz); g.rotate(rot); g.scale(0.82, 1);
        g.fillText(label, 0, 0);
        if (yd !== 50) {
          const dir = yd < 50 ? -1 : 1, ax = dir * H * 0.115;
          g.beginPath();
          g.moveTo(ax + dir * 16, -H * 0.023);
          g.lineTo(ax + dir * 16, H * 0.023);
          g.lineTo(ax + dir * 32, 0);
          g.closePath(); g.fill();
        }
        g.restore();
      });
    }

    g.save(); g.translate(W / 2, H / 2);
    g.strokeStyle = 'rgba(242,248,250,.9)'; g.lineWidth = 5.5;
    g.beginPath(); g.arc(0, 0, H * 0.2, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#cdd8e6';
    g.font = `700 ${Math.round(H * 0.24)}px Impact, "Arial Narrow", sans-serif`;
    g.fillText(F.centreMark, 0, H * 0.01); g.restore();

    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.PlaneGeometry(F.length, F.width);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.96 }));
    mesh.position.y = 0.02;
    mesh.receiveShadow = true;
    mesh.name = 'playing-surface';
    return mesh;
  }

  _apron(materials) {
    const F = this.field;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(F.length + 30, F.width + 26),
      materials.apron
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = -0.01;
    m.receiveShadow = true;
    m.name = 'apron';
    return m;
  }

  _goalPosts(group) {
    const F = this.field;
    const half = F.length / 2 - F.endZoneDepth;
    const pipe = new THREE.CylinderGeometry(0.13, 0.13, 1, 10);
    const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.35, metalness: 0.8 });
    const up = new THREE.Vector3(0, 1, 0);
    const put = (a, b) => {
      const m = new THREE.Mesh(pipe, gold);
      m.position.copy(a).lerp(b, 0.5);
      m.scale.set(1, a.distanceTo(b), 1);
      m.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
      m.castShadow = true;
      group.add(m);
    };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    [-1, 1].forEach(s => {
      const x = s * half;
      put(V(x, 0, 0), V(x, 3, 0));
      put(V(x, 3, -2.83), V(x, 3, 2.83));
      put(V(x, 3, -2.83), V(x, 12, -2.83));
      put(V(x, 3, 2.83), V(x, 12, 2.83));
    });
  }
}

export default FootballStadium;
