/**
 * Plugin
 * ---------------------------------------------------------------------------
 * The extension contract. A plugin adds capability without modifying engine
 * code — voice, streaming, fantasy, trivia, polling, sponsorship, merchandise,
 * commentary, statistics, analytics.
 *
 * CAPABILITY SCOPING
 * ------------------
 * A plugin declares what it needs. The host builds a context containing only
 * those surfaces, and nothing else. A trivia plugin that declared `['ui',
 * 'registry:read']` has no `services`, no `director`, and no write access to
 * the twin — not by convention, but because those properties are absent from
 * the object it was handed.
 *
 * This is not a security boundary. Anything running in the page can reach the
 * engine if it tries hard enough. It is a *design* boundary: it makes a
 * plugin's blast radius legible in one line, and it makes an over-reaching
 * plugin fail loudly at install rather than quietly couple itself to internals
 * that were never meant to be public.
 *
 * LIFECYCLE
 * ---------
 *   install(ctx)     once — acquire resources, register handlers
 *   activate()       may be called repeatedly — start doing work
 *   deactivate()     stop doing work, keep resources
 *   uninstall()      release everything; must leave no listeners behind
 *
 * The split between activate and install exists because a venue often wants a
 * plugin loaded but dormant — a sponsorship plugin installed all season,
 * activated only during breaks.
 */

/** Every capability a plugin may request. */
export const CAPABILITY = {
  /** Read the digital twin. */
  REGISTRY_READ: 'registry:read',
  /** Mutate object state and add objects. */
  REGISTRY_WRITE: 'registry:write',
  /** Subscribe to engine events. */
  EVENTS: 'events',
  /** Emit engine events. */
  EVENTS_EMIT: 'events:emit',
  /** Propose and issue directives, add behaviours. */
  DIRECTOR: 'director',
  /** Mount UI panels. */
  UI: 'ui',
  /** Reach bound backend services (auth, chat, voice, persistence). */
  SERVICES: 'services',
  /** Per-frame tick. */
  TICK: 'tick',
  /** Read engine + venue configuration. */
  CONFIG: 'config',
  /** Add objects to the three.js scene. Granted sparingly. */
  SCENE: 'scene'
};

export class Plugin {
  /** @type {string} unique, stable — used as the storage and UI namespace */
  static id = 'unnamed-plugin';
  /** @type {string} */
  static version = '0.0.0';
  /** @type {string[]} capabilities requested; the host grants exactly these */
  static capabilities = [];
  /** @type {string[]} ids of plugins that must be installed first */
  static requires = [];
  /** @type {string} shown in the plugin list */
  static description = '';

  constructor(options = {}) {
    this.options = options;
    /** @type {object|null} the scoped context, set at install */
    this.ctx = null;
    this._active = false;
    this._teardown = [];
  }

  get id() { return this.constructor.id; }
  get version() { return this.constructor.version; }
  get active() { return this._active; }

  /* ======================================================================
   * LIFECYCLE — override these
   * ==================================================================== */

  /** @param {object} ctx capability-scoped context built by PluginHost */
  async install(ctx) { this.ctx = ctx; }

  async activate() { this._active = true; }

  async deactivate() { this._active = false; }

  async uninstall() {
    this._teardown.splice(0).forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    this.ctx = null;
    this._active = false;
  }

  /** Called each frame only if the plugin declared CAPABILITY.TICK. */
  tick(dt, elapsed) {}

  /* ======================================================================
   * HELPERS
   * ==================================================================== */

  /**
   * Register a teardown so `uninstall()` is correct by construction. Every
   * subscription a plugin makes should be wrapped in this.
   * @param {() => void} fn
   */
  onTeardown(fn) { this._teardown.push(fn); return fn; }

  /** Namespaced storage key, so two plugins cannot collide. */
  key(suffix) { return `plugin.${this.id}.${suffix}`; }
}

export default Plugin;
