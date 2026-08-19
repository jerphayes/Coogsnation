/**
 * AssetLoader
 * ---------------------------------------------------------------------------
 * GLTF/GLB pipeline with Draco geometry compression, KTX2 (Basis) textures and
 * Meshopt decoding, plus a cache and a progress channel.
 *
 * Design decision worth knowing about: every asset is OPTIONAL. The engine
 * boots fully procedural, and `get(id)` returns null for anything that did not
 * load. That means you can ship art incrementally — drop a seat.glb in and the
 * seats upgrade; leave it out and nothing breaks. A hard dependency on a CDN
 * or an art pipeline is the fastest way to make a web build fragile.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { ASSETS } from '../config/engine.config.js';
import { EVT } from './EventBus.js';

export class AssetLoader {
  /** @param {{renderer:THREE.WebGLRenderer, bus:EventBus}} ctx */
  constructor(ctx) {
    this.renderer = ctx.renderer;
    this.bus = ctx.bus;
    this.cache = new Map();
    this.failed = new Set();

    this.manager = new THREE.LoadingManager();
    this.manager.onProgress = (url, loaded, total) => {
      this.bus.emit(EVT.LOAD_PROGRESS, {
        fraction: total ? loaded / total : 0,
        message: `Loading ${url.split('/').pop()}`
      });
    };

    this.draco = new DRACOLoader(this.manager);
    this.draco.setDecoderPath(ASSETS.dracoDecoderPath);
    this.draco.preload();

    this.ktx2 = new KTX2Loader(this.manager);
    this.ktx2.setTranscoderPath(ASSETS.ktx2TranscoderPath);
    this.ktx2.detectSupport(this.renderer);

    this.gltf = new GLTFLoader(this.manager);
    this.gltf.setDRACOLoader(this.draco);
    this.gltf.setKTX2Loader(this.ktx2);
    this.gltf.setMeshoptDecoder(MeshoptDecoder);
  }

  /**
   * Load everything declared in ASSETS.models. Missing or broken entries are
   * recorded and skipped, never thrown.
   * @returns {Promise<Map<string, any>>}
   */
  async loadManifest(manifest = ASSETS.models) {
    const entries = Object.entries(manifest || {});
    if (!entries.length) return this.cache;

    let done = 0;
    await Promise.all(entries.map(async ([id, url]) => {
      try {
        const gltf = await this.gltf.loadAsync(url);
        this.cache.set(id, this._flatten(gltf));
      } catch (err) {
        console.warn(`[AssetLoader] "${id}" unavailable, using procedural fallback:`, err.message);
        this.failed.add(id);
      } finally {
        done++;
        this.bus.emit(EVT.LOAD_PROGRESS, {
          fraction: done / entries.length,
          message: `Assets ${done}/${entries.length}`
        });
      }
    }));
    return this.cache;
  }

  /**
   * Reduce a GLTF to the pieces the engine actually wants: the scene, plus the
   * first mesh's geometry/material for instancing.
   */
  _flatten(gltf) {
    let geometry = null, material = null;
    gltf.scene.traverse(o => {
      if (!geometry && o.isMesh) { geometry = o.geometry; material = o.material; }
    });
    return { scene: gltf.scene, animations: gltf.animations, geometry, material };
  }

  get(id) { return this.cache.get(id) || null; }
  has(id) { return this.cache.has(id); }

  /** Optional HDR environment. Skipped silently if not configured. */
  async loadEnvironment(scene) {
    if (!ASSETS.environment) return null;
    const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js');
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    try {
      const hdr = await new RGBELoader().loadAsync(ASSETS.environment);
      const env = pmrem.fromEquirectangular(hdr).texture;
      scene.environment = env;
      hdr.dispose(); pmrem.dispose();
      return env;
    } catch (err) {
      console.warn('[AssetLoader] environment map unavailable:', err.message);
      pmrem.dispose();
      return null;
    }
  }

  dispose() {
    this.draco.dispose();
    this.ktx2.dispose();
    this.cache.clear();
  }
}

export default AssetLoader;
