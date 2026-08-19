/**
 * VenueEngine
 * ---------------------------------------------------------------------------
 * Owns the renderer, the scene graph root, the frame loop and module
 * lifecycle. Modules are registered, not imported by each other — the engine
 * is the only thing that knows the full set, and the EventBus is the only way
 * they communicate.
 *
 * Named for what it is. This is not a stadium engine that happens to run other
 * venues; sports are the first deployment of a venue runtime.
 *
 * The engine knows how to manage. The renderer knows how to draw. The director
 * knows how to orchestrate. Applications consume all three and contribute
 * nothing back into them.
 *
 * Frame budget management: the renderer starts at the configured pixel ratio
 * and steps down when the rolling frame time exceeds RENDER.adaptiveFrameBudget.
 * That is what keeps a mid-range phone at 30 fps instead of at 9.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { RENDER, CAMERA } from '../config/engine.config.js';
import { EventBus, EVT } from './EventBus.js';

const isMobile = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

export class VenueEngine {
  /** @param {{canvas:HTMLCanvasElement}} opts */
  constructor(opts) {
    this.canvas = opts.canvas;
    this.bus = new EventBus();
    this.mobile = isMobile();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.mobile,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.maxPixelRatio = this.mobile ? RENDER.mobileMaxPixelRatio : RENDER.maxPixelRatio;
    this._pixelRatio = Math.min(devicePixelRatio, this.maxPixelRatio);
    this.renderer.setPixelRatio(this._pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = RENDER.exposure;
    this.renderer.shadowMap.enabled = RENDER.shadows.enabled && !this.mobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070c16, RENDER.fogDensity);

    this.cameraObject = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
    this.cameraObject.position.set(-186, 128, -206);

    this.clock = new THREE.Clock();
    this.modules = new Map();
    this._running = false;
    this._frameTimes = [];
    this._statTimer = 0;
    this._boardTimer = 0;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._pointerMoved = false;

    this._setupComposer();
    this._bindDOM();
    this.resize();
  }

  /* ------------------------------------------------------------------ */

  _setupComposer() {
    if (!RENDER.bloom.enabled || this.mobile) { this.composer = null; return; }
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.cameraObject));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      RENDER.bloom.strength, RENDER.bloom.radius, RENDER.bloom.threshold
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  _bindDOM() {
    addEventListener('resize', () => this.resize());

    let downAt = null;
    this.canvas.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY }; });
    this.canvas.addEventListener('pointerup', e => {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      downAt = null;
      if (moved > 6) return;                       // it was a drag, not a click
      this._pick(e.clientX, e.clientY, true);
    });
    this.canvas.addEventListener('pointermove', e => {
      this._hoverX = e.clientX; this._hoverY = e.clientY;
      this._pointerMoved = true;
    });
  }

  _pick(clientX, clientY, commit) {
    const seats = this.modules.get('seats');
    if (!seats) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.cameraObject);
    const idx = seats.raycast(this.raycaster);
    if (commit) {
      if (idx >= 0) this.bus.emit(EVT.SEAT_PICK, { seatIndex: idx });
    } else {
      seats.setHovered(idx);
    }
  }

  /* ------------------------------------------------------------------
   * MODULES
   * ---------------------------------------------------------------- */

  /**
   * @param {string} name
   * @param {object} instance  Anything with an optional update(dt, elapsed, camera)
   *                           and an optional dispose().
   */
  register(name, instance) {
    this.modules.set(name, instance);
    Object.defineProperty(this, name, { value: instance, configurable: true, writable: true });
    return instance;
  }

  get(name) { return this.modules.get(name); }

  /**
   * `engine.loadPlugin(SomePlugin)` — the target philosophy from the Phase II
   * brief. Delegates to PluginHost, which is registered as a module like
   * everything else.
   */
  async loadPlugin(PluginClassOrInstance, options, opts) {
    const host = this.modules.get('plugins');
    if (!host) throw new Error('PluginHost is not registered — wire it in main.js');
    const plugin = await host.load(PluginClassOrInstance, options, opts);
    this.bus.emit('plugin:loaded', { id: plugin.id, version: plugin.version });
    return plugin;
  }

  async unloadPlugin(id) {
    const ok = await this.modules.get('plugins')?.unload(id);
    if (ok) this.bus.emit('plugin:unloaded', { id });
    return ok;
  }

  /* ------------------------------------------------------------------ */

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.cameraObject.aspect = w / h;
    this.cameraObject.updateProjectionMatrix();
    this.bus.emit(EVT.ENGINE_RESIZE, { width: w, height: h });
  }

  start() {
    if (this._running) return;
    this._running = true;
    this.clock.start();
    this.bus.emit(EVT.ENGINE_READY, {});
    const loop = () => {
      if (!this._running) return;
      this._frame();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() { this._running = false; }

  _frame() {
    const t0 = performance.now();
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.elapsedTime;

    // hover picking throttled to pointer movement only
    if (this._pointerMoved) {
      this._pointerMoved = false;
      this._pick(this._hoverX, this._hoverY, false);
    }

    // Registration order is tick order, and main.js registers the director and
    // the plugin host AFTER the modules they observe, so a directive issued
    // this frame reads state that is already current.
    //
    // Do NOT also call director.update()/plugins.update() explicitly here.
    // Both are registered modules, so an explicit call ticks them twice per
    // frame. That bug shipped once and made a 30-second poll expire in 15.
    for (const m of this.modules.values()) {
      m.update?.(dt, elapsed, this.cameraObject);
    }
    this.modules.get('seats')?.updateLOD(this.cameraObject, dt);

    // Boards are driven by the ScoreboardObject twin (wired in main.js), not
    // from here. An earlier revision also repainted them on this loop through
    // `modules.get('stadium')` -- a module name that no longer existed, so
    // optional chaining silently swallowed the dead call. Two writers to one
    // canvas was the latent bug; one writer, the twin, is the fix.

    this.bus.emit(EVT.ENGINE_TICK, { dt, elapsed });

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.cameraObject);

    this._trackPerformance(performance.now() - t0, dt);
  }

  _trackPerformance(frameMs, dt) {
    this._frameTimes.push(frameMs);
    if (this._frameTimes.length > 60) this._frameTimes.shift();

    this._statTimer += dt;
    if (this._statTimer < 0.5) return;
    this._statTimer = 0;

    const avg = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;

    // Adaptive resolution: step down before dropping frames, step back up when
    // there is headroom. Hysteresis keeps it from oscillating.
    if (avg > RENDER.adaptiveFrameBudget && this._pixelRatio > 0.75) {
      this._pixelRatio = Math.max(0.75, this._pixelRatio - 0.15);
      this.renderer.setPixelRatio(this._pixelRatio);
      this.modules.get('crowd')?.setPixelRatio(this._pixelRatio);
    } else if (avg < RENDER.adaptiveFrameBudget * 0.6 &&
               this._pixelRatio < Math.min(devicePixelRatio, this.maxPixelRatio)) {
      this._pixelRatio = Math.min(devicePixelRatio, this.maxPixelRatio, this._pixelRatio + 0.1);
      this.renderer.setPixelRatio(this._pixelRatio);
      this.modules.get('crowd')?.setPixelRatio(this._pixelRatio);
    }

    const info = this.renderer.info.render;
    this.modules.get('ui')?.updateStats({
      fps: 1000 / Math.max(avg, 0.001),
      users: this.modules.get('avatars')?.population ?? 0,
      calls: info.calls,
      triangles: info.triangles
    });
  }

  dispose() {
    this.stop();
    for (const m of this.modules.values()) m.dispose?.();
    this.modules.clear();
    this.bus.clear();
    this.composer?.dispose();
    this.renderer.dispose();
  }
}

export default VenueEngine;
