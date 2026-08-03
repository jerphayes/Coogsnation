/**
 * SeatManager
 * ---------------------------------------------------------------------------
 * Owns the seat manifest and everything drawn to represent it.
 *
 * DATA LAYOUT
 * -----------
 * ~60,000 seats as plain objects would be roughly 12 MB of heap and a garbage
 * collection problem every time we touch occupancy. Instead the manifest is
 * struct-of-arrays: parallel typed arrays indexed by a global seat index.
 * `getSeat(i)` materialises a plain object on demand for UI and network code,
 * which is the only place the ergonomic form is actually wanted.
 *
 * RENDERING
 * ---------
 * One InstancedMesh per *section* (not per tier). That buys three things:
 *   1. real frustum culling — a section behind the camera costs nothing,
 *   2. per-chunk LOD — near sections use the detailed seat, far ones a plane,
 *   3. bounded raycasts — picking only tests sections the ray could hit.
 *
 * Section chunks are the unit of work everywhere else too: CrowdManager keys
 * its instanced billboards off the same chunk table.
 */

import * as THREE from 'three';
import { SEATING, LOD } from '../config/engine.config.js';
import { EVT } from '../core/EventBus.js';

/* Bit flags packed into the `flags` array. */
const FLAG_RESERVED = 1 << 0;
const FLAG_VIP      = 1 << 1;
const FLAG_OBSTRUCT = 1 << 2;
const FLAG_ADA      = 1 << 3;

export class SeatManager {
  /** @param {{scene, bus, footprint, venue}} ctx */
  constructor(ctx) {
    this.scene = ctx.scene;
    this.bus = ctx.bus;
    this.footprint = ctx.footprint;
    this.venue = ctx.venue;

    /** Engine seating defaults with the venue's overrides applied on top. */
    this.seating = Object.assign({}, SEATING, this.venue.seating || {});

    this.group = new THREE.Group();
    this.group.name = 'seats';
    this.scene.add(this.group);

    /** @type {Array<{id:string, tierId:string, label:number, start:number, count:number, mesh:THREE.InstancedMesh, centre:THREE.Vector3, radius:number, lod:number}>} */
    this.sections = [];
    this.count = 0;

    this._lodClock = 0;
    this._tmpObj = new THREE.Object3D();
    this._tmpColor = new THREE.Color();
    this._hovered = -1;

    // Synchronous by default so tests and tooling can construct one inline.
    // Production uses SeatManager.create(), which chunks the same work across
    // frames — see core/scheduler.js for why that matters more than it looks.
    if (!ctx.defer) {
      this._buildManifest();
      this._buildMeshes();
    }
  }

  /**
   * Chunked construction. Identical output to the synchronous path; the only
   * difference is that the thread is surrendered between sections so the
   * browser can paint.
   *
   * @param {object} ctx same as the constructor
   * @param {(fraction:number, label:string) => void} [onProgress]
   * @returns {Promise<SeatManager>}
   */
  static async create(ctx, onProgress) {
    const { runChunked } = await import('../core/scheduler.js');
    const sm = new SeatManager({ ...ctx, defer: true });
    await runChunked(sm.manifestSteps(), {
      onProgress: f => onProgress?.(f * 0.75, 'seat manifest')
    });
    await runChunked(sm.meshSteps(), {
      onProgress: f => onProgress?.(0.75 + f * 0.25, 'seat geometry')
    });
    return sm;
  }

  /* ======================================================================
   * MANIFEST
   * ==================================================================== */

  _resolveSpans(tier) {
    const marks = this.footprint.landmarks();
    const bleed = this.venue.spanBleed;
    if (tier.spans === 'full') return [{ name: 'ring', t0: 0, t1: 1, closed: true }];
    return tier.spans.map(name => {
      const range = marks[name];
      if (!range) {
        throw new Error(`[${this.venue.id}] tier "${tier.id}" references unknown span "${name}"`);
      }
      return { name, t0: range[0] - bleed, t1: range[1] + bleed, closed: false };
    });
  }

  _buildManifest() { for (const _ of this.manifestSteps()) { /* drain */ } }

