/**
 * UIManager
 * ---------------------------------------------------------------------------
 * The only module allowed to touch the DOM outside of texture canvases.
 * Everything it does is driven by, and reported through, the EventBus — so the
 * UI can be replaced with React, a native shell, or nothing at all without
 * changing the engine.
 */

import { EVT } from '../core/EventBus.js';
import { CAMERA } from '../config/engine.config.js';
import { VENUE_REGISTRY } from '../venues/index.js';

export class UIManager {
  /** @param {{root, bus, seats, engine, venue, testAvatars}} ctx */
  constructor(ctx) {
    this.root = ctx.root;
    this.bus = ctx.bus;
    this.seats = ctx.seats;
    this.engine = ctx.engine;
    this.venue = ctx.venue;
    this.testAvatars = ctx.testAvatars;
    this.selected = -1;

    this._render();
    this._wire();
  }

  _render() {
    this.root.innerHTML = `
      <header class="hud hud-tl">
        <div class="eyebrow"><span class="dot"></span><span id="net-state">connecting</span></div>
        <h1 id="venue-name">Venue</h1>
        <p class="tagline"><span id="cap-total">—</span> seats · <span id="sec-total">—</span> sections</p>
        <div class="btn-row" id="venue-row"></div>
      </header>

      <section class="hud hud-tr panel">
        <div class="panel-h">Camera</div>
        <div class="btn-row" id="mode-row"></div>
        <div class="panel-h">Crowd</div>
        <div class="btn-row">
          <button data-react="cheer">Cheer</button>
          <button data-react="wave">Wave</button>
          <button data-react="stand">Stand</button>
        </div>
        <div class="panel-h">Lighting</div>
        <div class="btn-row">
          <button data-light="night">Night</button>
          <button data-light="sunset">Sunset</button>
          <button data-light="day">Day</button>
          <button data-light="indoor">Indoor</button>
        </div>
      </section>

      <section class="hud hud-tr2 panel" id="test-panel">
        <div class="panel-h">Test avatars</div>
        <input id="ta-name" placeholder="username" maxlength="16" />
        <div class="btn-row">
          <button data-team="home" class="on">Home</button>
          <button data-team="away">Away</button>
        </div>
        <div class="btn-row">
          <button id="ta-place">Place in seat</button>
          <button id="ta-random">+5 random</button>
          <button id="ta-clear">Clear</button>
        </div>
        <ul id="ta-list"></ul>
      </section>

      <section class="hud hud-br panel seat-card" id="seat-card" hidden>
        <div class="panel-h">Seat</div>
        <dl>
          <div><dt>Tier</dt><dd id="s-tier">—</dd></div>
          <div><dt>Section</dt><dd id="s-section">—</dd></div>
          <div><dt>Row</dt><dd id="s-row">—</dd></div>
          <div><dt>Seat</dt><dd id="s-seat">—</dd></div>
          <div><dt>Price</dt><dd id="s-price">—</dd></div>
          <div><dt>Status</dt><dd id="s-status">—</dd></div>
        </dl>
        <button id="sit-here" class="primary">Sit here</button>
        <button id="stand-up" class="ghost" hidden>Leave seat</button>
      </section>

      <section class="hud hud-bl stats">
        <div><span id="st-fps">—</span><em>fps</em></div>
        <div><span id="st-users">0</span><em>users</em></div>
        <div><span id="st-draws">—</span><em>draws</em></div>
        <div><span id="st-tris">—</span><em>tris</em></div>
      </section>

      <div class="hud hud-chat" id="chat">
        <ul id="chat-log"></ul>
        <input id="chat-input" placeholder="Say something…" maxlength="280" />
      </div>

      <div class="hud toast" id="toast" hidden></div>
    `;

    const venueRow = this.root.querySelector('#venue-row');
    Object.entries(VENUE_REGISTRY).forEach(([id, entry]) => {
      const b = document.createElement('button');
      b.dataset.venue = id;
      b.textContent = entry.category;
      if (id === this.venue.id) b.classList.add('on');
      venueRow.appendChild(b);
    });

    const modeRow = this.root.querySelector('#mode-row');
    CAMERA.modes.forEach(m => {
      const b = document.createElement('button');
      b.dataset.mode = m;
      b.textContent = m;
      if (m === CAMERA.default) b.classList.add('on');
      modeRow.appendChild(b);
    });
  }

