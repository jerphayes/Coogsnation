# The Object Model

**Read this before touching `ObjectRegistry`, `VirtualCollection`, or anything
that queries the venue.**

This document exists because the design has one genuinely surprising property,
and it was previously explained across three file headers and two ADRs. A
future engineer will not read five places. They will read one, or none.

---

## The idea in one paragraph

Everything interactive in a venue — seat, avatar, camera, light, scoreboard,
door, zone, parking space, crowd member — presents the same interface:
`VenueObject`. You can query it, read and write its state, subscribe to it,
serialize it, own it, and sync it over the network. The registry indexes all of
them. **How an object is stored is an implementation detail of its type**, and
the API is identical either way.

---

## Two storage strategies, one interface

```
                        ObjectRegistry
                              │
              ┌───────────────┴───────────────┐
              │                               │
        CONCRETE                          VIRTUAL
    stored instances              materialised on demand
              │                               │
   tens or hundreds                tens of thousands
              │                               │
  scoreboard, camera,            seat, crowd member,
  light, access point,             parking space
  zone, avatar                            │
              │                    backed by typed arrays
   an actual object in         ┌──────────┴──────────┐
   a Map, one per thing        │  SeatManager arrays │
                               │  crowd GPU buffers  │
                               │  Uint8Array stores  │
                               └─────────────────────┘
```

### The rule (ADR-012, ratified)

> Any object class that may scale into the tens or hundreds of thousands is
> **virtual**: backed by the most efficient internal representation available,
> and presented through the `VenueObject` contract.
>
> Any class that stays in the tens or hundreds is **concrete**.
>
> Callers cannot distinguish which they hold. Querying, events, serialization,
> networking, persistence and AI operate identically.
>
> Performance is a first-class architectural requirement.

### Why it exists

Two protected decisions collided. "Everything inherits from `VenueObject`"
(consistency) versus "typed-array seat storage" (58,298 seats without a GC
problem). Instantiating 58,298 seat objects is roughly 12 MB of heap and
produces garbage on every occupancy change — the most frequent write in the
system.

Neither decision was abandoned. `VenueObject` became a *contract*, and seats
satisfy it through handles built on demand over the arrays.

### Current classification

| Class | Storage | Count (football) | Backing store |
|---|---|---:|---|
| Seat | virtual | 58,298 | `SeatManager` typed arrays |
| Crowd member | virtual | 50,203 | GPU attribute buffers |
| Parking space | virtual | 16,180 | 3 × `Uint8Array` (~48 KB) |
| Zone | concrete | 113 | instance |
| Access point | concrete | 50 | instance |
| Scoreboard / light / camera | concrete | ~9 | instance |
| Avatar | concrete ⚠ | ~600 rendered | `Map` — see *Known exception* |

---

## THE ONE RULE FOR CALLERS

### Hold the index, not the handle.

```js
// ✗ WRONG — the handle is pooled and will be rebound to a different seat
const seat = registry.get('seat:football:lower:112:14:7');
this.watched = seat;
seat.on('changed', () => { … });     // silently dropped on recycle

// ✓ RIGHT — the index is a number and is stable forever
const seat = registry.get('seat:football:lower:112:14:7');
this.watchedIndex = seat.index;
registry.watch(evt => {              // durable, survives recycling
  if (evt.object.index === this.watchedIndex) { … }
});
```

Handles are pooled so that a query returning thousands of objects does not
allocate thousands of objects. `release()` returns one to the pool, and the
pool rebinds it to whatever the next caller asks for.

**Known defect, unfixed:** a per-object subscription on a *virtual* handle is
silently dropped when the handle recycles. A concrete object keeps its
subscription. This is a real break in the indistinguishability guarantee, and
`tests/conformance.mjs` does not catch it because the battery subscribes and
asserts within a single un-recycled lifetime.

The recommended fix — make `handle.on()` throw on a virtual handle and direct
callers to `registry.watch()` — is recorded in Phase III Q9/Q10 and not yet
applied. Until then, the rule above is the mitigation.

---

## What you get, either way

```js
obj.id             // runtime-unique, cheap, not stable across sessions
obj.persistentId   // stable across sessions AND across venue rebuilds
obj.type
obj.transform      // { position, rotation, scale }
obj.state          // live; mutate via setState so listeners fire
obj.metadata       // frozen, descriptive
obj.owner

obj.setState({ … })
obj.matches({ … })          // exact value, array (any-of), or predicate fn
obj.claim(userId) / obj.release()
obj.on(event, handler)      // ⚠ see the rule above for virtual objects
obj.serialize() / obj.hydrate(data)
obj.collectDelta() / obj.applyDelta(delta)
```

