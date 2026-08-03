# Venue Authoring

A venue supplies **geometry, layout, seating configuration, sport-specific
objects, camera presets and metadata**. Nothing else. If you find yourself
wanting to import `SeatManager`, `ObjectRegistry` or anything under `src/core`,
stop — the venue seam is missing a hook, and adding one is a smaller change
than reaching through.

The integration suite enforces this mechanically: no venue file may import from
`core`, `seats`, `crowd`, `avatars`, `net`, `plugins` or `services`.

---

## Two ways to define a venue

| | Class | Data |
|---|---|---|
| Written as | `VenueDefinition` subclass | `.venue.json` |
| Use when | the playing surface needs real code | everything else |
| Example | `FootballStadium`, `BasketballArena`, `BaseballField` | `venues/concert.venue.json` |

The registry loads both identically, so a venue can migrate between them
without any consumer noticing. Register in `src/venues/index.js`:

```js
myvenue: {
  label: 'Generic Fieldhouse',
  category: 'volleyball',
  kind: 'class',                                   // or 'data' + url
  load: () => import('./Fieldhouse.js').then(m => new m.Fieldhouse())
}
```

---

## Choosing a plan

Two `Footprint` implementations exist. Both satisfy the same interface; nothing
downstream knows the difference.

**Closed bowl** — rounded rectangle. Four straights, four corner arcs. The
parameter `t` wraps: `t = 1.02` is `t = 0.02`.

```js
footprint: { coreX: 44, coreZ: 15, cornerRadius: 16, referenceRadius: 38 }
```

**Open fan** — offset V for diamond sports. Two straights parallel to the foul
lines joined by a 90° arc behind home plate. **`t` clamps rather than wraps** —
past the end is past the end.

```js
footprint: { kind: 'fan', backstop: 16, baseline: 52, referenceRadius: 16 }
```

`createFootprint(cfg)` selects by `kind`. Landmarks differ: a bowl offers
`west / north / east / south` plus corners; a fan offers `third / home / first`
plus `plate`.

---

## Tiers

Tiers drive the entire seat manifest. Capacity is whatever the geometry
produces — never a hard-coded number.

```js
{
  id: 'lower',                  // stable; used in persistent ids
  label: 'Lower Bowl',
  sectionPrefix: 100,           // 101, 102, … unless sectionLabel() overrides
  d0: 0.5,  d1: 35,             // offset from the plan, front → back
  y0: 1.4,  y1: 24,             // height, front → back
  rows: 45,
  spans: 'full',                // or ['west','east'] — landmark names
  sectionsPerSpan: 48,
  vip: false,
  basePrice: 65
}
```

Verify with `venue.estimateCapacity(footprint, SEATING)` — it shares
`SeatManager`'s arc-length measurement, so the two agree exactly (ADR-016).

⚠ **Two tiers must not share a `sectionPrefix`.** Duplicate section labels
produce duplicate zone persistent ids and the registry throws at construction.
Override `sectionLabel()` if you need distinct schemes — `BasketballArena` uses
`CS1…` for courtside and `ST1…` for the student section.

---

## Structure

Every key is optional; an omitted key is simply not built. That is how an
indoor arena skips masts, canopy and press box without a single conditional
about basketball anywhere in the engine.

| Key | Builds |
|---|---|
| `facade` | outer wall with portals |
| `concourse` | level heights and width |
| `suites` | glazed boxes on a named span |
| `canopy` | cantilevered roof over a span |
| `roof` | full enclosing shell |
| `pressBox` | box above a span |
| `tunnels`, `escalators`, `elevators` | circulation |
| `videoBoards`, `ribbonBoards` | displays |
| `approach` | exterior pole lights |
| `parking` | virtual parking lots (no geometry) |
| `tailgate` | pads and instanced canopy tents |
| `zones` | restrooms, concessions, media, officials, locker rooms |
| `accessPoints` | entrances, emergency exits, doors |

### Video boards

Three placement modes:

```js
{ id: 'north-main', end: 'north', width: 52, height: 26, y: 36 }   // bowl end
{ id: 'centre-hung', end: 'centre', width: 9, height: 5.5, y: 19 } // 4 faces
{ id: 'centerfield', width: 16, height: 9,
  position: [108, 14, 34], facing: [0, 2, 0] }                     // explicit
```

Use explicit `position` for open plans, where "north end" has no meaning.

### Amenities as data

```js
zones: [
  { id: 'restroom-n1', kind: 'restroom', label: 'Restroom N1',
    capacity: 40, centre: [-14, 0, -30] }
],
accessPoints: [
  { id: 'exit-ne', kind: 'emergencyExit', connects: ['concourse-1', 'exterior'],
    capacityPerMinute: 1100, bidirectional: false, position: [24, 0, -24] }
]
```

