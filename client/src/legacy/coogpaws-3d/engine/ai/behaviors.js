/**
 * ai/behaviors.js
 * ---------------------------------------------------------------------------
 * Reference behaviours. Each reads the digital twin and proposes directives;
 * none of them can reach a renderer, because the context they receive contains
 * only the registry and the directive history.
 *
 * These are deliberately simple. They exist to prove the shape and to give the
 * venue a pulse before a real event feed is wired in. A production AI director
 * — one reading live game state, or an LLM writing directives — plugs in here
 * with no engine change.
 */

import { CHANNEL, PRIORITY, directive } from './directives.js';

/**
 * Ambient life: occasional crowd reactions, scaled by how full the venue is.
 * An empty bowl should not be doing the wave.
 */
export const AmbientCrowdBehavior = {
  id: 'ambient-crowd',
  _next: 20,
  tick(ctx, propose) {
    if (ctx.elapsed < this._next) return;
    this._next = ctx.elapsed + 18 + Math.random() * 26;

    const census = ctx.summary('seat', 'occupancy') || {};
    const filled = (census.ai || 0) + (census.user || 0);
    const total = ctx.count('seat') || 1;
    const fullness = filled / total;
    if (fullness < 0.15) return;         // too empty to be believable

    const options = [
      { type: 'cheer', strength: 0.7 + fullness * 0.3, reason: 'ambient swell' },
      { type: 'wave', strength: 1, reason: 'lull in play' },
      { type: 'stand', strength: 0.6, reason: 'anticipation' }
    ];
    const pick = options[(Math.random() * options.length) | 0];
    propose(directive(CHANNEL.CROWD, 'react',
      { type: pick.type, strength: pick.strength },
      { priority: PRIORITY.AMBIENT, reason: pick.reason }));
  }
};

/**
 * Rotates the broadcast camera when nobody is driving it, and cuts to a seat
 * when a notable one changes hands. Yields instantly to operator control by
 * only ever proposing at AMBIENT priority.
 */
export const CameraDirectorBehavior = {
  id: 'camera-director',
  _next: 45,
  tick(ctx, propose) {
    if (ctx.elapsed < this._next) return;
    this._next = ctx.elapsed + 40 + Math.random() * 40;

    const modes = ['orbit', 'broadcast', 'spectator'];
    propose(directive(CHANNEL.CAMERA, 'mode',
      { mode: modes[(Math.random() * modes.length) | 0] },
      { priority: PRIORITY.AMBIENT, reason: 'idle rotation' }));
  }
};

/**
 * Keeps the boards showing a running clock. A real implementation subscribes
 * to a game feed; this one just counts, which is enough to prove the channel.
 */
export const ScoreboardClockBehavior = {
  id: 'scoreboard-clock',
  _next: 0,
  tick(ctx, propose) {
    if (ctx.elapsed < this._next) return;
    this._next = ctx.elapsed + 1;

    const remaining = Math.max(0, 900 - Math.floor(ctx.elapsed)) % 900;
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');

    propose(directive(CHANNEL.SCOREBOARD, 'update', {
      patch: {
        clock: `${mm}:${ss}`,
        period: 1 + (Math.floor(ctx.elapsed / 900) % 4),
        situation: '1ST & 10'
      }
    }, { priority: PRIORITY.AMBIENT, reason: 'game clock' }));
  }
};

/**
 * Watches for closed access points and, if too many are shut, asks for an
 * announcement. This one exists to show a behaviour reasoning over the twin
 * rather than over a timer — which is the point of having a twin at all.
 */
export const CirculationWatchBehavior = {
  id: 'circulation-watch',
  _warned: false,
  tick(ctx, propose) {
    const points = ctx.query({ type: 'accessPoint' });
    if (!points.length) return;
    const closed = points.filter(p => !p.passable).length;
    const ratio = closed / points.length;

    if (ratio > 0.4 && !this._warned) {
      this._warned = true;
      propose(directive(CHANNEL.ANNOUNCE, 'say', {
        text: 'Several concourse routes are currently closed. Please follow staff directions.',
        priority: 2
      }, { priority: PRIORITY.EVENT, reason: `${closed}/${points.length} access points closed` }));
    } else if (ratio <= 0.2) {
      this._warned = false;
    }
  }
};

/** The default set installed by main.js. */
export const DEFAULT_BEHAVIORS = [
  AmbientCrowdBehavior,
  CameraDirectorBehavior,
  ScoreboardClockBehavior,
  CirculationWatchBehavior
];

export default DEFAULT_BEHAVIORS;
