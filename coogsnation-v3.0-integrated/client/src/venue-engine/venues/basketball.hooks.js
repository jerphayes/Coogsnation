/**
 * venues/basketball.hooks.js
 * ---------------------------------------------------------------------------
 * AI Director INTEGRATION POINTS for the basketball venue.
 *
 * Per directive: integration points only. There is deliberately **no event
 * logic** here — nothing decides when a timeout happens, nothing scripts a
 * player introduction. This file answers one question and no other:
 *
 *   "When something eventually declares `player-introductions`, which
 *    directives should the venue emit?"
 *
 * Each entry is a pure function from a payload to a list of directives. They
 * are data, not behaviour: no timers, no state, no subscriptions. A future
 * game-state feed, an operator console, or an LLM director calls
 * `basketballHooks.emit(director, 'timeout', {...})` and the venue responds
 * in its own idiom.
 *
 * WHY THIS IS NOT ENGINE CODE
 * ---------------------------
 * Every directive below uses the existing channels and actions in
 * `ai/directives.js`. Nothing here extends the vocabulary. The venue is
 * contributing sport-specific *composition* of engine primitives — which is
 * exactly what the venue layer is for — while arbitration, cooldowns,
 * adapters and validation all stay in the director.
 *
 * WHY FUNCTIONS AND NOT A TABLE OF DIRECTIVES
 * -------------------------------------------
 * Because payloads matter: a timeout for the home team dims different lights
 * than one for the visitors, and an introduction names a player. A static
 * table would force that logic back into whoever calls it.
 */

import { CHANNEL, PRIORITY, directive } from '../ai/directives.js';

/**
 * @typedef {(payload:object) => Array<object>} HookFn
 */

