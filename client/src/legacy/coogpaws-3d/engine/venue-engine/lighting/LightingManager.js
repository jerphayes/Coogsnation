/**
 * LightingManager
 * ---------------------------------------------------------------------------
 * Owns every light, the sky dome and the tone mapping exposure. Presets are
 * declarative in stadium.config.js, so adding a "twilight" look is a config
 * change, not a code change.
 *
 * Shadow policy: only structural meshes cast. Sixty thousand instanced seats
 * casting shadows would multiply the scene's draw cost by the number of
 * shadow-casting lights, and at stadium distances the result is invisible.
 * Contact darkness under the decks comes from the soffit geometry itself.
 */

import * as THREE from 'three';
import { LIGHTING, RENDER } from '../config/engine.config.js';

export class LightingManager {
  /** @param {{scene, renderer, footprint, venue}} ctx */
  constructor(ctx) {
    this.scene = ctx.scene;
    this.renderer = ctx.renderer;
    this.footprint = ctx.footprint;
    this.venue = ctx.venue;
    /** Fixture layout is a property of the building, not of the engine. */
    this.fixtures = ctx.venue.lighting.fixtures;

    this.group = new THREE.Group();
    this.group.name = 'lighting';
    this.scene.add(this.group);

    this.masts = new THREE.Group();
    this.masts.name = 'floodlight-masts';
    this.group.add(this.masts);

    this.spots = [];
    this.preset = null;

    this._buildSky();
    this._buildFixtures();
    this._buildAmbient();
    this.setPreset(ctx.venue.lighting.preset || LIGHTING.default);
  }

  /* ------------------------------------------------------------------ */