### Persistent ids are derived, never random

```
seat:basketball:club:202:3:14
 │      │        │    │  │ └── seat number
 │      │        │    │  └──── row
 │      │        │    └─────── section label
 │      │        └──────────── tier id
 │      └───────────────────── venue id
 └──────────────────────────── type
```

Rebuild the venue from the same definition and every seat reclaims its own
history. A random UUID would orphan every ticket the first time a tier table
changed.

**The consequence, and it is real:** changing venue structure renames seats
downstream of the change. There is currently no migration tooling. This is the
one decision that becomes unfixable once real user data exists (Phase III Q6).

---

## Querying

```js
registry.get(persistentId)
registry.find({ type: 'seat', vip: true })
registry.query({ type: 'seat', occupancy: 'empty' }, { limit: 50 })
registry.near(x, y, z, radius, { type: 'avatar' })
registry.summary('seat', 'occupancy')     // { empty, ai, user }
registry.countOfType('seat')
registry.watch(evt => …)                  // every change, every type
```

### Fast paths matter enormously

A virtual collection may implement `fastQuery(criteria)` and
`fastSummary(field)` to answer from its arrays without materialising anything.
Measured on 58,298 seats:

| Query | Time | Objects allocated | Results |
|---|---:|---:|---:|
| `summary('seat','occupancy')` | 1.0 ms | **0** | — |
| `near(seat, r=8)` | 2.0 ms | 192 | 192 |
| `find({ section })` | 6.1 ms | 1 | 1 |
| `query({ section })` | 57 ms | 653 | 653 |

`query({ section })` is slow because *section is metadata* and no fast path
covers it, so the walk builds a persistent-id string per candidate. Allocation
is proportional to results; wall time is not. A per-section index would fix it
and has not been built because no shipped caller needs it.

**The contract is enforced, not trusted.** `safeQueryIndices()` rejects
non-arrays, out-of-range indices, and falls back on empty criteria — because a
subclass that forgets the empty-criteria guard would otherwise make
`query({ type })` return **zero results with no error** (ADR-015).

---

## Adding a new virtual type

Extend `VirtualCollection` and supply only field accessors. Pooling, id
indexing, delta tracking, snapshot, restore and event dispatch are inherited.

```js
export class TurnstileCollection extends VirtualCollection {
  constructor(ctx) { super({ type: 'turnstile', venueId: ctx.venueId }); … }

  get count() { … }
  describe(i)         { return { persistentId: …, metadata: … }; }
  readState(i)        { return { … }; }          // live view, not a copy
  writeState(i, patch){ return ['changedKeys']; }
  readTransform(i)    { return { position, rotation, scale }; }
  readOwner(i)        { return … ; }

  // optional but strongly recommended
  positionAt(i)       { … }        // read the array directly, no allocation
  fastQuery(criteria) { … }        // MUST return null on empty criteria
  fastSummary(field)  { … }
  isDivergent(i)      { … }        // drives snapshot size
  claimAt(i, spec) / releaseAt(i)
}
```

`ParkingCollection` is the reference implementation: a complete high-volume
type with claiming, persistence and network sync in ~180 lines, requiring no
change to `VenueObject`, `ObjectRegistry`, the director or any plugin.

---

## The twin is not a view of the scene graph

An object may exist in the registry with **no rendered geometry at all**
(ADR-013). Parking has 16,180 queryable, claimable, persistable spaces and
draws nothing. Restrooms, concessions, media rooms and officials' rooms are
zones with a position and a capacity and no mesh.

Binding the twin to the scene graph would mean either modelling everything you
want to query, or querying only what you happened to model. Both are wrong.
Geometry can be attached to any class later without a single consumer noticing.

---

## Known exception: avatars

`AvatarManager` keeps its roster in a `Map` and allocates render slots by join
order. By the rule above, avatars should be virtual.

They are not, because migrating the internal storage is a real refactor of a
working module and doing it alongside the rule's ratification would mix two
risks. **The external object model is already correct** — `AvatarObject`
satisfies the contract — so the migration is internal and invisible to
consumers.

Measured at 10,000 concurrent users: 94% have no render slot, and of the users
within 10 m of a viewer, only ~11% render. Frame cost is flat at 2.0–3.5 ms
regardless of roster size, so this is a *locality* defect, not a scaling curve.

**Redesign trigger:** roster above 2,000, or the day seat mode or proximity
voice ships — whichever comes first.
