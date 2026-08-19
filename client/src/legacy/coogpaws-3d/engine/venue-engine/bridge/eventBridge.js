/**
 * Event Bridge
 * ---------------------------------------------------------------------------
 * The one channel between the engine's EventBus and CoogsNation.
 *
 * WHAT CROSSES, AND WHAT DOES NOT
 * -------------------------------
 * Only application-level events cross: a venue was entered or exited, a seat
 * changed hands, an avatar arrived or left, a purchase completed, the director
 * raised something worth surfacing.
 *
 * Frame updates, render events, LOD changes, camera transforms, crowd
 * animation and every other per-frame signal stay entirely inside the engine.
 * That is not a stylistic preference. The engine's bus carries `engine:tick`
 * sixty times a second; forwarding it into React would re-render the
 * application on every frame and destroy the mobile performance budget the
 * whole architecture is built around.
 *
 * The forwarding table below is an ALLOW-LIST, not a filter. A new engine
 * event does not silently begin crossing the boundary — someone has to add it
 * here deliberately, which is the point.
 */

import { EVT } from '../core/EventBus.js';

/**
 * Engine event → bridge event, with a mapper that narrows the payload.
 *
 * Mappers exist so engine internals do not leak outward: the engine's
 * `seat:claimed` carries a raw seat index and an avatar id, while the bridge
 * publishes a stable persistent id the application can store.
 */
function buildForwardingTable(ctx) {
  const { venueId, seats, registry } = ctx;

  /** Resolve a seat index to the persistent identity the application uses. */
  const describeSeat = (seatIndex) => {
    const collection = registry?._collections?.get('seat');
    if (!collection || seatIndex == null) return null;
    const described = collection.describe(seatIndex);
    return {
      seatPersistentId: described.persistentId,
      seatIndex,
      section: String(described.metadata.section),
      row: Number(described.metadata.row),
      seatNumber: Number(described.metadata.number),
    };
  };

  return [
    {
      engineEvent: EVT.SEAT_CLAIMED,
      bridgeEvent: 'venue:seat-claimed',
      map: (payload) => {
        const seat = describeSeat(payload.seatIndex);
        return seat ? { ...seat, userId: payload.userId, displayName: payload.username } : null;
      },
    },
    {
      engineEvent: EVT.SEAT_RELEASED,
      bridgeEvent: 'venue:seat-released',
      map: (payload) => {
        const seat = describeSeat(payload.seatIndex);
        return seat ? { ...seat, userId: payload.userId ?? null } : null;
      },
    },
    {
      engineEvent: EVT.AVATAR_ADDED,
      bridgeEvent: 'venue:avatar-entered',
      map: (payload) => ({
        userId: String(payload.userId),
        displayName: payload.username,
        seatIndex: payload.seatIndex ?? null,
      }),
    },
    {
      engineEvent: EVT.AVATAR_REMOVED,
      bridgeEvent: 'venue:avatar-exited',
      map: (payload) => ({
        userId: String(payload.userId),
        displayName: payload.username ?? '',
        seatIndex: null,
      }),
    },
    {
      engineEvent: EVT.DIRECTOR_DIRECTIVE,
      bridgeEvent: 'venue:director-notification',
      /**
       * Only directives worth surfacing to the application. Ambient crowd and
       * camera work is the venue breathing; forwarding it would be noise at
       * roughly one event per second, forever.
       */
      map: (directive) => {
        if (directive.priority < 50) return null;          // below EVENT
        return { channel: directive.channel, action: directive.action, reason: directive.reason };
      },
    },
  ];
}

/**
 * @param {object} ctx
 * @param {import('../core/EventBus.js').EventBus} ctx.bus engine bus
 * @param {string} ctx.venueId
 * @param {string|null} ctx.userId
 * @param {object} ctx.seats
 * @param {object} ctx.registry
 * @returns {import('../index').VenueEventBridge}
 */
export function createEventBridge(ctx) {
  const handlers = new Map();      // bridge event name → Set<handler>
  const anyHandlers = new Set();
  const unsubscribes = [];
  let disposed = false;

  const publish = (name, payload) => {
    if (disposed) return;
    const event = {
      name,
      venueId: ctx.venueId,
      userId: ctx.userId ?? null,
      at: Date.now(),
      payload,
    };
    for (const handler of handlers.get(name) || []) {
      try { handler(event); }
      catch (error) { console.error(`[venue-bridge] handler for "${name}" threw:`, error); }
    }
    for (const handler of anyHandlers) {
      try { handler(event); }
      catch (error) { console.error('[venue-bridge] wildcard handler threw:', error); }
    }
  };

  // Wire the allow-list. Nothing outside this loop can cross the boundary.
  for (const entry of buildForwardingTable(ctx)) {
    const off = ctx.bus.on(entry.engineEvent, (payload) => {
      const mapped = entry.map(payload);
      if (mapped === null || mapped === undefined) return;   // mapper vetoed
      publish(entry.bridgeEvent, mapped);
    });
    unsubscribes.push(off);
  }

  return {
    on(name, handler) {
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name).add(handler);
      return () => handlers.get(name)?.delete(handler);
    },

    onAny(handler) {
      anyHandlers.add(handler);
      return () => anyHandlers.delete(handler);
    },

    /**
     * Publish an application event. Used for lifecycle events the engine
     * cannot know about — venue entered/exited, a completed purchase.
     */
    emit(name, payload) {
      publish(name, payload);
    },

    dispose() {
      disposed = true;
      unsubscribes.forEach((off) => { try { off(); } catch { /* already gone */ } });
      unsubscribes.length = 0;
      handlers.clear();
      anyHandlers.clear();
    },
  };
}

export default createEventBridge;
