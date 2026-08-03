/**
 * engine.config.js
 * ---------------------------------------------------------------------------
 * Engine-wide tuning. Deliberately contains NO venue geometry — no footprint,
 * no tiers, no playing surface. Those belong to a VenueDefinition, because
 * they are the things that differ between a football stadium, an arena and a
 * concert hall, and the whole point of the split is that the engine does not
 * care which one it is rendering.
 *
 * Rule of thumb for where a value belongs:
 *   "would this change if I swapped the sport?"  → VenueDefinition
 *   "would this change if I swapped the device?" → here
 */

/* ---------------------------------------------------------------------------
 * SEATING — engine defaults. A venue may override any of these.
 * ------------------------------------------------------------------------- */
export const SEATING = {
  pitch: 0.50,            // centre-to-centre seat width
  aisleHalfWidth: 0.68,   // clear space either side of a stair aisle
  treadOffset: 0.30,      // how far back from the row nosing a seat sits
  colorPrimary: 0x8f2233,
  colorAlternate: 0x2b3440,
  alternateBands: [[0.58, 0.66]]
};

/* ---------------------------------------------------------------------------
 * LEVEL OF DETAIL
 * Section chunks swap geometry by distance. Past `cull` a chunk draws nothing
 * and its crowd is suppressed.
 * ------------------------------------------------------------------------- */
export const LOD = {
  seatHigh: 45,
  seatLow: 160,
  cull: 900,
  crowdHigh: 70,
  crowdLow: 320,
  evaluateInterval: 0.25   // seconds between re-evaluations, prevents thrash
};

/* ---------------------------------------------------------------------------
 * RENDERING
 * ------------------------------------------------------------------------- */
export const RENDER = {
  maxPixelRatio: 2,
  mobileMaxPixelRatio: 1.5,
  exposure: 1.15,
  bloom: { enabled: true, strength: 0.42, radius: 0.5, threshold: 0.86 },
  shadows: { enabled: true, mapSize: 2048 },
  fogDensity: 0.0016,
  targetFPS: { desktop: 60, mobile: 30 },
  adaptiveFrameBudget: 22   // ms; above this, resolution steps down
};

/* ---------------------------------------------------------------------------
 * LIGHTING — sky and ambient presets. Fixture layout is per venue.
 * ------------------------------------------------------------------------- */
export const LIGHTING = {
  default: 'night',
  presets: {
    night: {
      sky: ['#02040a', '#071120', '#12243a', '#26364a'],
      hemi: { sky: 0x2b3d52, ground: 0x0a0e12, intensity: 0.42 },
      ambient: { color: 0x37485c, intensity: 0.28 },
      fixtures: { color: 0xfff1d6, intensity: 2.6 },
      stars: 900,
      exposure: 1.15
    },
    day: {
      sky: ['#5f9fd0', '#8fc0e2', '#cfe4f2', '#eaf3f9'],
      hemi: { sky: 0xbcd8f0, ground: 0x555f66, intensity: 1.1 },
      ambient: { color: 0xffffff, intensity: 0.45 },
      sun: { color: 0xfff4e2, intensity: 2.4, azimuth: 0.9, elevation: 0.95 },
      fixtures: null,
      stars: 0,
      exposure: 1.0
    },
    sunset: {
      sky: ['#0d1024', '#3a2340', '#8c4432', '#e0894a'],
      hemi: { sky: 0x6b4a52, ground: 0x1a1216, intensity: 0.6 },
      ambient: { color: 0x5a4450, intensity: 0.3 },
      sun: { color: 0xffb066, intensity: 1.6, azimuth: 2.6, elevation: 0.12 },
      fixtures: { color: 0xfff1d6, intensity: 1.5 },
      stars: 180,
      exposure: 1.1
    },
    indoor: {
      sky: ['#04070c', '#070b12', '#0a0f16', '#0d131b'],
      hemi: { sky: 0x3a4655, ground: 0x141a20, intensity: 0.7 },
      ambient: { color: 0x4a5a6a, intensity: 0.5 },
      fixtures: { color: 0xfff6e6, intensity: 2.2 },
      stars: 0,
      exposure: 1.05
    }
  }
};

