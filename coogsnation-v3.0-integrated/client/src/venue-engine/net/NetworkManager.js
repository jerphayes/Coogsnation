/**
 * NetworkManager
 * ---------------------------------------------------------------------------
 * The rendering layer never imports this file, and this file never imports
 * three.js. Everything crosses the EventBus. That is the whole point: you can
 * run the venue with no server, swap the mock transport for a real one, or
 * run this module headless in Node for authority-side validation, without
 * touching a single line of rendering code.
 *
 * TRANSPORT CONTRACT
 * ------------------
 * A transport is any object with:
 *   connect(): Promise<void>
 *   send(type: string, payload: object): void
 *   close(): void
 *   onMessage: (type, payload) => void      // assigned by NetworkManager
 *   onStatus:  (state, detail) => void      // assigned by NetworkManager
 *
 * WIRE PROTOCOL (v1)
 * ------------------
 * Client → server
 *   hello           { room, username, team }
 *   seat.claim      { seatIndex }
 *   seat.release    { }
 *   avatar.emote    { emote }
 *   chat.send       { text }
 *   heartbeat       { t }
 *
 * Server → client
 *   welcome         { userId, room, serverTime }
 *   presence.full   { users: [{ userId, username, team, seatIndex }] }
 *   presence.delta  { joined: [...], left: [userId] }
 *   seat.granted    { seatIndex, userId }
 *   seat.denied     { seatIndex, reason }
 *   seat.freed      { seatIndex, userId }
 *   avatar.emote    { userId, emote }
 *   chat.message    { userId, username, text, ts }
 *   moderation      { action, userId, reason }
 *
 * Presence updates are coalesced client-side at NETWORK.presenceFlushHz so a
 * busy room does not turn into one scene mutation per packet.
 */

import { NETWORK } from '../config/engine.config.js';
import { EVT } from '../core/EventBus.js';

export class NetworkManager {
  /** @param {{bus:EventBus, transport:object}} ctx */
  constructor(ctx) {
    this.bus = ctx.bus;
    this.transport = ctx.transport;
    this.state = 'idle';
    this.localUserId = null;
    this.localSeat = -1;

    /** @type {Map<number, {userId, username, team, seatIndex}>} */
    this.roster = new Map();

    this._pendingJoins = [];
    this._pendingLeaves = [];
    this._flushTimer = 0;
    this._flushInterval = 1 / NETWORK.presenceFlushHz;
    this._heartbeat = 0;

    this.transport.onMessage = (type, payload) => this._receive(type, payload);
    this.transport.onStatus = (state, detail) => {
      this.state = state;
      this.bus.emit(EVT.NET_STATUS, { state, detail });
    };
  }

  /* ------------------------------------------------------------------ */

  async connect({ username, team = 'home' } = {}) {
    this.localProfile = { username: username || `guest${(Math.random() * 9000 + 1000) | 0}`, team };
    await this.transport.connect();
    this.transport.send('hello', {
      room: NETWORK.room,
      username: this.localProfile.username,
      team: this.localProfile.team
    });
  }

  disconnect() {
    this.transport.close();
    this.state = 'closed';
    this.bus.emit(EVT.NET_STATUS, { state: 'closed' });
  }

  /* --------------------------- outbound ---------------------------- */

  requestSeat(seatIndex) { this.transport.send('seat.claim', { seatIndex }); }
  releaseSeat()          { this.transport.send('seat.release', {}); }
  sendEmote(emote)       { this.transport.send('avatar.emote', { emote }); }
  sendChat(text)         { this.transport.send('chat.send', { text: String(text).slice(0, 280) }); }

  /* --------------------------- inbound ----------------------------- */

  _receive(type, p) {
    switch (type) {
      case 'welcome':
        this.localUserId = p.userId;
        this.bus.emit(EVT.NET_STATUS, { state: 'ready', detail: p });
        break;

      case 'presence.full':
        this.roster.clear();
        p.users.forEach(u => { this.roster.set(u.userId, u); this._pendingJoins.push(u); });
        break;

      case 'presence.delta':
        (p.joined || []).forEach(u => { this.roster.set(u.userId, u); this._pendingJoins.push(u); });
        (p.left || []).forEach(id => { this.roster.delete(id); this._pendingLeaves.push(id); });
        break;

      case 'seat.granted':
        if (p.userId === this.localUserId) this.localSeat = p.seatIndex;
        this._pendingJoins.push({
          userId: p.userId,
          username: this.roster.get(p.userId)?.username || this.localProfile?.username || 'guest',
          team: this.roster.get(p.userId)?.team || 'home',
          seatIndex: p.seatIndex
        });
        break;

      case 'seat.denied':
        this.bus.emit(EVT.UI_NOTICE, { text: `Seat unavailable (${p.reason})`, level: 'warn' });
        break;

      case 'seat.freed':
        this._pendingLeaves.push(p.userId);
        if (p.userId === this.localUserId) this.localSeat = -1;
        break;

      case 'avatar.emote':
        this.bus.emit(EVT.AVATAR_EMOTE, { userId: p.userId, emote: p.emote });
        break;

      case 'chat.message':
        this.bus.emit(EVT.NET_CHAT, p);
        break;

      case 'moderation':
        this._moderate(p);
        break;

      default:
        console.warn('[NetworkManager] unhandled message:', type);
    }
  }

  _moderate({ action, userId, reason }) {
    // Server is authoritative; the client just reflects the decision.
    if (action === 'kick' || action === 'ban') {
      this._pendingLeaves.push(userId);
      if (userId === this.localUserId) {
        this.bus.emit(EVT.UI_NOTICE, { text: `Removed from room: ${reason || 'moderation'}`, level: 'error' });
        this.disconnect();
      }
    } else if (action === 'mute') {
      this.bus.emit(EVT.UI_NOTICE, { text: 'You have been muted', level: 'warn' });
    }
  }

  /* ------------------------------------------------------------------
   * Coalesced flush. Called by the engine tick; never by the transport.
   * ---------------------------------------------------------------- */

  update(dt) {
    this._heartbeat += dt;
    if (this._heartbeat > NETWORK.heartbeatSeconds) {
      this._heartbeat = 0;
      if (this.state !== 'closed') this.transport.send('heartbeat', { t: Date.now() });
    }

    this._flushTimer += dt;
    if (this._flushTimer < this._flushInterval) return;
    this._flushTimer = 0;
    if (!this._pendingJoins.length && !this._pendingLeaves.length) return;

    const joined = this._pendingJoins.splice(0, this._pendingJoins.length);
    const left = this._pendingLeaves.splice(0, this._pendingLeaves.length);
    this.bus.emit(EVT.NET_PRESENCE, { joined, left });
  }

  get population() { return this.roster.size; }
}

export default NetworkManager;
