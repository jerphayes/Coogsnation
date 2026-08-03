/**
 * AvatarManager
 * ---------------------------------------------------------------------------
 * Real users, as distinct from the AI crowd. An avatar is bound to exactly one
 * seat; taking a seat hides the AI spectator that was in it (CrowdManager
 * listens for the same event).
 *
 * Rendering strategy: a single InstancedMesh with a hard cap
 * (AVATARS.maxRendered). Users beyond the cap, or beyond the label distance,
 * still exist in the model — they just fall back to crowd representation.
 * This keeps a 40,000-user room from trying to draw 40,000 rigged characters.
 *
 * The procedural body is deliberately simple. Swap `_buildBodyGeometry()` for
 * a GLB from AssetLoader when you have art; the binding, labels, colouring and
 * emote plumbing do not change.
 */

import * as THREE from 'three';
import { AVATARS } from '../config/engine.config.js';
import { EVT } from '../core/EventBus.js';

export class AvatarManager {
  /** @param {{scene, bus, seats, camera, assets}} ctx */
  constructor(ctx) {
    this.scene = ctx.scene;
    this.bus = ctx.bus;
    this.seats = ctx.seats;
    this.camera = ctx.camera;
    this.assets = ctx.assets;

    this.group = new THREE.Group();
    this.group.name = 'avatars';
    this.scene.add(this.group);

    /** @type {Map<number, {userId, username, team, seatIndex, slot, emote, emoteUntil}>} */
    this.users = new Map();
    /** @type {Map<number, number>} seatIndex → userId */
    this.bySeat = new Map();
    this._freeSlots = [];
    this._slotToUser = new Int32Array(AVATARS.maxRendered).fill(-1);

    this.labels = new Map();       // userId → THREE.Sprite
    this._labelPool = [];

    this._build();
    this._wire();
  }

  /* ------------------------------------------------------------------ */

  _buildBodyGeometry() {
    // Seated figure: torso wedge, head, upper legs. Low poly on purpose.
    const geos = [];
    const torso = new THREE.CylinderGeometry(0.20, 0.26, 0.62, 8);
    torso.translate(0, 0.55, -0.02);
    geos.push(torso);
    const head = new THREE.SphereGeometry(0.135, 10, 8);
    head.translate(0, 0.98, 0.0);
    geos.push(head);
    const legs = new THREE.BoxGeometry(0.36, 0.17, 0.42);
    legs.translate(0, 0.26, 0.18);
    geos.push(legs);

    // Manual merge to avoid pulling in BufferGeometryUtils.
    let vertCount = 0, idxCount = 0;
    geos.forEach(g => { vertCount += g.attributes.position.count; idxCount += g.index ? g.index.count : 0; });
    const pos = new Float32Array(vertCount * 3);
    const nor = new Float32Array(vertCount * 3);
    const col = new Float32Array(vertCount * 3);
    const idx = new Uint32Array(idxCount);
    let vo = 0, io = 0;
    geos.forEach((g, gi) => {
      const p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        pos[(vo + i) * 3] = p.getX(i); pos[(vo + i) * 3 + 1] = p.getY(i); pos[(vo + i) * 3 + 2] = p.getZ(i);
        nor[(vo + i) * 3] = n.getX(i); nor[(vo + i) * 3 + 1] = n.getY(i); nor[(vo + i) * 3 + 2] = n.getZ(i);
        // gi 1 is the head — tint toward skin so instanceColor reads as apparel
        const skin = gi === 1 ? 1.0 : 0.0;
        col[(vo + i) * 3] = 1 - skin * 0.05;
        col[(vo + i) * 3 + 1] = 1 - skin * 0.28;
        col[(vo + i) * 3 + 2] = 1 - skin * 0.42;
      }
      const gidx = g.index;
      for (let i = 0; i < gidx.count; i++) idx[io + i] = gidx.getX(i) + vo;
      vo += p.count; io += gidx.count;
      g.dispose();
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    return geo;
  }

  _build() {
    this.geometry = this.assets?.get('avatarBase')?.geometry || this._buildBodyGeometry();
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.7, metalness: 0.02
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, AVATARS.maxRendered);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.mesh);

    // Park every slot far below the pitch until it is claimed.
    const o = new THREE.Object3D();
    o.position.set(0, -9999, 0); o.updateMatrix();
    for (let i = AVATARS.maxRendered - 1; i >= 0; i--) {
      this.mesh.setMatrixAt(i, o.matrix);
      this._freeSlots.push(i);
    }
    this.mesh.count = AVATARS.maxRendered;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  _wire() {
    this.bus.on(EVT.AVATAR_EMOTE, ({ userId, emote }) => this.playEmote(userId, emote));
  }

  /* ------------------------------------------------------------------
   * PUBLIC
   * ---------------------------------------------------------------- */

  /**
   * Seat a user. Returns false if the seat could not be claimed.
   * @param {{userId:number, username:string, team:'home'|'away', seatIndex:number}} spec
   */
  add(spec) {
    const { userId, username, team = 'home', seatIndex } = spec;
    if (this.users.has(userId)) this.remove(userId);
    if (!this.seats.claim(seatIndex, { userId, username, team })) return false;

    const slot = this._freeSlots.length ? this._freeSlots.pop() : -1;
    const rec = { userId, username, team, seatIndex, slot, emote: null, emoteUntil: 0 };
    this.users.set(userId, rec);
    this.bySeat.set(seatIndex, userId);
    if (slot >= 0) {
      this._slotToUser[slot] = userId;
      this._placeSlot(rec);
    }
    this.bus.emit(EVT.AVATAR_ADDED, { userId, seatIndex, username, team });
    return true;
  }