/* ---------------------------------------------------------------------------
 * CROWD
 * ------------------------------------------------------------------------- */
export const CROWD = {
  fillRate: 0.86,
  palette: [0xb01a2c, 0xb01a2c, 0xe6ecef, 0x1b2a3a, 0x2f4a58, 0x8a5b3c, 0xf0d2b4, 0xd8a27a],
  idleAmplitude: 0.045,
  idleSpeed: 1.4,
  reactions: {
    cheer: { duration: 4.0, amplitude: 0.55, speed: 7.0 },
    wave:  { duration: 9.0, amplitude: 0.9,  speed: 1.0, wavelength: 0.12 },
    stand: { duration: 6.0, amplitude: 0.35, speed: 0.0 }
  }
};

/* ---------------------------------------------------------------------------
 * AVATARS
 * ------------------------------------------------------------------------- */
export const AVATARS = {
  maxRendered: 600,       // hard cap on drawn user avatars
  labelDistance: 55,      // usernames only draw inside this radius
  teamColors: {
    home: { primary: 0xb01a2c, secondary: 0xf2f5f7 },
    away: { primary: 0x1d3f6e, secondary: 0xc9d3dc },
    neutral: { primary: 0x4b5a66, secondary: 0xdfe7ec }
  },
  emotes: ['wave', 'cheer', 'clap', 'thumbsup', 'facepalm'],
  /** Synthetic user ids for locally spawned test avatars start here, so they
   *  can never collide with server-issued ids. */
  testIdBase: 1000000
};

/* ---------------------------------------------------------------------------
 * CAMERA — engine defaults; a venue supplies its own framing distances.
 * ------------------------------------------------------------------------- */
export const CAMERA = {
  fov: 42,
  near: 0.35,
  far: 4000,
  modes: ['orbit', 'fly', 'walk', 'seat', 'spectator', 'broadcast'],
  default: 'orbit',
  fly: { speed: 34, boost: 3, damping: 0.86 },
  walk: { eyeHeight: 1.7, speed: 6.5 },
  seat: { eyeHeight: 1.18, yawLimit: 2.1, pitchLimit: 0.7, transitionSeconds: 1.6 }
};

/* ---------------------------------------------------------------------------
 * ASSETS — every entry is optional; the engine runs fully procedural.
 * ------------------------------------------------------------------------- */
export const ASSETS = {
  dracoDecoderPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
  ktx2TranscoderPath: 'https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/',
  models: {
    // seat:       './assets/models/seat.glb',      // Draco + KTX2 encoded
    // avatarBase: './assets/models/avatar.glb'
  },
  environment: null
};

/* ---------------------------------------------------------------------------
 * NETWORK
 * ------------------------------------------------------------------------- */
export const NETWORK = {
  transport: 'mock',            // 'mock' | 'websocket'
  endpoint: 'wss://example.invalid/stadium',
  room: 'default',
  heartbeatSeconds: 15,
  presenceFlushHz: 8,
  mock: { initialUsers: 40, joinsPerMinute: 25, leavesPerMinute: 18 }
};

/* ---------------------------------------------------------------------------
 * SERVICES — which implementation of each backend contract to bind.
 * Swapping any of these should require no change outside this object.
 * ------------------------------------------------------------------------- */
export const SERVICES = {
  auth: 'local',          // 'local' | 'oauth' | 'custom'
  chat: 'local',          // 'local' | 'remote'
  voice: 'null',          // 'null'  | 'webrtc'
  persistence: 'memory',  // 'memory' | 'localStorage' | 'remote'
  crowdAI: 'scripted'     // 'scripted' | 'remote'
};

export default {
  SEATING, LOD, RENDER, LIGHTING, CROWD, AVATARS, CAMERA, ASSETS, NETWORK, SERVICES
};