These become twin objects with no geometry required. Meshes can be attached
later without any consumer changing (see OBJECT-MODEL.md).

---

## Lighting

```js
lighting: { preset: 'night', fixtures: { … } }
```

| `fixtures.type` | Shape | Suits |
|---|---|---|
| `masts` | four corner masts | rectangular open-air bowls |
| `catwalk` | concentric ceiling rings | enclosed arenas |
| `poles` | explicit `positions: [[x,z],…]` | open plans with no corners |
| `null` | ambient only | — |

Presets: `night`, `day`, `sunset`, `indoor`.

---

## Camera presets

```js
camera: {
  orbitTarget: [0, 7, 0], orbitMin: 12, orbitMax: 280,
  home: [-58, 40, -64],
  spectator: { min: 16, max: 64, target: [0, 3, 0] },
  broadcast: { radius: 56, height: 18, period: 70 },
  views: {
    'broadcast-center': { position: [0, 14.5, -27], target: [0, 1.5, 0] },
    'free-roam':        { position: [-58, 40, -64], target: [0, 7, 0],
                          freeRoam: true, seconds: 2.0 }
  }
}
```

`camera.setView(name)` flies using the same eased transition as `gotoSeat()`.
`freeRoam: true` returns control to orbit when the flight lands; otherwise the
view locks. Each entry also becomes a `CameraObject` in the twin.

---

## Hooks

All optional. Override on your `VenueDefinition` subclass.

| Hook | Purpose |
|---|---|
| `buildSurface(ctx)` | **required** — pitch, court, diamond, stage |
| `sectionLabel(tier, span, ordinal)` | naming scheme |
| `seatPrice(seat)` | pricing model |
| `seatMetadata(ctx)` | extra per-seat twin fields |
| `onBuilt(ctx)` | one-shot post-build FX |
| `update(dt, elapsed)` | per-frame venue animation |

### ⚠ `seatMetadata()` has a hard cost contract

It runs once per seat description and sits on the `describe()` path — already
the engine's hottest walk (31.8 ms per full manifest, dominated by per-seat
string building).

**Return a shared frozen object per section. Never allocate per seat.**

```js
seatMetadata({ tier, section }) {
  if (!this._meta) this._meta = new Map();
  let m = this._meta.get(section);
  if (m) return m;                                    // shared reference
  m = Object.freeze({
    bowl: tier.id === 'upper' ? 'upper' : 'lower',
    student: tier.id === 'student',
    accessible: tier.id !== 'courtside',
    cameras: Object.freeze(this._camerasFor(tier))    // preset names
  });
  this._meta.set(section, m);
  return m;
}
```

The basketball acceptance suite asserts this by identity comparison, so a venue
that allocates per seat fails the test rather than quietly degrading the twin.

**Camera visibility is per-section by decision** — a list of preset names, not
line-of-sight. The shape is deliberately plain data so true occlusion results
can replace it from this same hook with no consumer change.

---

## AI Director hooks

Venues may ship a hooks file composing engine primitives into sport events.
`src/venues/basketball.hooks.js` is the reference.

```js
export const MY_HOOKS = {
  'player-introductions': (p = {}) => [
    directive(CHANNEL.LIGHTING, 'preset', { preset: 'indoor' },
      { priority: PRIORITY.EVENT, reason: 'introductions' }),
    directive(CHANNEL.CROWD, 'react', { type: 'cheer', strength: 1 },
      { priority: PRIORITY.EVENT, reason: 'introductions' })
  ]
};
```

**Integration points only.** Each entry is a pure function from payload to
directives — no timers, no state, no subscriptions, nothing that decides *when*
an event happens. A game feed, operator console or AI director calls
`venue.emit(director, 'timeout', { team: 'home' })`.

Never extend the directive vocabulary from a venue. Compose the existing
channels and actions in `src/ai/directives.js`; arbitration, cooldowns,
adapters and validation stay in the director.

---

## Checklist for a new venue

1. Pick a plan (`bowl` or `fan`) and tune the footprint.
2. Define tiers; verify with `estimateCapacity()`.
3. Ensure no two tiers share a `sectionPrefix`.
4. Declare structure keys you want; omit the rest.
5. Implement `buildSurface()`.
6. Declare lighting fixtures matching the building type.
7. Declare camera presets.
8. Add `seatMetadata()` if you need extra twin fields — **shared per section**.
9. Add a hooks file if the sport has events.
10. Register in `src/venues/index.js`.
11. Run `npm run test:smoke` and `npm run test:integration`.

No engine file should change. If one must, the seam is missing a hook — add the
hook generically so every venue benefits, and record it in `docs/DECISIONS.md`.