  _wire() {
    const $ = s => this.root.querySelector(s);

    this.root.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;

      if (b.dataset.mode) {
        this.root.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('on', x === b));
        this.engine.camera.setMode(b.dataset.mode, { autoRotate: b.dataset.mode === 'orbit' });
      }
      if (b.dataset.react) this.bus.emit(EVT.CROWD_REACTION, { type: b.dataset.react });
      if (b.dataset.venue && b.dataset.venue !== this.venue.id) {
        // Venue swap is a reload with a query param: the whole scene graph,
        // seat manifest and crowd buffers belong to one venue, and tearing
        // them down in place buys complexity for no user-visible gain.
        const url = new URL(location.href);
        url.searchParams.set('venue', b.dataset.venue);
        location.assign(url);
      }
      if (b.dataset.team) {
        this.root.querySelectorAll('[data-team]').forEach(x => x.classList.toggle('on', x === b));
      }
      if (b.id === 'ta-place') this._placeTestAvatar();
      if (b.id === 'ta-random') { this.testAvatars.placeRandom(5); this._renderTestList(); }
      if (b.id === 'ta-clear') { this.testAvatars.clear(); this._renderTestList(); }
      if (b.dataset.light) {
        this.root.querySelectorAll('[data-light]').forEach(x => x.classList.toggle('on', x === b));
        this.engine.lighting.setPreset(b.dataset.light);
      }
      if (b.id === 'sit-here' && this.selected >= 0) {
        this.engine.net.requestSeat(this.selected);
        this.bus.emit(EVT.SEAT_FOCUS, { seatIndex: this.selected });
      }
      if (b.id === 'stand-up') {
        this.engine.net.releaseSeat();
        this.engine.camera.reset();
      }
    });

    $('#chat-input').addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !e.target.value.trim()) return;
      this.engine.net.sendChat(e.target.value.trim());
      e.target.value = '';
    });

    this.bus.on(EVT.SEAT_PICK, ({ seatIndex }) => this.showSeat(seatIndex));
    this.bus.on(EVT.NET_STATUS, ({ state }) => { $('#net-state').textContent = state; });
    this.bus.on(EVT.NET_CHAT, msg => this.appendChat(msg));
    this.bus.on(EVT.UI_NOTICE, ({ text, level }) => this.toast(text, level));
    this.bus.on(EVT.SEAT_CLAIMED, ({ seatIndex }) => {
      if (seatIndex === this.selected) this.showSeat(seatIndex);
    });

    $('#venue-name').textContent = this.venue.label;
    $('#cap-total').textContent = this.seats.count.toLocaleString();
    $('#sec-total').textContent = this.seats.sections.length;
    const preset = this.venue.lighting.preset;
    this.root.querySelectorAll('[data-light]').forEach(x =>
      x.classList.toggle('on', x.dataset.light === preset));

    this.bus.on(EVT.AVATAR_REMOVED, () => this._renderTestList());
    this._renderTestList();
  }

  /* ------------------------------------------------------------------
   * TEST AVATARS — requirement 5 and 6 of the vertical slice
   * ---------------------------------------------------------------- */

  _placeTestAvatar() {
    if (this.selected < 0) {
      this.toast('Click a seat first', 'warn');
      return;
    }
    const name = this.root.querySelector('#ta-name').value;
    const team = this.root.querySelector('[data-team].on')?.dataset.team || 'home';
    const id = this.testAvatars.place({ seatIndex: this.selected, username: name, team });
    if (id != null) {
      this.root.querySelector('#ta-name').value = '';
      this._renderTestList();
      this.showSeat(this.selected);
    }
  }

  _renderTestList() {
    const list = this.root.querySelector('#ta-list');
    if (!list) return;
    const rows = this.testAvatars.list();
    list.innerHTML = rows.length
      ? rows.map(r => `<li data-goto="${r.seatIndex}" data-remove="${r.userId}">
           <span class="ta-team ${r.team}"></span>
           <b>${this._escape(r.username)}</b>
           <em>${r.seat.section}·R${r.seat.row}·S${r.seat.seatNumber}</em>
           <button class="x" data-remove="${r.userId}">×</button>
         </li>`).join('')
      : '<li class="empty">none placed</li>';

    list.querySelectorAll('li[data-goto]').forEach(li => {
      li.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        this.bus.emit(EVT.SEAT_FOCUS, { seatIndex: +li.dataset.goto });
        this.showSeat(+li.dataset.goto);
      });
    });
    list.querySelectorAll('button.x').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.testAvatars.remove(+btn.dataset.remove);
        this._renderTestList();
      });
    });
  }

  /* ------------------------------------------------------------------ */

  showSeat(seatIndex) {
    const card = this.root.querySelector('#seat-card');
    if (seatIndex < 0) { card.hidden = true; this.selected = -1; return; }
    const s = this.seats.getSeat(seatIndex);
    if (!s) return;
    this.selected = seatIndex;
    card.hidden = false;
    const $ = q => this.root.querySelector(q);
    $('#s-section').textContent = `${s.section}${s.vip ? ' · VIP' : ''}`;
    $('#s-tier').textContent = s.tierLabel;
    $('#s-row').textContent = s.row;
    $('#s-seat').textContent = s.seatNumber;
    $('#s-price').textContent = `$${s.price}`;
    $('#s-status').textContent = s.occupancy === 'user' ? `taken · ${s.username}`
                               : s.reserved ? 'reserved' : 'available';
    const mine = this.engine.net.localSeat === seatIndex;
    $('#sit-here').hidden = mine || s.occupancy === 'user' || s.reserved;
    $('#stand-up').hidden = !mine;
  }

  appendChat({ username, text }) {
    const log = this.root.querySelector('#chat-log');
    const li = document.createElement('li');
    li.innerHTML = `<b>${this._escape(username)}</b> ${this._escape(text)}`;
    log.appendChild(li);
    while (log.children.length > 40) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  }

  _escape(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  toast(text, level = 'info') {
    const t = this.root.querySelector('#toast');
    t.textContent = text;
    t.className = `hud toast ${level}`;
    t.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  updateStats({ fps, users, calls, triangles }) {
    const $ = q => this.root.querySelector(q);
    $('#st-fps').textContent = Math.round(fps);
    $('#st-users').textContent = users;
    $('#st-draws').textContent = calls;
    $('#st-tris').textContent = triangles > 1e6
      ? (triangles / 1e6).toFixed(1) + 'M'
      : Math.round(triangles / 1000) + 'k';
  }
}

export default UIManager;
