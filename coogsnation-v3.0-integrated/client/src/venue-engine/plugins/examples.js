/**
 * plugins/examples.js
 * ---------------------------------------------------------------------------
 * Two reference plugins. They exist to prove the contract is usable, and to be
 * the thing a new plugin author copies.
 *
 * Between them they exercise every capability: UI mounting, twin queries, twin
 * writes, event subscription, directive issuing, backend services, per-frame
 * tick and clean teardown.
 *
 * Neither required a single change to engine code.
 */

import Plugin, { CAPABILITY } from './Plugin.js';
import { CHANNEL, PRIORITY, directive } from '../ai/directives.js';

/* ═══════════════════════════════════════════════════════════════════════
 * POLLING
 * A venue-wide poll. Reads the twin for turnout, writes results to the
 * boards through the director, and posts the outcome to chat.
 * ═══════════════════════════════════════════════════════════════════════ */

export class PollingPlugin extends Plugin {
  static id = 'polling';
  static version = '1.0.0';
  static description = 'Run venue-wide polls and show results on the boards';
  static capabilities = [
    CAPABILITY.UI,
    CAPABILITY.REGISTRY_READ,
    CAPABILITY.EVENTS,
    CAPABILITY.DIRECTOR,
    CAPABILITY.SERVICES,
    CAPABILITY.TICK
  ];

  async install(ctx) {
    await super.install(ctx);
    this.poll = null;

    this.panel = ctx.ui.mountPanel({
      title: 'Poll',
      html: `
        <div class="poll-idle">
          <button data-poll-start>Start sample poll</button>
        </div>
        <div class="poll-live" hidden>
          <p class="poll-q"></p>
          <div class="poll-bars"></div>
          <div class="poll-meta"></div>
        </div>`
    });

    this.panel.querySelector('[data-poll-start]').addEventListener('click', () => {
      this.start({
        question: 'Best seat in the house?',
        options: ['Lower bowl', 'Club', 'Upper deck']
      });
    });

    // React to the venue rather than to a timer: a poll closing is a moment
    // worth a crowd reaction.
    this.onTeardown(ctx.events.on('poll:closed', () => {
      ctx.director.issue(directive(CHANNEL.CROWD, 'react',
        { type: 'cheer', strength: 0.8 },
        { priority: PRIORITY.EVENT, reason: 'poll result' }));
    }));
  }

  start({ question, options, seconds = 30 }) {
    const registry = this.ctx.registry;
    const census = registry.summary('seat', 'occupancy') || {};
    const eligible = (census.ai || 0) + (census.user || 0);

    this.poll = {
      question, options, seconds, remaining: seconds, eligible,
      votes: options.map(() => 0)
    };

    // Seed with simulated turnout so the bars read as a venue, not a demo.
    const turnout = Math.floor(eligible * (0.05 + Math.random() * 0.1));
    for (let i = 0; i < turnout; i++) {
      this.poll.votes[(Math.random() * options.length) | 0]++;
    }

    this.panel.querySelector('.poll-idle').hidden = true;
    this.panel.querySelector('.poll-live').hidden = false;
    this.panel.querySelector('.poll-q').textContent = question;

    this.ctx.director.issue(directive(CHANNEL.SCOREBOARD, 'message',
      { text: question.toUpperCase(), ttl: seconds },
      { priority: PRIORITY.EVENT, reason: 'poll opened' }));

    this._render();
  }

  tick(dt) {
    if (!this.poll) return;
    this.poll.remaining -= dt;
    if (this.poll.remaining <= 0) return this._close();
    if (Math.random() < dt * 4) {
      this.poll.votes[(Math.random() * this.poll.options.length) | 0]++;
      this._render();
    } else if (Math.floor(this.poll.remaining) !== this._lastSecond) {
      this._lastSecond = Math.floor(this.poll.remaining);
      this._render();
    }
  }

  _render() {
    const { options, votes, remaining } = this.poll;
    const total = votes.reduce((a, b) => a + b, 0) || 1;
    this.panel.querySelector('.poll-bars').innerHTML = options.map((o, i) => {
      const pct = Math.round(votes[i] / total * 100);
      return `<div class="poll-row"><span>${o}</span>
                <i style="width:${pct}%"></i><b>${pct}%</b></div>`;
    }).join('');
    this.panel.querySelector('.poll-meta').textContent =
      `${total.toLocaleString()} votes · ${Math.ceil(remaining)}s left`;
  }

  async _close() {
    const { options, votes, question } = this.poll;
    const winner = options[votes.indexOf(Math.max(...votes))];
    this.poll = null;

    this.panel.querySelector('.poll-live').hidden = true;
    this.panel.querySelector('.poll-idle').hidden = false;

    this.ctx.director.issue(directive(CHANNEL.SCOREBOARD, 'message',
      { text: `RESULT: ${winner.toUpperCase()}`, ttl: 10 },
      { priority: PRIORITY.EVENT, reason: 'poll closed' }));

    try {
      await this.ctx.services.get('chat').send(`Poll "${question}" → ${winner}`);
    } catch (err) { this.ctx.warn('chat unavailable:', err.message); }

    this.ctx.ui.notify(`Poll closed: ${winner}`, 'info');
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 * ANALYTICS
 * Subscribes to the twin's change stream and keeps a live census. Shows the
 * value of a queryable venue: this plugin knows nothing about seats, crowds
 * or rendering, and still reports on all three.
 * ═══════════════════════════════════════════════════════════════════════ */

export class AnalyticsPlugin extends Plugin {
  static id = 'analytics';
  static version = '1.0.0';
  static description = 'Live venue census from the object registry change stream';
  static capabilities = [CAPABILITY.UI, CAPABILITY.REGISTRY_READ, CAPABILITY.TICK];

  async install(ctx) {
    await super.install(ctx);
    this.counters = { claims: 0, releases: 0, stateChanges: 0 };
    this._refreshIn = 0;

    this.panel = ctx.ui.mountPanel({ title: 'Analytics', html: '<dl class="an-list"></dl>' });

    // One subscription covers every object type in the venue, forever —
    // including types added later by other plugins.
    this.onTeardown(ctx.registry.watch(({ event }) => {
      if (event === 'claimed') this.counters.claims++;
      else if (event === 'released') this.counters.releases++;
      else if (event === 'changed') this.counters.stateChanges++;
    }));
  }

  tick(dt) {
    this._refreshIn -= dt;
    if (this._refreshIn > 0) return;
    this._refreshIn = 1;

    const r = this.ctx.registry;
    const seats = r.summary('seat', 'occupancy') || {};
    const total = r.countOfType('seat') || 1;
    const rows = [
      ['Attendance', `${((seats.ai || 0) + (seats.user || 0)).toLocaleString()}`],
      ['Utilisation', `${Math.round(((seats.ai || 0) + (seats.user || 0)) / total * 100)}%`],
      ['Real users', `${(seats.user || 0).toLocaleString()}`],
      ['Zones', `${r.countOfType('zone')}`],
      ['Access open', `${r.query({ type: 'accessPoint', status: 'open' }).length}/${r.countOfType('accessPoint')}`],
      ['Seat claims', `${this.counters.claims}`],
      ['State events', `${this.counters.stateChanges.toLocaleString()}`]
    ];
    this.panel.querySelector('.an-list').innerHTML =
      rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }
}

export default { PollingPlugin, AnalyticsPlugin };