  _buildSky() {
    this.skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1600, 32, 20),
      new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false })
    );
    this.skyMesh.name = 'sky';
    this.scene.add(this.skyMesh);

    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 0.85 + 0.05);
      const r = 1400;
      pos[i * 3]     = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xdfeaff, size: 2.4, sizeAttenuation: false,
      transparent: true, opacity: 0.7, fog: false
    }));
    this.scene.add(this.stars);
  }

  _skyTexture(stops) {
    const cv = document.createElement('canvas');
    cv.width = 8; cv.height = 256;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
    g.fillStyle = grad; g.fillRect(0, 0, 8, 256);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Dispatch on the venue's declared fixture type. */
  _buildFixtures() {
    if (!this.fixtures) return;            // ambient-only venue
    if (this.fixtures.type === 'masts')   return this._buildMastArray();
    if (this.fixtures.type === 'catwalk') return this._buildCatwalks();
    if (this.fixtures.type === 'poles')   return this._buildPoles();
    console.warn(`[lighting] unknown fixture type "${this.fixtures.type}"`);
  }

  /** Outdoor: four corner masts throwing across the surface. */
  _buildMastArray() {
    const fp = this.footprint;
    const { height, offset, lampRows, lampsPerRow } = this.fixtures;
    const steel = new THREE.MeshStandardMaterial({ color: 0xb9c2c8, roughness: 0.42, metalness: 0.75 });
    const dark  = new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.85 });
    this.lampMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff3d8, emissive: 0xffeec4, emissiveIntensity: 3.2
    });

    // Corner arc midpoints
    const corners = [1, 3, 5, 7].map(i => {
      const s = fp.segments[i];
      return s.t0 + s.fraction / 2;
    });

    const glowTex = this._glowTexture();
    const mastGeo = new THREE.CylinderGeometry(0.7, 1.5, 1, 10);
    const lampGeo = new THREE.BoxGeometry(1.15, 1.15, 0.35);

    corners.forEach(t => {
      const p = fp.point(t, offset, 0);

      const mast = new THREE.Mesh(mastGeo, steel);
      mast.scale.set(1, height, 1);
      mast.position.set(p.x, height / 2, p.z);
      mast.castShadow = RENDER.shadows.enabled;
      this.masts.add(mast);

      const bank = new THREE.Mesh(new THREE.BoxGeometry(11, 5.5, 1.6), dark);
      bank.position.set(p.x, height - 4, p.z);
      bank.lookAt(0, 10, 0);
      this.masts.add(bank);

      const lamps = new THREE.InstancedMesh(lampGeo, this.lampMaterial, lampRows * lampsPerRow);
      const o = new THREE.Object3D();
      for (let r = 0; r < lampRows; r++) {
        for (let k = 0; k < lampsPerRow; k++) {
          const q = fp.point(t + (k - (lampsPerRow - 1) / 2) * 0.0040, offset - 0.8,
                             height - 6.4 + r * 1.5);
          o.position.set(q.x, q.y, q.z);
          o.lookAt(0, 10, 0);
          o.updateMatrix();
          lamps.setMatrixAt(r * lampsPerRow + k, o.matrix);
        }
      }
      lamps.instanceMatrix.needsUpdate = true;
      this.masts.add(lamps);

      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, opacity: 0.85
      }));
      glow.scale.set(46, 26, 1);
      glow.position.set(p.x, height - 4, p.z);
      this.masts.add(glow);

  const spot = new THREE.SpotLight(0xfff1d6, 2.6, 340, 0.46, 0.55, 1);
      spot.position.set(p.x, height - 2, p.z);
      spot.target.position.set(0, 0, 0);
      this.masts.add(spot);
      this.masts.add(spot.target);
      this.spots.push(spot);

      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(40, 84, 24, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffe6bb, transparent: true, opacity: 0.022,
          side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
        })
      );
      beam.position.set(p.x * 0.5, 40, p.z * 0.5);
      beam.lookAt(0, 0, 0);
      beam.rotateX(Math.PI / 2);
      this.masts.add(beam);
    });
  }


  /**
   * Indoor: concentric catwalk rings of downlights over the surface. Same
   * `this.spots` contract as masts, so setPreset/setFloodlights need no
   * knowledge of which kind the venue uses.
   */
  _buildCatwalks() {
    const glowTex = this._glowTexture();
    const housing = new THREE.MeshStandardMaterial({ color: 0x161c24, roughness: 0.8 });
    const lampGeo = new THREE.CylinderGeometry(0.34, 0.5, 0.55, 8);
    this.lampMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff6e6, emissive: 0xfff1d8, emissiveIntensity: 3.0
    });

    this.fixtures.rings.forEach((ring, ri) => {
      const truss = new THREE.Mesh(
        new THREE.TorusGeometry(ring.radius, 0.22, 6, 64), housing);
      truss.rotation.x = Math.PI / 2;
      truss.position.y = ring.height;
      this.masts.add(truss);

      const lamps = new THREE.InstancedMesh(lampGeo, this.lampMaterial, ring.count);
      const o = new THREE.Object3D();
      for (let i = 0; i < ring.count; i++) {
        const a = (i / ring.count) * Math.PI * 2;
        o.position.set(Math.cos(a) * ring.radius, ring.height - 0.5, Math.sin(a) * ring.radius);
        o.updateMatrix();
        lamps.setMatrixAt(i, o.matrix);

        // One real light per few fixtures — enough to read, cheap to shade.
        if (i % Math.max(1, Math.round(ring.count / 4)) === 0) {
          const spot = new THREE.SpotLight(0xfff6e6, 2.2, ring.height * 4, 0.62, 0.6, 1);
          spot.position.copy(o.position);
          spot.target.position.set(0, 0, 0);
          this.masts.add(spot, spot.target);
          this.spots.push(spot);
        }
      }
      lamps.instanceMatrix.needsUpdate = true;
      this.masts.add(lamps);

      if (ri === 0) {
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTex, transparent: true, blending: THREE.AdditiveBlending,
          depthWrite: false, opacity: 0.4
        }));
        glow.scale.set(ring.radius * 2.4, ring.radius * 1.2, 1);
        glow.position.set(0, ring.height - 1, 0);
        this.masts.add(glow);
      }
    });
  }

  /**
   * Explicit pole positions. Corner masts assume a closed rectangle with four
   * corners; a fan grandstand has none, and a ballfield wants six to eight
   * poles ringing fair territory. Same `this.spots` contract as the others,
   * so presets and setFixtures need no knowledge of the difference.
   */
  _buildPoles() {
    const glowTex = this._glowTexture();
    const cfg = this.fixtures;
    const headGeo = new THREE.BoxGeometry(4.6, 2.6, 0.7);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x11151b, roughness: 0.85 });
    this.lampMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff6e6, emissive: 0xfff1d8, emissiveIntensity: 3.2
    });
    const lampGeo = new THREE.SphereGeometry(0.34, 8, 6);

    for (const [px, pz] of cfg.positions) {
      const h = cfg.height;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.75, h, 10),
        new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.7, metalness: 0.5 }));
      pole.position.set(px, h / 2, pz);
      pole.castShadow = true;
      this.masts.add(pole);

      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(px, h + 1.2, pz);
      head.lookAt(0, 0, 0);
      this.masts.add(head);

      const lamps = new THREE.InstancedMesh(lampGeo, this.lampMaterial, 12);
      const o = new THREE.Object3D();
      for (let i = 0; i < 12; i++) {
        o.position.set(px, h + 0.6 + Math.floor(i / 6) * 1.1, pz);
        o.translateOnAxis(new THREE.Vector3().subVectors(
          new THREE.Vector3(0, h, 0), new THREE.Vector3(px, h, pz)).normalize().cross(new THREE.Vector3(0, 1, 0)),
          (i % 6 - 2.5) * 0.75);
        o.updateMatrix();
        lamps.setMatrixAt(i, o.matrix);
      }
      lamps.instanceMatrix.needsUpdate = true;
      this.masts.add(lamps);

      const spot = new THREE.SpotLight(0xfff1d6, 2.4, cfg.height * 6, 0.5, 0.55, 1);
      spot.position.set(px, h, pz);
      spot.target.position.set(px * 0.15, 0, pz * 0.15);
      this.masts.add(spot, spot.target);
      this.spots.push(spot);

      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, opacity: 0.5
      }));
      glow.scale.set(16, 8, 1);
      glow.position.set(px, h + 1, pz);
      this.masts.add(glow);
    }
  }

  _glowTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,240,205,1)');
    grad.addColorStop(0.25, 'rgba(255,225,170,0.55)');
    grad.addColorStop(1, 'rgba(255,210,150,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  }

  _buildAmbient() {
    this.hemi = new THREE.HemisphereLight(0x2b3d52, 0x0a0e12, 0.42);
    this.ambient = new THREE.AmbientLight(0x37485c, 0.28);
    this.sun = new THREE.DirectionalLight(0xffffff, 0);
    this.sun.castShadow = RENDER.shadows.enabled;
    this.sun.shadow.mapSize.set(RENDER.shadows.mapSize, RENDER.shadows.mapSize);
    this.sun.shadow.camera.left = -200;
    this.sun.shadow.camera.right = 200;
    this.sun.shadow.camera.top = 200;
    this.sun.shadow.camera.bottom = -200;
    this.sun.shadow.camera.far = 900;
    this.bounce = new THREE.PointLight(0xbcd6e6, 0.9, 260, 2);
    this.bounce.position.set(0, 16, 0);
    this.group.add(this.hemi, this.ambient, this.sun, this.bounce);
  }

  /* ------------------------------------------------------------------ */

  /** @param {'night'|'day'|'sunset'} name */
  setPreset(name) {
    const p = LIGHTING.presets[name];
    if (!p) return;
    this.preset = name;

    if (this.skyMesh.material.map) this.skyMesh.material.map.dispose();
    this.skyMesh.material.map = this._skyTexture(p.sky);
    this.skyMesh.material.needsUpdate = true;

    this.stars.visible = p.stars > 0;
    this.stars.material.opacity = p.stars ? Math.min(0.7, p.stars / 900 * 0.7) : 0;

    this.hemi.color.setHex(p.hemi.sky);
    this.hemi.groundColor.setHex(p.hemi.ground);
    this.hemi.intensity = p.hemi.intensity;
    this.ambient.color.setHex(p.ambient.color);
    this.ambient.intensity = p.ambient.intensity;

    if (p.sun) {
      this.sun.color.setHex(p.sun.color);
      this.sun.intensity = p.sun.intensity;
      const r = 320;
      this.sun.position.set(
        Math.cos(p.sun.azimuth) * Math.cos(p.sun.elevation) * r,
        Math.sin(p.sun.elevation) * r,
        Math.sin(p.sun.azimuth) * Math.cos(p.sun.elevation) * r
      );
    } else {
      this.sun.intensity = 0;
    }

    const on = !!p.fixtures;
    this.masts.visible = true;
    this.spots.forEach(s => { s.intensity = on ? p.fixtures.intensity : 0; s.visible = on; });
    if (this.lampMaterial) this.lampMaterial.emissiveIntensity = on ? 3.2 : 0.05;
    this.bounce.intensity = on ? 0.9 : 0.3;

    this.renderer.toneMappingExposure = p.exposure;
  }

  /** Works for masts or catwalks — both populate `this.spots`. */
  setFixtures(on) {
    const p = LIGHTING.presets[this.preset];
    const base = p.fixtures ? p.fixtures.intensity : 2.6;
    this.spots.forEach(s => { s.intensity = on ? base : 0; s.visible = on; });
    if (this.lampMaterial) this.lampMaterial.emissiveIntensity = on ? 3.2 : 0.05;
    this.renderer.toneMappingExposure = on ? p.exposure : p.exposure * 1.25;
  }

  update(dt, elapsed) {
    // Arc lamps are never perfectly steady; a touch of flicker sells the scale.
    for (let i = 0; i < this.spots.length; i++) {
      const s = this.spots[i];
      if (s.visible && s.intensity > 0) {
        s.intensity += Math.sin(elapsed * 3.1 + i) * 0.004;
      }
    }
  }

  dispose() {
    this.scene.remove(this.group, this.skyMesh, this.stars);
  }
}

export default LightingManager;