  /**
   * Generator form. Yields a progress fraction after each SECTION, which is
   * the natural interruption point: a section is self-contained, and 110 of
   * them turns one 390ms block into ~4ms slices.
   */
  * manifestSteps() {
    const fp = this.footprint;
    const S = this.seating;

    // First pass: place every seat into growable JS arrays, then compact into
    // typed arrays once the total is known.
    const px = [], py = [], pz = [], yaw = [];
    const rowIdx = [], seatNo = [], sectionIdx = [], tierIdx = [], flags = [];
    const sectionDefs = [];

    let rowsDone = 0;
    const rowsTotal = this.venue.tiers.reduce((n, t) =>
      n + this._resolveSpans(t).length * t.sectionsPerSpan * t.rows, 0);

    // for..of rather than forEach: a generator cannot yield across a callback
    // boundary, and the interruption point has to be inside the section loop.
    for (let ti = 0; ti < this.venue.tiers.length; ti++) {
      const tier = this.venue.tiers[ti];
      const spans = this._resolveSpans(tier);
      let ordinal = 1;

      for (const span of spans) {
        const span_t = span.t1 - span.t0;
        const perSpan = tier.sectionsPerSpan;

        // Section boundaries in parameter space — these are also the aisles.
        for (let s = 0; s < perSpan; s++) {
          const sT0 = span.t0 + span_t * (s / perSpan);
          const sT1 = span.t0 + span_t * ((s + 1) / perSpan);
          const label = this.venue.sectionLabel(tier, span.name, ordinal++);
          const start = px.length;

          for (let r = 0; r < tier.rows; r++) {
            const v = tier.rows > 1 ? r / (tier.rows - 1) : 0;
            const d = tier.d0 + (tier.d1 - tier.d0) * v + S.treadOffset;
            const y = tier.y0 + (tier.y1 - tier.y0) * v;

            const table = fp.arcTable(d, sT0, sT1, 220);
            // Trim the aisle out of both ends of the section.
            const usable = table.total - 2 * S.aisleHalfWidth;
            if (usable < S.pitch) continue;
            const n = Math.floor(usable / S.pitch);
            const pad = S.aisleHalfWidth + (usable - n * S.pitch) / 2;

            for (let k = 0; k < n; k++) {
              const t = fp.tAtLength(table, pad + (k + 0.5) * S.pitch);
              const p = fp.point(t, d, y);
              px.push(p.x); py.push(y); pz.push(p.z);
              yaw.push(Math.atan2(-p.nx, -p.nz));   // face the field
              rowIdx.push(r);
              seatNo.push(k + 1);
              sectionIdx.push(sectionDefs.length);
              tierIdx.push(ti);
              let f = 0;
              if (tier.vip) f |= FLAG_VIP;
              if (r === 0 && k % 24 === 0) f |= FLAG_ADA;
              flags.push(f);
            }
            // Interruption point. A row is the smallest unit of work that is
            // self-contained, and at ~0.08ms it keeps every slice comfortably
            // inside one frame even on slow hardware.
            rowsDone++;
            if ((rowsDone & 7) === 0) yield rowsDone / rowsTotal;
          }

          const _pushed = {
            id: `${tier.id}-${label}`,
            tierId: tier.id,
            tierIndex: ti,
            label,
            span: span.name,
            t0: sT0, t1: sT1,
            start,
            count: px.length - start,
            basePrice: tier.basePrice,
            vip: !!tier.vip
          };
          sectionDefs.push(_pushed);
        }
      }
    }

    const n = px.length;
    this.count = n;

    this.position = new Float32Array(n * 3);
    this.yaw      = new Float32Array(n);
    this.row      = new Uint8Array(n);
    this.number   = new Uint16Array(n);
    this.section  = new Uint16Array(n);
    this.tier     = new Uint8Array(n);
    this.flags    = new Uint8Array(n);
    this.occupied = new Uint8Array(n);        // 0 empty, 1 AI crowd, 2 real user
    this.avatarId = new Int32Array(n).fill(-1);
    /** @type {Map<number,string>} sparse — only occupied seats carry a name */
    this.username = new Map();

    for (let i = 0; i < n; i++) {
      this.position[i * 3] = px[i];
      this.position[i * 3 + 1] = py[i];
      this.position[i * 3 + 2] = pz[i];
      this.yaw[i] = yaw[i];
      this.row[i] = rowIdx[i];
      this.number[i] = seatNo[i];
      this.section[i] = sectionIdx[i];
      this.tier[i] = tierIdx[i];
      this.flags[i] = flags[i];
    }
    this.sectionDefs = sectionDefs;

    // `section` is a Uint16 index into sectionDefs — fail loudly, not silently.
    if (sectionDefs.length > 65535) {
      throw new Error(`[${this.venue.id}] ${sectionDefs.length} sections exceeds the Uint16 section index`);
    }
  }

  /* ======================================================================
   * GEOMETRY
   * ==================================================================== */

