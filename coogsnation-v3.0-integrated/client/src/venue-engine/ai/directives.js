/**
 * ai/directives.js
 * ---------------------------------------------------------------------------
 * The vocabulary the AIDirector speaks.
 *
 * A directive is an *intent*, never an implementation call. "Raise the noise
 * in the south stands" is a directive; `crowdManager.react('cheer')` is not.
 * The distinction is what keeps modules independent: CrowdManager can be
 * replaced wholesale, and the director never notices.
 *
 * Every directive is validated before dispatch. An unroutable directive is a
 * bug in whoever issued it, and it should surface at the moment of issue —
 * not as silence three subsystems downstream.
 */

/** Channels are subsystems, not modules. Several modules may serve one. */
export const CHANNEL = {
  CROWD: 'crowd',
  CAMERA: 'camera',
  LIGHTING: 'lighting',
  AUDIO: 'audio',
  EFFECTS: 'effects',
  ANNOUNCE: 'announce',
  SCOREBOARD: 'scoreboard'
};

/**
 * Allowed actions per channel, with the params each expects. This table is the
 * contract between the director and everything it orchestrates; adding a
 * capability means adding a row here, which makes the surface reviewable.
 */
export const DIRECTIVE_SCHEMA = {
  [CHANNEL.CROWD]: {
    react:      { type: ['cheer', 'wave', 'stand', 'boo', 'idle'], strength: 'number?', originT: 'number?' },
    setDensity: { rate: 'number' },
    focus:      { zone: 'string' }
  },
  [CHANNEL.CAMERA]: {
    mode:       { mode: 'string', options: 'object?' },
    focus:      { target: 'string' },              // a persistentId
    cut:        { preset: 'string' },
    dolly:      { seconds: 'number', to: 'string' }
  },
  [CHANNEL.LIGHTING]: {
    preset:     { preset: 'string' },
    fixtures:   { on: 'boolean' },
    effect:     { effect: 'string', channel: 'string?', params: 'object?' },
    blackout:   {}
  },
  [CHANNEL.AUDIO]: {
    bed:        { track: 'string', gain: 'number?' },
    sting:      { cue: 'string' },
    duck:       { gain: 'number', seconds: 'number?' }
  },
  [CHANNEL.EFFECTS]: {
    trigger:    { effect: 'string', params: 'object?' }
  },
  [CHANNEL.ANNOUNCE]: {
    say:        { text: 'string', voice: 'string?', priority: 'number?' }
  },
  [CHANNEL.SCOREBOARD]: {
    update:     { boardId: 'string?', patch: 'object' },
    message:    { boardId: 'string?', text: 'string', ttl: 'number?' },
    mode:       { boardId: 'string?', mode: 'string' }
  }
};

/** Higher wins when two directives contend for the same channel. */
export const PRIORITY = {
  AMBIENT: 10,      // idle behaviour, safe to drop
  EVENT: 50,        // game events
  OPERATOR: 80,     // a human took control
  SAFETY: 100       // evacuation, never suppressed
};

/**
 * @typedef {object} Directive
 * @property {string} channel
 * @property {string} action
 * @property {object} params
 * @property {number} priority
 * @property {string} source     which behaviour or operator issued it
 * @property {number} at         issue time, seconds
 * @property {string} [reason]   human-readable, for logs and replay
 */

/**
 * @param {object} d
 * @returns {{ok:true, directive:Directive}|{ok:false, error:string}}
 */
export function validateDirective(d) {
  if (!d || typeof d !== 'object') return { ok: false, error: 'directive must be an object' };
  const chan = DIRECTIVE_SCHEMA[d.channel];
  if (!chan) {
    return { ok: false, error: `unknown channel "${d.channel}" (known: ${Object.keys(DIRECTIVE_SCHEMA).join(', ')})` };
  }
  const spec = chan[d.action];
  if (!spec) {
    return { ok: false, error: `channel "${d.channel}" has no action "${d.action}" (known: ${Object.keys(chan).join(', ')})` };
  }

  const params = d.params || {};
  for (const [key, rule] of Object.entries(spec)) {
    const optional = typeof rule === 'string' && rule.endsWith('?');
    const value = params[key];
    if (value === undefined) {
      if (optional) continue;
      return { ok: false, error: `${d.channel}.${d.action} requires param "${key}"` };
    }
    if (Array.isArray(rule)) {
      if (!rule.includes(value)) {
        return { ok: false, error: `${d.channel}.${d.action}.${key} must be one of ${rule.join('|')}` };
      }
    } else {
      const want = String(rule).replace('?', '');
      const got = Array.isArray(value) ? 'array' : typeof value;
      if (want !== 'any' && got !== want) {
        return { ok: false, error: `${d.channel}.${d.action}.${key} expected ${want}, got ${got}` };
      }
    }
  }

  return {
    ok: true,
    directive: {
      channel: d.channel,
      action: d.action,
      params,
      priority: d.priority ?? PRIORITY.AMBIENT,
      source: d.source || 'unknown',
      at: d.at ?? 0,
      reason: d.reason
    }
  };
}

/** Terse constructor so behaviours read as intent. */
export const directive = (channel, action, params = {}, extra = {}) =>
  ({ channel, action, params, ...extra });

export default { CHANNEL, PRIORITY, DIRECTIVE_SCHEMA, validateDirective, directive };
