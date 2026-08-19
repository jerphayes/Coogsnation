/**
 * CrowdManager
 * ---------------------------------------------------------------------------
 * Fills every seat that has no real user in it with a lightweight AI
 * spectator.
 *
 * At ~50,000 spectators, per-frame CPU animation is not affordable — updating
 * a JS array of that size costs several milliseconds every frame and blows the
 * budget on its own. So all animation lives in the vertex shader:
 *
 *   - `aPhase`   per-instance random offset, so idle bobbing desynchronises
 *   - `aSeed`    per-instance random, drives height and size jitter
 *   - `uTime`    global clock
 *   - `uReaction` (type, startTime, strength) drives cheer / wave / stand
 *
 * The CPU only touches the buffers when a seat changes hands. A reaction is
 * three uniform writes for the entire bowl.
 *
 * Spectators are camera-facing point sprites, which is why they hold up under
 * this count: one vertex each, no per-instance matrix.
 */

import * as THREE from 'three';
import { CROWD, LOD } from '../config/engine.config.js';
import { EVT } from '../core/EventBus.js';

const REACTION_ID = { none: 0, cheer: 1, wave: 2, stand: 3 };

const VERTEX = /* glsl */`
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform vec3  uReaction;      // x = id, y = startTime, z = strength
  uniform float uIdleAmp;
  uniform float uIdleSpeed;
  uniform float uWaveLength;

  attribute vec3  aColor;
  attribute float aPhase;
  attribute float aSeed;
  attribute float aVisible;     // 0 when a real avatar owns this seat

  varying vec3  vColor;
  varying float vFade;

  void main() {
    vColor = aColor;

    vec3 pos = position;

    // idle: gentle asynchronous bob
    float idle = sin(uTime * uIdleSpeed + aPhase * 6.2831) * uIdleAmp;

    // reactions
    float react = 0.0;
    float age = uTime - uReaction.y;
    if (uReaction.x > 0.5 && age > 0.0) {
      float decay = clamp(1.0 - age / 6.0, 0.0, 1.0);
      if (uReaction.x < 1.5) {
        // cheer — everyone up and down, fast, slightly offset
        react = abs(sin(uTime * 7.0 + aPhase * 6.2831)) * 0.55 * decay;
      } else if (uReaction.x < 2.5) {
        // wave — travelling band keyed off the seat's angle around the bowl
        float angle = atan(position.z, position.x) / 6.2831 + 0.5;
        float head = fract(age * 0.16);
        float d = abs(fract(angle - head + 0.5) - 0.5);
        react = smoothstep(uWaveLength, 0.0, d) * 0.9;
      } else {
        // stand
        react = 0.35 * decay;
      }
      react *= uReaction.z;
    }

    pos.y += idle + react;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = -mv.z;

    // hide seats taken by real avatars, and fade out beyond the crowd LOD
    vFade = aVisible * (1.0 - smoothstep(${LOD.crowdLow.toFixed(1)}, ${(LOD.crowdLow * 1.35).toFixed(1)}, dist));

    gl_PointSize = uSize * uPixelRatio * (1.0 + aSeed * 0.16) * (300.0 / max(dist, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */`
  uniform sampler2D uMap;
  varying vec3  vColor;
  varying float vFade;

  void main() {
    if (vFade < 0.02) discard;
    vec4 tex = texture2D(uMap, gl_PointCoord);
    if (tex.a < 0.35) discard;
    gl_FragColor = vec4(vColor * tex.rgb, tex.a * vFade);
    #include <colorspace_fragment>
  }
