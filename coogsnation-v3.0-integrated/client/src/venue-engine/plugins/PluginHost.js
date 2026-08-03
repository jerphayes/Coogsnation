/**
 * PluginHost
 * ---------------------------------------------------------------------------
 * Implements `engine.loadPlugin(...)`.
 *
 * Responsibilities, in the order they matter:
 *   1. resolve declared dependencies and refuse cycles
 *   2. build a context containing exactly the capabilities a plugin declared
 *   3. drive the lifecycle and guarantee teardown
 *
 * On (2): the context is assembled per plugin, not shared. A plugin that did
 * not ask for `services` has no `services` property to reach — the guard is
 * structural rather than a runtime check it could skip.
 *
 * On (3): plugins that throw during install are rolled back and marked failed,
 * not left half-installed. A partially installed plugin with live listeners is
 * worse than an absent one.
 */

import { CAPABILITY } from './Plugin.js';

export class PluginHost {
  /**
   * @param {{engine, bus, registry, director, services, uiRoot, config}} ctx
   */
  constructor(ctx) {
    this.engine = ctx.engine;
    this.bus = ctx.bus;
    this.registry = ctx.registry;
    this.director = ctx.director;
    this.services = ctx.services;
    this.uiRoot = ctx.uiRoot;
    this.config = ctx.config;

    /** @type {Map<string, {plugin, status, error}>} */
    this.plugins = new Map();
    /** @type {Set<object>} plugins that declared TICK */
    this._ticking = new Set();
  }

  /* ======================================================================
   * LOADING
   * ==================================================================== */

  /**
   * @param {typeof import('./Plugin.js').Plugin | object} PluginClassOrInstance
   * @param {object} [options] passed to the constructor
   * @param {{autoActivate?:boolean}} [opts]
   */
  async load(PluginClassOrInstance, options = {}, opts = {}) {
    const plugin = typeof PluginClassOrInstance === 'function'
      ? new PluginClassOrInstance(options)
      : PluginClassOrInstance;

    const id = plugin.id;
    if (!id || id === 'unnamed-plugin') {
      throw new Error('Plugin must declare a static id');
    }
    if (this.plugins.has(id)) {
      console.warn(`[PluginHost] "${id}" already loaded`);
      return this.plugins.get(id).plugin;
    }

    const requires = plugin.constructor.requires || [];
    const missing = requires.filter(r => !this.plugins.has(r));
    if (missing.length) {
      throw new Error(`Plugin "${id}" requires [${missing.join(', ')}] — load those first`);
    }

    const declared = plugin.constructor.capabilities || [];
    const unknown = declared.filter(c => !Object.values(CAPABILITY).includes(c));
    if (unknown.length) {
      throw new Error(`Plugin "${id}" declares unknown capabilities: ${unknown.join(', ')}`);
    }

    const entry = { plugin, status: 'installing', error: null };
    this.plugins.set(id, entry);

    try {
      const context = this._buildContext(plugin, declared);
      await plugin.install(context);
      entry.status = 'installed';

      if (declared.includes(CAPABILITY.TICK)) this._ticking.add(plugin);
      if (opts.autoActivate !== false) await this.activate(id);

      console.info(`[PluginHost] ${id}@${plugin.version} loaded [${declared.join(', ') || 'no capabilities'}]`);
      return plugin;
    } catch (err) {
      entry.status = 'failed';
      entry.error = err;
      this._ticking.delete(plugin);
      // Roll back rather than leave listeners dangling.
      try { await plugin.uninstall(); } catch { /* best effort */ }
      this.plugins.delete(id);
      throw new Error(`Plugin "${id}" failed to install: ${err.message}`);
    }
  }

  async activate(id) {
    const entry = this.plugins.get(id);
    if (!entry) throw new Error(`Plugin "${id}" is not loaded`);
    if (entry.plugin.active) return;
    await entry.plugin.activate();
    entry.status = 'active';
  }

  async deactivate(id) {
    const entry = this.plugins.get(id);
    if (!entry?.plugin.active) return;
    await entry.plugin.deactivate();
    entry.status = 'installed';
  }