/** @type {Record<string, HookFn>} */
export const BASKETBALL_HOOKS = {

  /* ── player introductions ──────────────────────────────────────────── */
  'player-introductions': (p = {}) => [
    directive(CHANNEL.LIGHTING, 'preset', { preset: 'indoor' },
      { priority: PRIORITY.EVENT, reason: 'introductions: house down' }),
    directive(CHANNEL.LIGHTING, 'effect',
      { effect: 'chase', channel: 'house', params: { speed: 1.4 } },
      { priority: PRIORITY.EVENT, reason: 'introductions' }),
    directive(CHANNEL.SCOREBOARD, 'message',
      { text: (p.name || 'STARTING LINEUP').toUpperCase(), ttl: p.seconds ?? 6 },
      { priority: PRIORITY.EVENT, reason: 'introductions' }),
    directive(CHANNEL.CROWD, 'react',
      { type: 'cheer', strength: 1 },
      { priority: PRIORITY.EVENT, reason: 'introductions' }),
    directive(CHANNEL.CAMERA, 'cut', { preset: 'mid-court' },
      { priority: PRIORITY.EVENT, reason: 'introductions' })
  ],

  /* ── crowd reactions ───────────────────────────────────────────────── */
  'crowd-reaction': (p = {}) => [
    directive(CHANNEL.CROWD, 'react',
      { type: p.type || 'cheer', strength: p.strength ?? 0.85 },
      { priority: PRIORITY.EVENT, reason: p.reason || 'play' })
  ],

  /** Student section specifically — the loudest zone in a collegiate arena. */
  'student-noise': (p = {}) => [
    directive(CHANNEL.CROWD, 'focus', { zone: `zone:basketball:section-ST${p.section ?? 1}` },
      { priority: PRIORITY.EVENT, reason: 'student section' }),
    directive(CHANNEL.CROWD, 'react', { type: 'stand', strength: 1 },
      { priority: PRIORITY.EVENT, reason: 'student section' }),
    directive(CHANNEL.CAMERA, 'cut', { preset: 'student-section' },
      { priority: PRIORITY.EVENT, reason: 'student section' })
  ],

  /* ── stoppages ─────────────────────────────────────────────────────── */
  'timeout': (p = {}) => [
    directive(CHANNEL.SCOREBOARD, 'message',
      { text: `TIMEOUT ${(p.team || '').toUpperCase()}`.trim(), ttl: p.seconds ?? 30 },
      { priority: PRIORITY.EVENT, reason: 'timeout' }),
    directive(CHANNEL.AUDIO, 'bed', { track: 'timeout-bed', gain: 0.7 },
      { priority: PRIORITY.EVENT, reason: 'timeout' }),
    directive(CHANNEL.CAMERA, 'cut', { preset: 'broadcast-center' },
      { priority: PRIORITY.EVENT, reason: 'timeout' })
  ],

  'halftime': (p = {}) => [
    directive(CHANNEL.SCOREBOARD, 'mode', { mode: 'sponsor' },
      { priority: PRIORITY.EVENT, reason: 'halftime' }),
    directive(CHANNEL.LIGHTING, 'fixtures', { on: true },
      { priority: PRIORITY.EVENT, reason: 'halftime: house up' }),
    directive(CHANNEL.CROWD, 'setDensity', { rate: p.density ?? 0.55 },
      { priority: PRIORITY.EVENT, reason: 'halftime: concourse drift' }),
    directive(CHANNEL.AUDIO, 'bed', { track: 'halftime-bed', gain: 0.5 },
      { priority: PRIORITY.EVENT, reason: 'halftime' })
  ],

  'period-resume': (p = {}) => [
    directive(CHANNEL.CROWD, 'setDensity', { rate: p.density ?? 0.92 },
      { priority: PRIORITY.EVENT, reason: 'resume' }),
    directive(CHANNEL.SCOREBOARD, 'mode', { mode: 'game' },
      { priority: PRIORITY.EVENT, reason: 'resume' }),
    directive(CHANNEL.CAMERA, 'cut', { preset: 'broadcast-center' },
      { priority: PRIORITY.EVENT, reason: 'resume' })
  ],

  /* ── presentation ──────────────────────────────────────────────────── */
  'lighting-transition': (p = {}) => [
    directive(CHANNEL.LIGHTING, 'preset', { preset: p.preset || 'indoor' },
      { priority: PRIORITY.EVENT, reason: p.reason || 'transition' }),
    ...(p.effect
      ? [directive(CHANNEL.LIGHTING, 'effect',
          { effect: p.effect, channel: p.channel || 'house', params: p.params || {} },
          { priority: PRIORITY.EVENT, reason: p.reason || 'transition' })]
      : [])
  ],

  'scoreboard-animation': (p = {}) => [
    directive(CHANNEL.SCOREBOARD, 'mode',
      { boardId: p.boardId || 'centre-hung', mode: p.mode || 'replay' },
      { priority: PRIORITY.EVENT, reason: p.reason || 'animation' }),
    ...(p.text
      ? [directive(CHANNEL.SCOREBOARD, 'message',
          { boardId: p.boardId || 'centre-hung', text: p.text, ttl: p.ttl ?? 6 },
          { priority: PRIORITY.EVENT, reason: 'animation' })]
      : [])
  ]
};

/**
 * Emit a named venue event as directives. Returns the count issued so a caller
 * can tell the difference between "unknown event" and "nothing to do".
 *
 * @param {import('../ai/AIDirector.js').AIDirector} director
 * @param {string} event  a key of BASKETBALL_HOOKS
 * @param {object} [payload]
 * @returns {number} directives issued, or -1 if the event is unknown
 */
export function emitVenueEvent(director, event, payload = {}) {
  const hook = BASKETBALL_HOOKS[event];
  if (!hook) {
    console.warn(`[basketball] unknown venue event "${event}". Known: ${Object.keys(BASKETBALL_HOOKS).join(', ')}`);
    return -1;
  }
  let issued = 0;
  for (const d of hook(payload)) {
    if (director.issue({ ...d, source: `venue:basketball:${event}` })) issued++;
  }
  return issued;
}

/** Every event name this venue understands. */
export const VENUE_EVENTS = Object.keys(BASKETBALL_HOOKS);

export default { BASKETBALL_HOOKS, emitVenueEvent, VENUE_EVENTS };
