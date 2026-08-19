/**
 * venues/index.js — venue registry
 * ---------------------------------------------------------------------------
 * Venues arrive two ways, and both are first-class:
 *
 *   class  — a VenueDefinition subclass. Use when the surface needs real code.
 *   data   — a .venue.json document built by JSONVenue. Use for everything else.
 *
 * Objective 3 is that data becomes the default, not that classes disappear.
 * A venue whose playing surface cannot be expressed by a recipe should stay a
 * class; forcing drawing logic into JSON would be worse in every respect than
 * a small, readable subclass. The registry treating them identically is what
 * lets a venue migrate from one to the other without any consumer noticing.
 *
 * Class entries are lazily imported, so a football-only deployment never
 * downloads the arena module.
 */

import { JSONVenue } from './JSONVenue.js';

/**
 * @typedef {object} VenueEntry
 * @property {string} label
 * @property {string} category
 * @property {'class'|'data'} kind
 * @property {() => Promise<VenueDefinition>} load
 */

/** @type {Record<string, VenueEntry>} */
export const VENUE_REGISTRY = {
  football: {
    label: 'Generic Stadium',
    category: 'football',
    kind: 'class',
    load: () => import('./FootballStadium.js').then(m => new m.FootballStadium())
  },
  basketball: {
    label: 'Generic Arena',
    category: 'basketball',
    kind: 'class',
    load: () => import('./BasketballArena.js').then(m => new m.BasketballArena())
  },
  baseball: {
    label: 'Generic Ballpark',
    category: 'baseball',
    kind: 'class',
    load: () => import('./BaseballField.js').then(m => new m.BaseballField())
  },
  coogpaws: {
    label: 'Coog Paws Lounge',
    category: 'lounge',
    kind: 'class',
    load: () => import('./CoogPawsLounge.js').then(m => new m.CoogPawsLounge())
  },
  concert: {
    label: 'Generic Arena — Concert Mode',
    category: 'concert',
    kind: 'data',
    url: '/venues/concert.venue.json'
  }

  /* Still on the roadmap:
   *   esports — data-only; a stage recipe plus a centre-hung LED volume.
   */
};

/**
 * Register a venue at runtime — how an application ships its own venues
 * without forking the engine.
 * @param {string} id
 * @param {VenueEntry} entry
 */
export function registerVenue(id, entry) {
  if (VENUE_REGISTRY[id]) throw new Error(`Venue "${id}" is already registered`);
  if (entry.kind !== 'data' && typeof entry.load !== 'function') {
    throw new TypeError(`Venue "${id}" must provide load() or kind:'data' with a url`);
  }
  VENUE_REGISTRY[id] = entry;
  return entry;
}

/**
 * @param {string} id
 * @returns {Promise<import('./VenueDefinition.js').VenueDefinition>}
 */
export async function loadVenue(id) {
  const entry = VENUE_REGISTRY[id];
  if (!entry) {
    throw new Error(`Unknown venue "${id}". Registered: ${Object.keys(VENUE_REGISTRY).join(', ')}`);
  }

  if (entry.kind === 'data') {
    const res = await fetch(entry.url);
    if (!res.ok) throw new Error(`Venue "${id}" → ${entry.url} returned HTTP ${res.status}`);
    return new JSONVenue(await res.json()).validate();
  }

  const venue = await entry.load();
  return venue.validate();
}

/** Venue id from ?venue=… , falling back to the first registered venue. */
export function venueIdFromLocation(fallback = 'football') {
  const id = new URLSearchParams(location.search).get('venue');
  return id && VENUE_REGISTRY[id] ? id : fallback;
}

export default VENUE_REGISTRY;
