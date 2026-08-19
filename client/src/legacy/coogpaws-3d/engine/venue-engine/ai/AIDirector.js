/**
 * AIDirector
 * ---------------------------------------------------------------------------
 * The orchestration layer. It decides what the venue should *do*; modules
 * decide how. It holds no references to CrowdManager, LightingManager,
 * CameraController or anything else that draws.
 *
 * SHAPE
 * -----
 *   Behaviours observe the twin and propose directives.
 *   The director arbitrates between them and dispatches the winners.
 *   Adapters translate directives into whatever each module already understands.
 *
 * The adapter layer is the part worth defending. Without it, adding the
 * director would mean editing every module to accept a new command shape —
 * a redesign of exactly the kind that is now frozen. With it, the director
 * was added without touching a single existing module: adapters subscribe to
 * directives and call the same public methods a human would.
 *
 * ARBITRATION
 * -----------
 * Two behaviours will eventually want the same channel in the same frame.
 * Highest priority wins; ties break toward the most recently issued, because
 * later information is usually better information. A channel that just
 * received a directive is held for its cooldown so an excited behaviour cannot
 * strobe the lighting rig.
 *
 * Everything issued is recorded. That log is a replay track, an analytics
 * feed, and the first thing to read when the venue does something surprising.
 */

import { CHANNEL, PRIORITY, validateDirective } from './directives.js';
import { EVT } from '../core/EventBus.js';

/** Minimum seconds between directives on a channel, per channel. */
const DEFAULT_COOLDOWN = {
  [CHANNEL.CROWD]: 6,
  [CHANNEL.CAMERA]: 4,
  [CHANNEL.LIGHTING]: 2,
  [CHANNEL.AUDIO]: 1,
  [CHANNEL.EFFECTS]: 8,
  [CHANNEL.ANNOUNCE]: 10,
  [CHANNEL.SCOREBOARD]: 0.5
};

export class AIDirector {
  /** @param {{bus, registry, cooldowns?:object, historyLimit?:number}} ctx */
  constructor(ctx) {
    this.bus = ctx.bus;
    this.registry = ctx.registry;
    this.cooldowns = Object.assign({}, DEFAULT_COOLDOWN, ctx.cooldowns || {});

    /** @type {Array<{id:string, tick:Function, enabled:boolean}>} */
    this.behaviors = [];
    /** @type {Map<string, Function[]>} channel → adapters */
    this._adapters = new Map();

    this._lastDispatch = new Map();     // channel → time
    this._pending = new Map();          // channel → best directive this tick
    this._history = [];
    this._historyLimit = ctx.historyLimit ?? 200;
    this._elapsed = 0;
    this._enabled = true;
  }

  /* ======================================================================
   * BEHAVIOURS — the things that propose
   * ==================================================================== */

  /**
   * @param {{id:string, tick:(ctx:object, propose:Function) => void, enabled?:boolean}} behavior
   */
  addBehavior(behavior) {
    if (!behavior?.id || typeof behavior.tick !== 'function') {
      throw new TypeError('Behavior requires { id, tick(ctx, propose) }');
    }
    this.behaviors.push({ enabled: true, ...behavior });
    return () => {
      const i = this.behaviors.findIndex(b => b.id === behavior.id);
      if (i >= 0) this.behaviors.splice(i, 1);
    };
  }

  setBehaviorEnabled(id, enabled) {
    const b = this.behaviors.find(x => x.id === id);
    if (b) b.enabled = enabled;
  }

  /* ======================================================================
   * ADAPTERS — the things that translate
   * ==================================================================== */

  /**
   * Register a translator for a channel. Adapters are the ONLY place the
   * director's vocabulary meets a module's API.
   * @param {string} channel
   * @param {(directive:object) => void} adapter
   */
  registerAdapter(channel, adapter) {
    if (!this._adapters.has(channel)) this._adapters.set(channel, []);
    this._adapters.get(channel).push(adapter);
    return () => {
      const list = this._adapters.get(channel);
      const i = list.indexOf(adapter);
      if (i >= 0) list.splice(i, 1);
    };
  }