`;

export class CrowdManager {
  /** @param {{scene:THREE.Scene, bus:EventBus, seats:SeatManager, renderer:THREE.WebGLRenderer}} ctx */
  constructor(ctx) {
    this.scene = ctx.scene;
    this.bus = ctx.bus;
    this.seats = ctx.seats;
    this.renderer = ctx.renderer;
    /** Engine defaults with the venue's overrides applied on top. */
    this.cfg = Object.assign({}, CROWD, ctx.venue?.crowd || {});

    this.group = new THREE.Group();
    this.group.name = 'crowd';
    this.scene.add(this.group);

    this.teamColors = null;
    this._seatToInstance = new Int32Array(this.seats.count).fill(-1);
    /** @type {Array<{points:THREE.Points, start:number, count:number}>} */
    this.chunks = [];

    this._buildTexture();
    this._buildChunks();
    this._wire();
  }

  /* ------------------------------------------------------------------ */

  _buildTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(32, 18, 10.5, 0, Math.PI * 2); g.fill();          // head
    g.beginPath();
    g.moveTo(9, 64); g.quadraticCurveTo(11, 31, 32, 30);
    g.quadraticCurveTo(53, 31, 55, 64); g.closePath(); g.fill();           // shoulders
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.texture = tex;
  }

  _material() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime:       { value: 0 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uSize:       { value: 0.32 },
        uMap:        { value: this.texture },
        uReaction:   { value: new THREE.Vector3(0, -999, 1) },
        uIdleAmp:    { value: this.cfg.idleAmplitude },
        uIdleSpeed:  { value: this.cfg.idleSpeed },
        uWaveLength: { value: this.cfg.reactions.wave.wavelength }
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: true
    });
  }

  _buildChunks() {
    const seats = this.seats;
    const palette = this.cfg.palette.slice();
    const col = new THREE.Color();

    for (const section of seats.sections) {
      const idx = [];
      for (let k = 0; k < section.count; k++) {
        if (Math.random() > this.cfg.fillRate) continue;
        idx.push(section.start + k);
      }
      if (!idx.length) continue;

      const n = idx.length;
      const pos = new Float32Array(n * 3);
      const colr = new Float32Array(n * 3);
      const phase = new Float32Array(n);
      const seed = new Float32Array(n);
      const vis = new Float32Array(n);

      for (let j = 0; j < n; j++) {
        const i = idx[j];
        pos[j * 3]     = seats.position[i * 3]     + (Math.random() - 0.5) * 0.14;
        pos[j * 3 + 1] = seats.position[i * 3 + 1] + 0.62 + Math.random() * 0.1;
        pos[j * 3 + 2] = seats.position[i * 3 + 2] + (Math.random() - 0.5) * 0.14;
        col.setHex(palette[(Math.random() * palette.length) | 0]);
        const k = 0.5 + Math.random() * 0.55;
        colr[j * 3] = col.r * k; colr[j * 3 + 1] = col.g * k; colr[j * 3 + 2] = col.b * k;
        phase[j] = Math.random();
        seed[j] = Math.random();
        vis[j] = 1;
        seats.occupied[i] = 1;                     // AI holds the seat
        this._seatToInstance[i] = this.chunks.length * 1e6 + j;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aColor',   new THREE.BufferAttribute(colr, 3));
      geo.setAttribute('aPhase',   new THREE.BufferAttribute(phase, 1));
      geo.setAttribute('aSeed',    new THREE.BufferAttribute(seed, 1));
      geo.setAttribute('aVisible', new THREE.BufferAttribute(vis, 1));
      geo.computeBoundingSphere();

      const points = new THREE.Points(geo, this._material());
      points.name = `crowd-${section.label}`;
      this.group.add(points);
      this.chunks.push({ points, seatIndices: idx });
    }
  }

  _wire() {
    // A real user takes the seat: hide that AI spectator.
    this.bus.on(EVT.SEAT_CLAIMED, ({ seatIndex }) => this._setVisible(seatIndex, 0));
    this.bus.on(EVT.SEAT_RELEASED, ({ seatIndex }) => this._setVisible(seatIndex, 1));
    this.bus.on(EVT.CROWD_REACTION, ({ type, strength = 1 }) => this.react(type, strength));
  }

  _setVisible(seatIndex, value) {
    const packed = this._seatToInstance[seatIndex];
    if (packed < 0) {
      // No AI was here (fillRate gap). Track occupancy anyway.
      this.seats.occupied[seatIndex] = value ? 0 : 2;
      return;
    }
    const chunkIdx = Math.floor(packed / 1e6);
    const j = packed % 1e6;
    const attr = this.chunks[chunkIdx].points.geometry.getAttribute('aVisible');
    attr.array[j] = value;
    attr.needsUpdate = true;
    this.seats.occupied[seatIndex] = value ? 1 : 2;
  }

  /* ------------------------------------------------------------------
   * PUBLIC
   * ---------------------------------------------------------------- */

  /**
   * Trigger a bowl-wide reaction. Cost is one uniform write per chunk,
   * regardless of crowd size.
   * @param {'cheer'|'wave'|'stand'|'none'} type
   */
  react(type, strength = 1) {
    const id = REACTION_ID[type] ?? 0;
    for (const c of this.chunks) {
      c.points.material.uniforms.uReaction.value.set(id, this._time || 0, strength);
    }
  }

  /** Swap the two team colours through the crowd palette. */
  setTeamColors(primary, secondary) {
    this.teamColors = { primary, secondary };
    const col = new THREE.Color();
    for (const c of this.chunks) {
      const attr = c.points.geometry.getAttribute('aColor');
      const n = attr.count;
      for (let j = 0; j < n; j++) {
        if (Math.random() > 0.4) continue;
        col.setHex(Math.random() < 0.65 ? primary : secondary);
        const k = 0.5 + Math.random() * 0.55;
        attr.array[j * 3] = col.r * k;
        attr.array[j * 3 + 1] = col.g * k;
        attr.array[j * 3 + 2] = col.b * k;
      }
      attr.needsUpdate = true;
    }
  }

  /**
   * Thin the house. Called by the director's crowd adapter; implemented by
   * toggling per-instance visibility rather than rebuilding buffers, so a
   * density change is a few attribute writes instead of a full rebuild.
   * @param {number} rate 0..1
   */
  setDensity(rate) {
    const target = Math.max(0, Math.min(1, rate));
    for (const c of this.chunks) {
      const vis = c.points.geometry.getAttribute('aVisible');
      for (let j = 0; j < vis.count; j++) {
        const seatIndex = c.seatIndices[j];
        if (this.seats.occupied[seatIndex] === 2) continue;   // real user, leave alone
        vis.array[j] = (j / vis.count) < target ? 1 : 0;
      }
      vis.needsUpdate = true;
    }
    this.cfg.fillRate = target;
  }

  update(dt, elapsed, camera) {
    this._time = elapsed;
    for (const c of this.chunks) {
      c.points.material.uniforms.uTime.value = elapsed;
    }
  }

  setPixelRatio(r) {
    for (const c of this.chunks) c.points.material.uniforms.uPixelRatio.value = r;
  }

  dispose() {
    for (const c of this.chunks) { c.points.geometry.dispose(); c.points.material.dispose(); }
    this.texture.dispose();
    this.scene.remove(this.group);
  }
}

export default CrowdManager;