  async unload(id) {
    const entry = this.plugins.get(id);
    if (!entry) return false;
    // Anything depending on this must go first.
    for (const [otherId, other] of this.plugins) {
      if ((other.plugin.constructor.requires || []).includes(id)) await this.unload(otherId);
    }
    if (entry.plugin.active) await entry.plugin.deactivate();
    await entry.plugin.uninstall();
    this._ticking.delete(entry.plugin);
    this.plugins.delete(id);
    return true;
  }

  get(id) { return this.plugins.get(id)?.plugin || null; }
  list() {
    return [...this.plugins.values()].map(e => ({
      id: e.plugin.id,
      version: e.plugin.version,
      status: e.status,
      active: e.plugin.active,
      capabilities: e.plugin.constructor.capabilities || [],
      description: e.plugin.constructor.description || ''
    }));
  }

  /* ======================================================================
   * CONTEXT CONSTRUCTION
   * ==================================================================== */

  _buildContext(plugin, declared) {
    const has = c => declared.includes(c);
    const ctx = {
      /** Always available: identity and a namespaced logger. */
      pluginId: plugin.id,
      log: (...a) => console.log(`[${plugin.id}]`, ...a),
      warn: (...a) => console.warn(`[${plugin.id}]`, ...a)
    };

    if (has(CAPABILITY.CONFIG)) {
      ctx.config = Object.freeze({ ...this.config });
      ctx.venue = this.engine.get('venue');
    }

    if (has(CAPABILITY.REGISTRY_READ)) {
      const r = this.registry;
      ctx.registry = has(CAPABILITY.REGISTRY_WRITE) ? r : Object.freeze({
        get: id => r.get(id),
        query: (c, o) => r.query(c, o),
        find: c => r.find(c),
        near: (...a) => r.near(...a),
        summary: (t, f) => r.summary(t, f),
        countOfType: t => r.countOfType(t),
        types: () => r.types(),
        watch: h => r.watch(h)
      });
    }

    if (has(CAPABILITY.EVENTS)) {
      const bus = this.bus;
      ctx.events = {
        on: (type, h) => plugin.onTeardown(bus.on(type, h)),
        once: (type, h) => plugin.onTeardown(bus.once(type, h))
      };
      if (has(CAPABILITY.EVENTS_EMIT)) ctx.events.emit = (type, p) => bus.emit(type, p);
    }

    if (has(CAPABILITY.DIRECTOR) && this.director) {
      const d = this.director;
      ctx.director = {
        issue: raw => d.issue({ ...raw, source: `plugin:${plugin.id}` }),
        propose: raw => d.propose({ ...raw, source: `plugin:${plugin.id}` }),
        addBehavior: b => plugin.onTeardown(d.addBehavior({ ...b, id: `${plugin.id}:${b.id}` })),
        registerAdapter: (ch, fn) => plugin.onTeardown(d.registerAdapter(ch, fn)),
        history: n => d.history(n)
      };
    }

    if (has(CAPABILITY.SERVICES) && this.services) {
      ctx.services = Object.freeze({
        get: name => this.services.get(name),
        has: name => this.services.has(name)
      });
    }

    if (has(CAPABILITY.UI)) {
      ctx.ui = {
        /**
         * Mount a panel. The host owns the element so teardown is guaranteed
         * even if the plugin forgets.
         * @param {{title:string, html:string, position?:string}} spec
         * @returns {HTMLElement}
         */
        mountPanel: spec => {
          const el = document.createElement('section');
          el.className = `hud panel plugin-panel ${spec.position || 'hud-plugin'}`;
          el.dataset.plugin = plugin.id;
          el.innerHTML = `<div class="panel-h">${spec.title || plugin.id}</div>${spec.html || ''}`;
          this.uiRoot.appendChild(el);
          plugin.onTeardown(() => el.remove());
          return el;
        },
        notify: (text, level = 'info') => this.bus.emit('ui:notice', { text, level })
      };
    }

    if (has(CAPABILITY.SCENE)) {
      ctx.scene = this.engine.scene;
    }

    return Object.freeze(ctx);
  }

  /* ======================================================================
   * TICK
   * ==================================================================== */

  update(dt, elapsed) {
    for (const p of this._ticking) {
      if (!p.active) continue;
      try { p.tick(dt, elapsed); }
      catch (err) { console.error(`[PluginHost] "${p.id}" tick threw:`, err); }
    }
  }

  async dispose() {
    for (const id of [...this.plugins.keys()]) await this.unload(id);
  }
}

export default PluginHost;
