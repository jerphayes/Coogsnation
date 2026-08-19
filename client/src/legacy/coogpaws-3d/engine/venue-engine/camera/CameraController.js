/**
 * CameraController
 * ---------------------------------------------------------------------------
 * A small state machine over six modes. Only one mode drives the camera at a
 * time; transitions between them are tweened so a click on a seat 400 m away
 * reads as a move rather than a cut.
 *
 *   orbit      — OrbitControls around the bowl centre (default)
 *   fly        — free 6-DoF, WASD + QE, pointer look
 *   walk       — fly constrained to eye height above a ground plane
 *   seat       — locked to a seat viewpoint, limited yaw/pitch
 *   spectator  — orbit locked low and close, framed on the field
 *   broadcast  — automated dolly on a circular rail, no input
 *
 * The transition tween is deliberately separate from the modes: it takes over
 * the camera for `transitionSeconds`, then hands control to the target mode.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CAMERA } from '../config/engine.config.js';
import { EVT } from '../core/EventBus.js';

const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export class CameraController {
  /** @param {{camera, domElement, bus, seats}} ctx */
  constructor(ctx) {
    this.camera = ctx.camera;
    this.dom = ctx.domElement;
    this.bus = ctx.bus;
    this.seats = ctx.seats;
    /** Framing distances differ wildly between a stadium and an arena. */
    this.frame = ctx.venue.camera;

    this.mode = null;
    this.target = new THREE.Vector3(...this.frame.orbitTarget);

    this.orbit = new OrbitControls(this.camera, this.dom);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.06;
    this.orbit.minDistance = this.frame.orbitMin;
    this.orbit.maxDistance = this.frame.orbitMax;
    this.orbit.maxPolarAngle = Math.PI * 0.495;
    this.orbit.target.copy(this.target);
    this.orbit.autoRotateSpeed = 0.28;

    this._keys = new Set();
    this._vel = new THREE.Vector3();
    this._yaw = 0; this._pitch = 0;
    this._pointerLocked = false;
    this._seatIndex = -1;
    this._seatBase = { yaw: 0, pitch: 0 };
    this._transition = null;
    this._broadcastPhase = 0;

    this._bindInput();
    this.setMode(CAMERA.default);

    this.bus.on(EVT.SEAT_FOCUS, ({ seatIndex }) => this.gotoSeat(seatIndex));
  }

  /* ------------------------------------------------------------------ */

  _bindInput() {
    const down = e => {
      this._keys.add(e.code);
      if (e.code === 'Escape' && this.mode === 'seat') this.setMode('orbit');
    };
    const up = e => this._keys.delete(e.code);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    this._unbind = () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };

    this.dom.addEventListener('pointerdown', () => {
      if (this.mode === 'fly' || this.mode === 'walk') this.dom.requestPointerLock?.();
    });
    document.addEventListener('pointerlockchange', () => {
      this._pointerLocked = document.pointerLockElement === this.dom;
    });
    document.addEventListener('mousemove', e => {
      if (this._pointerLocked && (this.mode === 'fly' || this.mode === 'walk')) {
        this._yaw   -= e.movementX * 0.0022;
        this._pitch -= e.movementY * 0.0022;
        this._pitch = THREE.MathUtils.clamp(this._pitch, -1.45, 1.45);
      }
    });

    // Seat mode look: drag inside limits, no pointer lock (mobile friendly)
    let dragging = false, lx = 0, ly = 0;
    this.dom.addEventListener('pointerdown', e => {
      if (this.mode !== 'seat') return;
      dragging = true; lx = e.clientX; ly = e.clientY;
    });
    this.dom.addEventListener('pointerup', () => { dragging = false; });
    this.dom.addEventListener('pointermove', e => {
      if (!dragging || this.mode !== 'seat') return;
      this._yaw   = THREE.MathUtils.clamp(
        this._yaw - (e.clientX - lx) * 0.004,
        this._seatBase.yaw - CAMERA.seat.yawLimit,
        this._seatBase.yaw + CAMERA.seat.yawLimit);
      this._pitch = THREE.MathUtils.clamp(
        this._pitch - (e.clientY - ly) * 0.004,
        -CAMERA.seat.pitchLimit, CAMERA.seat.pitchLimit);
      lx = e.clientX; ly = e.clientY;
    });
  }

  /* ------------------------------------------------------------------
   * MODES
   * ---------------------------------------------------------------- */

  setMode(mode, options = {}) {
    if (!CAMERA.modes.includes(mode)) return;
    this.mode = mode;
    this.orbit.enabled = (mode === 'orbit' || mode === 'spectator');
    this.orbit.autoRotate = !!options.autoRotate && mode === 'orbit';

    if (mode === 'spectator') {
      const sp = this.frame.spectator;
      this.orbit.minDistance = sp.min;
      this.orbit.maxDistance = sp.max;
      this.orbit.target.set(...sp.target);
    } else if (mode === 'orbit') {
      this.orbit.minDistance = this.frame.orbitMin;
      this.orbit.maxDistance = this.frame.orbitMax;
      this.orbit.target.copy(this.target);
    }
    if (mode !== 'fly' && mode !== 'walk') document.exitPointerLock?.();

    if (mode === 'fly' || mode === 'walk') {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this._yaw = Math.atan2(-dir.x, -dir.z);
      this._pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    }
    this.bus.emit(EVT.CAMERA_MODE, { mode, options });
  }

  setAutoRotate(on) { this.orbit.autoRotate = on && this.mode === 'orbit'; }

  /** Fly the camera to a seat, then hand over to seat mode. */
  gotoSeat(seatIndex) {
    if (seatIndex < 0) return;
    const vp = this.seats.getViewpoint(seatIndex, CAMERA.seat.eyeHeight);
    this._seatIndex = seatIndex;
    const yaw = this.seats.yaw[seatIndex];
    this._seatBase = { yaw, pitch: -0.12 };

    this._transition = {
      t: 0,
      duration: CAMERA.seat.transitionSeconds,
      fromPos: this.camera.position.clone(),
      fromTarget: this.orbit.target.clone(),
      toPos: vp.position.clone(),
      toTarget: vp.target.clone(),
      onDone: () => {
        this._yaw = yaw; this._pitch = -0.12;
        this.setMode('seat');
      }
    };
    this.orbit.enabled = false;
  }

  /**
   * Fly to a named preset declared in `venue.camera.views`.
   * Reuses the same eased transition as gotoSeat/reset — no new machinery.
   * @param {string} name
   * @returns {boolean} false if the venue does not declare that view
   */
  setView(name) {
    const view = this.frame.views?.[name];
    if (!view) return false;

    this._viewName = name;
    this._transition = {
      t: 0,
      duration: view.seconds ?? 1.5,
      fromPos: this.camera.position.clone(),
      fromTarget: this.orbit.target.clone(),
      toPos: new THREE.Vector3(...view.position),
      toTarget: new THREE.Vector3(...view.target),
      onDone: () => {
        this.mode = 'preset';
        this.orbit.target.set(...view.target);
        // free-roam presets hand control back to the user
        if (view.freeRoam) this.setMode('orbit');
        else this.orbit.enabled = false;
        this.bus.emit(EVT.CAMERA_MODE, { mode: 'preset', view: name });
      }
    };
    this.orbit.enabled = false;
    return true;
  }

  /** Names of every preset this venue declares. */
  views() { return Object.keys(this.frame.views || {}); }

  /** Frame the whole venue again. */
  reset() {
    this._transition = {
      t: 0, duration: 1.4,
      fromPos: this.camera.position.clone(),
      fromTarget: this.orbit.target.clone(),
      toPos: new THREE.Vector3(...this.frame.home),
      toTarget: new THREE.Vector3(...this.frame.orbitTarget),
      onDone: () => this.setMode('orbit')
    };
    this.orbit.enabled = false;
  }

  /* ------------------------------------------------------------------ */

  update(dt, elapsed) {
    if (this._transition) return this._updateTransition(dt);

    switch (this.mode) {
      case 'orbit':
      case 'spectator':
        this.orbit.update();
        break;

      case 'fly':
      case 'walk': {
        const cfg = this.mode === 'fly' ? CAMERA.fly : CAMERA.walk;
        const speed = cfg.speed * (this._keys.has('ShiftLeft') ? (CAMERA.fly.boost) : 1);
        const fwd = new THREE.Vector3(
          -Math.sin(this._yaw) * Math.cos(this._pitch),
          this.mode === 'fly' ? Math.sin(this._pitch) : 0,
          -Math.cos(this._yaw) * Math.cos(this._pitch)
        ).normalize();
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

        const acc = new THREE.Vector3();
        if (this._keys.has('KeyW')) acc.add(fwd);
        if (this._keys.has('KeyS')) acc.sub(fwd);
        if (this._keys.has('KeyD')) acc.add(right);
        if (this._keys.has('KeyA')) acc.sub(right);
        if (this.mode === 'fly') {
          if (this._keys.has('KeyE') || this._keys.has('Space')) acc.y += 1;
          if (this._keys.has('KeyQ')) acc.y -= 1;
        }
        if (acc.lengthSq() > 0) acc.normalize().multiplyScalar(speed * dt);
        this._vel.add(acc).multiplyScalar(CAMERA.fly.damping);
        this.camera.position.add(this._vel);
        if (this.mode === 'walk') this.camera.position.y = CAMERA.walk.eyeHeight;

        const look = this.camera.position.clone().add(new THREE.Vector3(
          -Math.sin(this._yaw) * Math.cos(this._pitch),
          Math.sin(this._pitch),
          -Math.cos(this._yaw) * Math.cos(this._pitch)
        ));
        this.camera.lookAt(look);
        break;
      }

      case 'seat': {
        if (this._seatIndex < 0) break;
        const vp = this.seats.getViewpoint(this._seatIndex, CAMERA.seat.eyeHeight);
        this.camera.position.lerp(vp.position, 0.25);
        const look = this.camera.position.clone().add(new THREE.Vector3(
          Math.sin(this._yaw) * Math.cos(this._pitch),
          Math.sin(this._pitch),
          Math.cos(this._yaw) * Math.cos(this._pitch)
        ).multiplyScalar(20));
        this.camera.lookAt(look);
        break;
      }

      case 'broadcast': {
        const bc = this.frame.broadcast;
        this._broadcastPhase += dt / bc.period * Math.PI * 2;
        const r = bc.radius;
        const h = bc.height + Math.sin(this._broadcastPhase * 0.7) * 14;
        this.camera.position.set(
          Math.cos(this._broadcastPhase) * r,
          h,
          Math.sin(this._broadcastPhase) * r * 0.82
        );
        this.camera.lookAt(0, 10, 0);
        break;
      }
    }
  }

  _updateTransition(dt) {
    const tr = this._transition;
    tr.t += dt / tr.duration;
    const k = easeInOut(Math.min(tr.t, 1));
    this.camera.position.lerpVectors(tr.fromPos, tr.toPos, k);
    const look = new THREE.Vector3().lerpVectors(tr.fromTarget, tr.toTarget, k);
    this.camera.lookAt(look);
    this.orbit.target.copy(look);
    if (tr.t >= 1) {
      this._transition = null;
      tr.onDone?.();
    }
  }

  dispose() {
    this._unbind?.();
    this.orbit.dispose();
  }
}

export default CameraController;