  /* ======================================================================
   * ISSUING
   * ==================================================================== */

  /**
   * Issue immediately, bypassing arbitration. For operator control and for
   * anything at SAFETY priority.
   * @param {object} raw
   */
  issue(raw) {
    const result = validateDirective({ ...raw, at: this._elapsed });
    if (!result.ok) {
      console.error(`[AIDirector] rejected directive: ${result.error}`, raw);
      return false;
    }
    return this._dispatch(result.directive, { force: true });
  }

  /** Propose through arbitration. Behaviours use this via their `propose`. */
  propose(raw) {
    const result = validateDirective({ ...raw, at: this._elapsed });
    if (!result.ok) {
      console.warn(`[AIDirector] discarded proposal: ${result.error}`, raw);
      return false;
    }
    const d = result.directive;
    const current = this._pending.get(d.channel);
    if (!current || d.priority >= current.priority) this._pending.set(d.channel, d);
    return true;
  }

  /* ======================================================================
   * TICK
   * ==================================================================== */

  update(dt, elapsed) {
    if (!this._enabled) return;
    this._elapsed = elapsed;

    const ctx = this._buildContext(dt, elapsed);
    const propose = raw => this.propose({ ...raw, source: ctx._currentBehavior });

    for (const b of this.behaviors) {
      if (!b.enabled) continue;
      ctx._currentBehavior = b.id;
      try { b.tick(ctx, propose); }
      catch (err) { console.error(`[AIDirector] behavior "${b.id}" threw:`, err); }
    }

    for (const [channel, d] of this._pending) {
      const last = this._lastDispatch.get(channel) ?? -Infinity;
      const cooldown = d.priority >= PRIORITY.SAFETY ? 0 : (this.cooldowns[channel] ?? 0);
      if (elapsed - last < cooldown) continue;
      this._dispatch(d);
    }
    this._pending.clear();
  }

  /**
   * The read-only view behaviours reason over. Deliberately the digital twin
   * and nothing else — a behaviour that could reach a renderer would start
   * depending on one.
   */
  _buildContext(dt, elapsed) {
    const registry = this.registry;
    return {
      dt, elapsed,
      registry,
      query: (c, o) => registry.query(c, o),
      find: c => registry.find(c),
      summary: (t, f) => registry.summary(t, f),
      count: t => registry.countOfType(t),
      history: this._history,
      sinceLast: channel => elapsed - (this._lastDispatch.get(channel) ?? -Infinity),
      _currentBehavior: 'unknown'
    };
  }

  _dispatch(d, opts = {}) {
    this._lastDispatch.set(d.channel, this._elapsed);

    this._history.push(d);
    if (this._history.length > this._historyLimit) this._history.shift();

    const adapters = this._adapters.get(d.channel) || [];
    if (!adapters.length && !opts.quiet) {
      console.warn(`[AIDirector] no adapter for channel "${d.channel}" — directive dropped`, d);
    }
    for (const a of adapters) {
      try { a(d); }
      catch (err) { console.error(`[AIDirector] adapter for "${d.channel}" threw:`, err); }
    }

    // Also broadcast, so plugins and analytics can observe without adapting.
    this.bus.emit(EVT.DIRECTOR_DIRECTIVE, d);
    return true;
  }

  /* ======================================================================
   * CONTROL
   * ==================================================================== */

  setEnabled(on) {
    this._enabled = on;
    this.bus.emit(EVT.DIRECTOR_STATE, { enabled: on });
  }
  get enabled() { return this._enabled; }

  /** Recent directives, newest last. The replay and audit surface. */
  history(limit = 20) { return this._history.slice(-limit); }

  dispose() {
    this.behaviors.length = 0;
    this._adapters.clear();
    this._pending.clear();
    this._history.length = 0;
  }
}

export default AIDirector;