  /** Detailed chair: pan, raked back, pedestal. 3 quads, 6 tris. */
  static buildSeatGeometryHigh() {
    const v = [], c = [], hw = 0.21;
    const quad = (a, b, d, e) => {
      v.push(...a, ...b, ...d, ...a, ...d, ...e);
      for (let i = 0; i < 6; i++) c.push(1, 1, 1);
    };
    quad([-hw, 0.26, -0.18], [hw, 0.26, -0.18], [hw, 0.26, 0.17], [-hw, 0.26, 0.17]);
    quad([-hw, 0.26, -0.18], [hw, 0.26, -0.18], [hw, 0.66, -0.31], [-hw, 0.66, -0.31]);
    quad([-hw, 0.00, -0.05], [-hw, 0.26, -0.05], [hw, 0.26, -0.05], [hw, 0.00, -0.05]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.computeVertexNormals();
    return g;
  }

  /** Far LOD: one raked plane. Reads identically past ~45 m. */
  static buildSeatGeometryLow() {
    const v = [], c = [], hw = 0.22;
    v.push(-hw, 0.14, 0.02, hw, 0.14, 0.02, hw, 0.60, -0.26,
           -hw, 0.14, 0.02, hw, 0.60, -0.26, -hw, 0.60, -0.26);
    for (let i = 0; i < 6; i++) c.push(1, 1, 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.computeVertexNormals();
    return g;
  }

  _buildMeshes() { for (const _ of this.meshSteps()) { /* drain */ } }

  /** Generator form: yields after each section's InstancedMesh is built. */
  * meshSteps() {
    this.geoHigh = SeatManager.buildSeatGeometryHigh();
    this.geoLow  = SeatManager.buildSeatGeometryLow();
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide
    });

    const obj = this._tmpObj, col = this._tmpColor;
    const bands = this.seating.alternateBands;

    for (const def of this.sectionDefs) {
      // Empty sections still occupy an index — `this.section[i]` indexes into
      // this array, so skipping one would silently shift every later lookup.
      if (!def.count) {
        this.sections.push({ ...def, mesh: null, centre: new THREE.Vector3(), radius: 0, lod: 2 });
        yield this.sections.length / this.sectionDefs.length;
        continue;
      }
      const mesh = new THREE.InstancedMesh(this.geoHigh, this.material, def.count);
      mesh.name = `section-${def.label}`;
      mesh.userData.sectionIndex = this.sections.length;

      const centre = new THREE.Vector3();
      let maxR = 0;

      for (let k = 0; k < def.count; k++) {
        const i = def.start + k;
        obj.position.set(this.position[i * 3], this.position[i * 3 + 1], this.position[i * 3 + 2]);
        obj.rotation.set(0, this.yaw[i], 0);
        obj.updateMatrix();
        mesh.setMatrixAt(k, obj.matrix);
        centre.add(obj.position);

        const tierRows = this.venue.tiers[this.tier[i]].rows;
        const v = tierRows > 1 ? this.row[i] / (tierRows - 1) : 0;
        const alt = bands.some(([a, b]) => v >= a && v <= b);
        col.setHex(alt ? this.seating.colorAlternate : this.seating.colorPrimary);
        col.multiplyScalar(0.86 + Math.random() * 0.26);
        mesh.setColorAt(k, col);
      }
      centre.divideScalar(def.count);
      for (let k = 0; k < def.count; k++) {
        const i = def.start + k;
        const dx = this.position[i * 3] - centre.x;
        const dy = this.position[i * 3 + 1] - centre.y;
        const dz = this.position[i * 3 + 2] - centre.z;
        maxR = Math.max(maxR, Math.sqrt(dx * dx + dy * dy + dz * dz));
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
      yield this.sections.length / this.sectionDefs.length;

      this.sections.push({ ...def, mesh, centre, radius: maxR, lod: 0 });
      yield this.sections.length / this.sectionDefs.length;
    }
  }

  /* ======================================================================
   * LOD
   * ==================================================================== */

  updateLOD(camera, dt) {
    this._lodClock += dt;
    if (this._lodClock < LOD.evaluateInterval) return;
    this._lodClock = 0;

    const cam = camera.position;
    for (const s of this.sections) {
      if (!s.mesh) continue;
      const dist = cam.distanceTo(s.centre) - s.radius;
      const want = dist > LOD.cull ? 2 : dist > LOD.seatHigh ? 1 : 0;
      if (want === s.lod) continue;
      s.lod = want;
      s.mesh.visible = want < 2;
      const geo = want === 0 ? this.geoHigh : this.geoLow;
      if (s.mesh.geometry !== geo) s.mesh.geometry = geo;
    }
  }

  /* ======================================================================
   * PICKING
   * ==================================================================== */

  /**
   * @param {THREE.Raycaster} raycaster
   * @returns {number} global seat index, or -1
   */
  raycast(raycaster) {
    const candidates = this.sections.filter(s => s.mesh && s.mesh.visible);
    const hits = raycaster.intersectObjects(candidates.map(s => s.mesh), false);
    if (!hits.length) return -1;
    const hit = hits[0];
    const section = this.sections[hit.object.userData.sectionIndex];
    return section.start + hit.instanceId;
  }

  setHovered(seatIndex) {
    if (seatIndex === this._hovered) return;
    this._hovered = seatIndex;
    this.bus.emit(EVT.SEAT_HOVER, { seatIndex });
  }

  /* ======================================================================
   * PUBLIC API
   * ==================================================================== */

  /** Materialise the ergonomic record for one seat. */
  getSeat(i) {
    if (i < 0 || i >= this.count) return null;
    const section = this.sections[this.section[i]];
    const tier = this.venue.tiers[this.tier[i]];
    const f = this.flags[i];
    return {
      index: i,
      seatId: `${section.label}-${this.row[i] + 1}-${this.number[i]}`,
      section: section.label,
      tierLabel: tier.label,
      row: this.row[i] + 1,
      seatNumber: this.number[i],
      tier: tier.id,
      occupancy: ['empty', 'ai', 'user'][this.occupied[i]],
      avatarId: this.avatarId[i] >= 0 ? this.avatarId[i] : null,
      username: this.username.get(i) || null,
      reserved: !!(f & FLAG_RESERVED),
      vip: !!(f & FLAG_VIP),
      ada: !!(f & FLAG_ADA),
      obstructed: !!(f & FLAG_OBSTRUCT),
      price: this.venue.seatPrice({
        tier, row: this.row[i], rows: tier.rows,
        x: this.position[i * 3], z: this.position[i * 3 + 2]
      }),
      position: new THREE.Vector3(
        this.position[i * 3], this.position[i * 3 + 1], this.position[i * 3 + 2]
      ),
      yaw: this.yaw[i]
    };
  }

  /** Claim a seat for a real user. Idempotent; returns false if unavailable. */
  claim(seatIndex, { userId, username, team }) {
    if (seatIndex < 0 || seatIndex >= this.count) return false;
    if (this.occupied[seatIndex] === 2) return false;
    if (this.flags[seatIndex] & FLAG_RESERVED) return false;
    this.occupied[seatIndex] = 2;
    this.avatarId[seatIndex] = userId;
    this.username.set(seatIndex, username);
    this.bus.emit(EVT.SEAT_CLAIMED, { seatIndex, userId, username, team });
    return true;
  }

  release(seatIndex) {
    if (seatIndex < 0 || seatIndex >= this.count) return;
    const userId = this.avatarId[seatIndex];
    this.occupied[seatIndex] = 0;
    this.avatarId[seatIndex] = -1;
    this.username.delete(seatIndex);
    this.bus.emit(EVT.SEAT_RELEASED, { seatIndex, userId });
  }

  /** Mark a block unavailable — house seats, camera platforms, kill zones. */
  reserveRange(start, count) {
    for (let i = start; i < Math.min(start + count, this.count); i++) {
      this.flags[i] |= FLAG_RESERVED;
    }
  }

  /** First free seat, optionally constrained to a tier id. */
  findAvailable(tierId = null) {
    for (let i = 0; i < this.count; i++) {
      if (this.occupied[i] === 2) continue;
      if (this.flags[i] & FLAG_RESERVED) continue;
      if (tierId && this.venue.tiers[this.tier[i]].id !== tierId) continue;
      return i;
    }
    return -1;
  }

  /** Eye position and look direction for seat-mode camera. */
  getViewpoint(i, eyeHeight = 1.18) {
    const p = new THREE.Vector3(
      this.position[i * 3], this.position[i * 3 + 1] + eyeHeight, this.position[i * 3 + 2]
    );
    const yaw = this.yaw[i];
    const look = new THREE.Vector3(p.x + Math.sin(yaw) * 10, p.y - 1.6, p.z + Math.cos(yaw) * 10);
    return { position: p, target: look };
  }

  stats() {
    let users = 0, ai = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.occupied[i] === 2) users++;
      else if (this.occupied[i] === 1) ai++;
    }
    return { total: this.count, sections: this.sections.length, users, ai };
  }

  dispose() {
    for (const s of this.sections) s.mesh?.dispose();
    this.geoHigh.dispose(); this.geoLow.dispose(); this.material.dispose();
    this.scene.remove(this.group);
  }
}

export default SeatManager;