  remove(userId) {
    const rec = this.users.get(userId);
    if (!rec) return;
    this.seats.release(rec.seatIndex);
    this.bySeat.delete(rec.seatIndex);
    if (rec.slot >= 0) {
      const o = new THREE.Object3D();
      o.position.set(0, -9999, 0); o.updateMatrix();
      this.mesh.setMatrixAt(rec.slot, o.matrix);
      this.mesh.instanceMatrix.needsUpdate = true;
      this._slotToUser[rec.slot] = -1;
      this._freeSlots.push(rec.slot);
    }
    this._releaseLabel(userId);
    this.users.delete(userId);
    this.bus.emit(EVT.AVATAR_REMOVED, { userId });
  }

  /** Move a seated user to another seat. */
  move(userId, newSeatIndex) {
    const rec = this.users.get(userId);
    if (!rec) return false;
    const { username, team } = rec;
    this.remove(userId);
    return this.add({ userId, username, team, seatIndex: newSeatIndex });
  }

  setTeam(userId, team) {
    const rec = this.users.get(userId);
    if (!rec) return;
    rec.team = team;
    if (rec.slot >= 0) this._colorSlot(rec);
  }

  playEmote(userId, emote) {
    const rec = this.users.get(userId);
    if (!rec || !AVATARS.emotes.includes(emote)) return;
    rec.emote = emote;
    rec.emoteUntil = performance.now() / 1000 + 3.0;
  }

  getByUser(userId) { return this.users.get(userId) || null; }
  getBySeat(seatIndex) { return this.users.get(this.bySeat.get(seatIndex)) || null; }
  get population() { return this.users.size; }

  /* ------------------------------------------------------------------
   * INTERNALS
   * ---------------------------------------------------------------- */

  _placeSlot(rec, bounce = 0) {
    const s = this.seats;
    const i = rec.seatIndex;
    const o = new THREE.Object3D();
    o.position.set(s.position[i * 3], s.position[i * 3 + 1] + 0.02 + bounce, s.position[i * 3 + 2]);
    o.rotation.set(0, s.yaw[i], 0);
    o.updateMatrix();
    this.mesh.setMatrixAt(rec.slot, o.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    this._colorSlot(rec);
  }

  _colorSlot(rec) {
    const c = AVATARS.teamColors[rec.team] || AVATARS.teamColors.home;
    this.mesh.setColorAt(rec.slot, new THREE.Color(c.primary));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  _makeLabelSprite(text) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = 'rgba(8,14,22,0.82)';
    g.fillRect(0, 12, 256, 40);
    g.strokeStyle = 'rgba(180,214,228,0.5)'; g.lineWidth = 2;
    g.strokeRect(1, 13, 254, 38);
    g.fillStyle = '#eaf4f8';
    g.font = '600 24px ui-monospace, Menlo, monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text.slice(0, 16), 128, 33);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthTest: true, depthWrite: false
    }));
    sprite.scale.set(2.6, 0.65, 1);
    return sprite;
  }

  _releaseLabel(userId) {
    const s = this.labels.get(userId);
    if (!s) return;
    this.group.remove(s);
    s.material.map.dispose(); s.material.dispose();
    this.labels.delete(userId);
  }

  /* ------------------------------------------------------------------ */

  update(dt, elapsed, camera) {
    const camPos = camera.position;
    const maxLabel = AVATARS.labelDistance;

    for (const rec of this.users.values()) {
      if (rec.slot < 0) continue;
      const i = rec.seatIndex;
      const x = this.seats.position[i * 3];
      const y = this.seats.position[i * 3 + 1];
      const z = this.seats.position[i * 3 + 2];
      const dist = Math.hypot(camPos.x - x, camPos.y - y, camPos.z - z);

      // emote animation — a bounce is enough to read at stadium scale
      let bounce = 0;
      if (rec.emote && elapsed < rec.emoteUntil) {
        const k = rec.emote === 'cheer' ? 0.30 : rec.emote === 'wave' ? 0.10 : 0.06;
        bounce = Math.abs(Math.sin(elapsed * 7)) * k;
      } else if (rec.emote) {
        rec.emote = null;
      }
      this._placeSlot(rec, bounce);

      // labels only near the camera
      const wantLabel = dist < maxLabel;
      const has = this.labels.has(rec.userId);
      if (wantLabel && !has) {
        const sp = this._makeLabelSprite(rec.username);
        this.group.add(sp);
        this.labels.set(rec.userId, sp);
      } else if (!wantLabel && has) {
        this._releaseLabel(rec.userId);
      }
      const label = this.labels.get(rec.userId);
      if (label) label.position.set(x, y + 1.55 + bounce, z);
    }
  }

  dispose() {
    for (const id of [...this.labels.keys()]) this._releaseLabel(id);
    this.mesh.dispose(); this.geometry.dispose(); this.material.dispose();
    this.scene.remove(this.group);
  }
}

export default AvatarManager;
