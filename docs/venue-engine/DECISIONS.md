# Architecture Decision Records

Documentation is part of the product. These records exist so that a future
maintainer — including a future version of the original author — can tell the
difference between a decision and an accident.

Each record states the forces, the choice, and what it costs. A record with no
cost section is usually a record that has not been thought through.

## Index

| ADR | Subject | Phase |
|---|---|---|
| 001 | Struct-of-arrays seat storage | I |
| 002 | One InstancedMesh per section | I |
| 003 | Crowd animation in the vertex shader | I |
| 004 | Services are capabilities, not socket messages | I |
| 005 | Local service implementations work rather than throw | I |
| 006 | VenueObject is a contract; flyweights satisfy it | II |
| 007 | Persistent ids are derived, never random | II |
| 008 | The director issues directives; adapters translate | II |
| 009 | Plugin capabilities are structural, not security | II |
| 010 | Venue definitions may be data or class | II |
| 011 | Renamed StadiumEngine to VenueEngine | II |
| 012 | **The virtual-object rule, ratified** | II |
| 013 | The twin is not a view of the scene graph | II |
| 014 | Construction is chunked, not synchronous | II.1 |
| 015 | Fast paths are validated, not trusted | II.1 |
| 016 | Estimators share the measurement, not model it | II.1 |
| 017 | FanFootprint: the asymmetric plan | 3.0 |
| 018 | Four additive seam extensions for basketball | 3.0 |
| 019 | Yield intervals finer than the smallest unit | 3.0 |

---

## ADR-001 — Struct-of-arrays seat storage

**Status:** accepted, frozen
**Phase:** I

### Forces
A 60,000-seat venue needs per-seat occupancy, flags, ownership and position.
Sixty thousand plain objects is roughly 12 MB of heap and produces garbage on
every occupancy change — which is the most frequent write in the system.

### Decision
Parallel typed arrays indexed by a global seat index. `getSeat(i)` materialises
an ergonomic record on demand for the UI and network code, which are the only
consumers that want one.

### Cost
Seat data is not object-shaped, so anything wanting object semantics needs a
bridge. ADR-006 is that bridge, and it exists because of this decision.

---

## ADR-002 — One InstancedMesh per section, not per tier

**Status:** accepted, frozen
**Phase:** I

### Forces
A single instanced mesh for all 60,000 seats is one draw call but cannot be
frustum culled, cannot swap LOD by distance, and forces every raycast to test
every seat.

### Decision
Chunk by section. Roughly 110 draw calls, of which 20–40 are typically visible.

### Cost
More draw calls than the theoretical minimum. Worth it: culling removes far
more work than the extra calls add, and sections are the domain's own unit —
the render split and the wayfinding split coincide, which is usually a sign the
seam is in the right place.

---

## ADR-003 — Crowd animation entirely in the vertex shader

**Status:** accepted, frozen
**Phase:** I

### Forces
Animating ~50,000 spectators from JavaScript costs several milliseconds per
frame and blows the entire budget on its own.

### Decision
Per-instance `phase` and `seed` attributes plus three uniforms. Idle bobbing,
cheers and stadium waves are computed on the GPU. A bowl-wide reaction is one
uniform write per chunk, independent of crowd size.

### Cost
Crowd behaviour is constrained to what is expressible in a vertex shader.
Individual per-spectator logic is not available. Acceptable: spectators are
scenery, and anything needing individual logic is an avatar, not crowd.

---

## ADR-004 — Services are capabilities, not messages on the socket

**Status:** accepted, frozen
**Phase:** I

### Forces
Auth, chat, voice, persistence and crowd AI could all have been messages over
the same WebSocket that carries presence.

### Decision
Five separate contracts in `services/interfaces.js`, bound independently.

### Rationale
`NetworkManager` moves *state* — who is where, right now — over one connection.
These are *capabilities*, and each may live behind a different provider:
identity on an IdP, voice on an SFU, chat on its own moderated pipeline.
Collapsing them into the socket is the refactor this design exists to prevent.

### Cost
More surface area than one message enum. Paid back the first time one of the
five needs a different provider, which is certain.

---

## ADR-005 — Local service implementations work rather than throw

**Status:** accepted
**Phase:** I

### Decision
Every contract ships a functioning local implementation, not a `NotImplemented`
placeholder.

### Rationale
A stub that throws hides integration bugs until the day a real provider is
wired up. A stub that works means that day changes one string in
`engine.config.js`.

`NullVoiceService` is the honest exception: there is no peer to talk to
locally, so it reports `supported: false` and no-ops, which lets the UI disable
the control truthfully rather than fake a call.

---

## ADR-006 — VenueObject is a contract; high-cardinality types satisfy it via flyweights

**Status:** accepted — **generalised by ADR-012**
**Phase:** II
**Supersedes nothing. Resolves a conflict between ADR-001 and Phase II objective 2.**

### Forces
Phase II objective 2 requires that everything in the venue inherit from a
common `VenueObject` base. ADR-001 requires that 60,000 seats not be objects.
Both are on the protected list. Taken literally, they cannot both hold.

Three options were considered:

1. **Instantiate seats as VenueObjects.** Restores consistency, reverses
   ADR-001, reintroduces ~12 MB of heap and per-change garbage. Rejected: it
   silently undoes a frozen decision to satisfy a newer one.
2. **Exempt seats from the contract.** Preserves ADR-001, defeats the
   consistency objective 2 exists to create, and leaves every consumer writing
   `if (isSeat)`. Rejected.
3. **Make VenueObject a contract satisfied two ways.** Accepted.

### Decision
`VenueObject` defines identity, transform, state, metadata, ownership, events,
serialization and network delta.

- **Concrete types** (scoreboard, access point, light, zone, avatar) are stored
  instances. There are tens of them.
- **High-cardinality types** (seats) are satisfied by *handles* — thin views
  over the backing typed arrays, built on demand, pooled, never stored. They
  register with `ObjectRegistry` as a **virtual collection**.

Query, state, events, serialization and delta behave identically for both.
Callers cannot tell which they hold, and must not need to.

### Cost
Two implementation paths inside the registry. Mitigated by the fact that the
difference is invisible above the registry: no consumer branches on it. The
`CollectionProvider` interface is the price, and it is a small, documented one.

The real risk is a handle held across frames after its seat is rebound. The
mitigation is documented at the top of `SeatHandle.js`: **hold the index, not
the handle.** The index is a number.

### Evidence
`tests/conformance.mjs` asserts that a virtual collection of 60,000 objects
answers a census with **zero** object allocations, and that a filtered query
materialises exactly as many handles as it returns — no more.

### Superseded detail
The original implementation put pooling, id indexing, delta tracking and
snapshot logic inside `SeatHandle`. ADR-012 lifts all of it into a reusable
base, so a new high-volume type costs only its field accessors.

---

## ADR-007 — Persistent ids are derived, never random

**Status:** accepted
**Phase:** II

### Decision
`seat:football:lower:112:14:7`, not a UUID.

### Rationale
Rebuild the venue from the same definition and every seat reclaims its own
history — tickets, ownership, maintenance records. A random id would orphan all
of it the first time the tier table changed, which it will.

### Cost
Ids change if the venue's structure changes. This is correct: a seat that moved
to a different row *is* a different seat, and quietly keeping its history would
be the bug.

---

## ADR-008 — The director issues directives; adapters translate

**Status:** accepted
**Phase:** II

### Forces
An orchestration layer that calls `crowdManager.react()` directly is coupled to
every module it drives, and adding it means editing all of them — a core
redesign, which is now frozen.

### Decision
`AIDirector` emits validated *directives* on a channel. `ai/adapters.js`
subscribes and calls the public methods a human would call.

### Consequence
The director was added **without modifying a single existing module.** That is
the evidence the seam is real, not aspirational.

### Cost
An indirection layer, and a vocabulary that must be kept in sync with
capability. `DIRECTIVE_SCHEMA` makes the surface reviewable in one file, and
unroutable directives fail loudly at issue rather than silently three
subsystems downstream.

Audio, effects and announcements are registered as quiet no-ops rather than
left unregistered — so behaviours can be written against the real vocabulary
today, and the history log records intent the venue cannot yet carry out. An
unregistered channel would spam warnings and tempt someone to stop issuing the
directive at all, which loses the information.

---

## ADR-009 — Plugin capabilities are structural, not checked

**Status:** accepted
**Phase:** II

### Decision
A plugin declares capabilities; `PluginHost` builds a context object containing
only those surfaces. A plugin that did not request `services` has no `services`
property.

### Rationale
This is **not a security boundary** — anything in the page can reach the engine
if determined. It is a *design* boundary: it makes a plugin's blast radius
legible in one line, and an over-reaching plugin fails at install rather than
quietly coupling to internals that were never public.

Stating this plainly matters. A capability system described as security, that
isn't, is worse than none — it invites trust it cannot carry.

### Cost
Capability lists must be maintained as plugins evolve. Cheap, and the failure
mode is a clear error at load.

---

## ADR-010 — Venue definitions may be data or class

**Status:** accepted
**Phase:** II

### Forces
Objective 3 wants `loadVenue("concert")` with no engine modification.
Everything in a venue definition is declarative except `buildSurface()`, which
is genuinely code — painting a gridiron is not a config value.

### Decision
`JSONVenue` builds a `VenueDefinition` from a plain document. The surface is
named from a small library of parameterised **recipes** (`slab`, `markedField`,
`stage`). The registry loads data and class venues identically.

### Cost
Recipes are less expressive than code. An exotic surface still wants a class,
and that stays supported.

The claim is deliberately narrow: not "all venues can be data", but "the common
ones should be, and the escape hatch stays open." Pushing arbitrary drawing
logic into JSON would produce something worse than a class in every respect —
harder to read, impossible to debug, and untyped.

`venues/concert.venue.json` is a complete venue with four tiers, a stage, letter
section naming and custom pricing, defined without a line of code.

---

## ADR-011 — Renamed StadiumEngine to VenueEngine

**Status:** accepted
**Phase:** II

### Rationale
Names shape assumptions. `StadiumEngine` invites stadium-shaped changes.
Sports are the first deployment of a venue runtime, not the thing itself.

### Cost
One rename, done in a single pass. Cheap now, expensive later.


---

## ADR-012 — The virtual-object rule, ratified

**Status:** accepted, standing
**Phase:** II
**Generalises ADR-006 from a seat-specific fix into a project-wide rule.**

### Decision

> Any object class that may scale into the tens or hundreds of thousands is
> **virtual**: backed by the most efficient internal representation available —
> typed arrays — and presented through the `VenueObject` contract.
>
> Any object class that stays in the tens or hundreds is **concrete**: an
> ordinary stored instance.
>
> Callers cannot distinguish which they hold. Querying, events, serialization,
> networking, persistence and AI systems operate identically.
>
> Performance is a first-class architectural requirement.

Applies to every future object class, not only the ones that exist today.

### Current classification

| Class | Representation | Cardinality | Backing store |
|---|---|---:|---|
| Seat | virtual | 60,000 | SeatManager typed arrays |
| Crowd member | virtual | ~50,000 | CrowdManager GPU attribute buffers |
| Parking space | virtual | ~16,000 | 3 × `Uint8Array` (≈48 KB) |
| Zone | concrete | ~110 | instance |
| Access point | concrete | ~50 | instance |
| Scoreboard | concrete | ~3 | instance |
| Light fixture | concrete | ~4 | instance |
| Camera | concrete | 1 | instance |
| Avatar | concrete *(see below)* | ~600 rendered | `Map` |

### Implementation

`core/VirtualCollection.js` makes the pattern correct by construction. A
subclass provides only field accessors over its store — `count`, `describe`,
`readState`, `writeState`, `readTransform`, `readOwner`, and optionally
`fastQuery` / `fastSummary` / `isDivergent`. Pooling, persistent-id indexing,
delta tracking, snapshot, restore and event dispatch are inherited.

The reduction is the evidence it generalised: seats went from ~200 lines of
bespoke plumbing to ~180 lines that are almost entirely about seats.
`ParkingCollection` — a brand new type with its own store, claiming,
persistence and network sync — is ~180 lines and required **no change** to
`VenueObject`, `ObjectRegistry`, the director, or any plugin.

### Three gaps this closed

Ratifying the rule exposed places where callers *could* still tell the
difference. All three were real, and all three are fixed:

1. **Delta collection skipped virtual objects.** `ObjectRegistry.collectDeltas()`
   returned concrete deltas only. Virtual collections now track dirt per index
   on the *collection* — not on the handle, which may be recycled before anyone
   collects — and participate identically. Cost stays proportional to what
   changed, never to cardinality.
2. **The change stream skipped virtual objects.** `registry.watch()` saw
   concrete events only, so `AnalyticsPlugin` was structurally blind to seats.
   Collections now forward into the same fan-out.
3. **Persistence was seat-specific.** It listened for `SEAT_CLAIMED`. It now
   watches the twin, so any claimable object — a seat, a parking space, a
   future suite — persists by the same path with no new wiring.

### Cost

Two implementation paths inside the registry, and a base class that must stay
honest. Both are contained: the difference is invisible above the registry, and
`tests/conformance.mjs` runs an **identical battery** against a concrete object
and a virtual one. A change that breaks parity fails on the virtual side and
passes on the concrete side, pointing straight at the seam.

The suite was mutation-tested. Reintroducing gap 1 fails
`deltas are collected`; gap 2 fails `change stream sees the event`; removing a
fast path fails `fastQuery materialises exactly the matches`; caching state on
a handle fails five assertions. It detects the regressions it claims to.

### The one caller-visible consequence

**Hold the index, not the handle.** Handles are pooled and may be rebound after
you release your reference. The index is a number and is stable. This is
documented at every entry point, and it is the single thing a consumer must
know about the distinction.

### Known exception, flagged not hidden

**Avatars are concrete but scale like a virtual class.** `AvatarManager` caps
*rendered* avatars at 600, but the roster is a `Map` and a full room could hold
tens of thousands. By the rule above, avatars should be virtual.

They are not yet, because migrating `AvatarManager`'s internal storage to typed
arrays is a real refactor of a working module, and doing it in the same pass as
ratifying the rule would mix two risks. The external object model is already
correct — `AvatarObject` satisfies the contract — so the migration is internal
only and invisible to consumers.

**Trigger:** when a deployment expects concurrent rosters above ~10,000.
Recorded here rather than left as a surprise.

---

## ADR-013 — The twin is not a view of the scene graph

**Status:** accepted
**Phase:** II

### Decision
An object may exist in the registry with no rendered geometry at all.

### Rationale
`ParkingCollection` has ~16,000 queryable, claimable, persistable,
network-synced spaces and draws nothing. Parking lots exist as data long before
anyone models them, and a ticketing or arrivals system needs them regardless.

Binding the twin to the scene graph would mean either modelling everything you
want to query, or querying only what you happened to model. Both are wrong.

### Consequence
Geometry can be attached to any object class later without a single consumer
noticing — the registry API does not change.

---

## ADR-014 — Construction is chunked, not synchronous

**Status:** accepted
**Phase:** II.1 (post-review)

### Forces
Building the football venue costs ~520ms of pure computation on desktop:
~260ms of geometry, ~260ms of seat manifest and meshes. Written as straight
loops that is 520ms during which the browser cannot paint, cannot accept input,
and cannot advance the loading bar that is supposedly reporting progress. On a
mid-range phone, multiply by four to six.

This was missed for two revisions because static analysis, import audits and
123 green assertions say nothing about it. It only appeared when the code was
executed.

### Decision
`VenueBuilder.create()` and `SeatManager.create()` drive generator-based
construction through `core/scheduler.js`, surrendering the thread whenever an
8ms budget is spent. The synchronous constructors remain for tests and tooling
and produce byte-identical output.

### Measured

| | before | after |
|---|---:|---:|
| longest uninterrupted block | 522ms | 62ms |
| median block | — | 8.2ms |
| blocks over one 16.7ms frame | 2 of 2 | 6 of 45 |

### Where the seam goes
Interruption points are a property of the algorithm, which is why construction
is a *generator* and not a callback — the code being interrupted chooses where
that is safe.

The first attempt yielded per span. That failed for a `spans: 'full'` tier,
because the entire lower bowl is one span: a 180ms indivisible unit. **The seam
must be finer than the largest thing it is meant to divide.** Yields now sit
inside the row loops.

### Cost
Total wall time rises slightly (~520ms → ~575ms) from scheduling overhead. That
is the correct trade: the venue takes marginally longer to appear and the tab
stays alive throughout.

### Residual
Six blocks still exceed a frame, peaking at 62ms. These are single
`computeVertexNormals()` calls on large merged geometries — atomic operations
that cannot be split without restructuring geometry generation. Recorded rather
than hidden. Moving the seat manifest to a Worker would remove most of the
remainder and is the natural next step; it was not done here because the output
is three.js objects, which are not transferable.

---

## ADR-015 — Fast paths are validated, not trusted

**Status:** accepted
**Phase:** II.1 (post-review)

### Forces
`VirtualCollection` subclasses implement `fastQuery` to answer common criteria
from their backing arrays. A subclass that omits the empty-criteria guard
returns `[]` instead of `null` for `query({ type })`, so an unfiltered query
**silently yields zero results and reports no error.**

Nothing downstream can distinguish "no matches" from "the fast path was wrong".
All three shipped collections happened to have the guard; nothing enforced it,
and the conformance suite did not detect its absence.

### Decision
`safeQueryIndices()` and `safeSummary()` wrap the subclass hooks and enforce
the contract centrally: empty criteria fall back, non-arrays are rejected,
out-of-range indices are rejected, and each failure logs.

### Rationale
A wrong answer that reports success is the worst failure mode a query API can
have — worse than a crash, because it propagates silently into whatever
consumed it. The guard belongs in one place, not repeated in every subclass and
correct only by luck.

---

## ADR-016 — Estimators must share the measurement, not model it

**Status:** accepted
**Phase:** II.1 (post-review)

### What happened
`VenueDefinition.estimateCapacity()` approximated a section's arc length as
`perimeter(d) × Δt`. That is wrong: the perimeter parameter `t` is normalised
against a **reference radius**, so the product is not arc length at offset `d`.
Per-section the error reached 28%.

It partly cancelled between straights and corners, so the totals looked
plausible — and shipped wrong into the README, the ADRs and every summary:

| venue | documented | actual | error |
|---|---:|---:|---:|
| football | 59,802 | 58,298 | −2.5% |
| basketball | 20,376 | 20,304 | −0.4% |
| concert | ~24,000 | 16,260 | **−32%** |

### Decision
`estimateCapacity()` now calls `footprint.arcTable()` — the same measurement
`SeatManager` uses. The two agree exactly, by construction, for all three
venues.

### Principle
A tool that estimates a quantity should share the computation with whatever
produces it, not re-derive it. Two independent derivations of one number is two
things to keep in sync, and the failure is silent by nature: a plausible wrong
number does not look like a bug.

---

## ADR-017 — FanFootprint: the asymmetric plan, delivered through the existing seam

**Status:** accepted
**Phase:** CoogsNation 3.0 venue expansion

### Context
Baseball was flagged since Phase I as the one venue requiring a core change:
the bowl wraps a diamond, not a rectangle. The architecture freeze permits
extension through existing seams; this is that extension, not a redesign.

### Decision
`FanFootprint` is a second implementation of the footprint seam: an open
offset-V — two straights parallel to the foul lines joined by a 90° arc behind
home plate, tangent-continuous by construction. It overrides only `point()`,
`landmarks()` and `perimeter()`; `arcTable`, `tAtLength` and `row` are
inherited untouched because they are generic over `point()`.

`createFootprint(cfg)` selects the plan from venue data (`footprint.kind`).
No consumer knows which plan produced its numbers.

### The one behavioural difference
A ring wraps (`t % 1`); a grandstand does not. `FanFootprint.point()` CLAMPS
t to [0,1]. Span bleed at the extremes flattens onto the end instead of
teleporting to the opposite baseline.

### Evidence the seam held
The complete ballpark — 4,916 seats, 40 sections, crowd, twin, director,
plugins, test avatars — constructs and runs with **zero modifications** to
SeatManager, CrowdManager, VenueBuilder's shared phases, ObjectRegistry or any
other engine module. Three small additive extension points were needed, none
of them architectural: a `poles` lighting fixture type (corner masts assume a
rectangle has corners), explicit world-position video boards ("north end"
means nothing on an open plan), and fan-aware footprint validation.

### Cost
Two plan implementations to keep honest against the same interface. The smoke
harness runs all four venues on every pass, which is the regression net.

### Incident worth recording
Integration surfaced a real collision: two arena tiers sharing
`sectionPrefix: 0` produced duplicate zone persistentIds, and the registry's
duplicate-id guard threw at construction. That is the loud-failure design
working as intended — the fix was collegiate section lettering (CS1…, ST1…) in
the venue, not a relaxation of the guard.

---

## ADR-018 — Four additive seam extensions for the basketball venue

**Status:** accepted
**Phase:** CoogsNation 3.0 basketball build

### Why this ADR exists
The directive's success criterion reads "No engine modifications were
required." That is **not literally true**, and recording it plainly is more
useful than claiming a clean sheet. Four engine files were touched. All four
are additive, generic, and default to previous behaviour; none is a new
architectural pattern; every venue benefits, not just basketball.

| File | Change | Default when unused |
|---|---|---|
| `venues/VenueDefinition.js` | `seatMetadata(ctx)` hook | returns `null` |
| `objects/SeatCollection.js` | merges venue metadata into `describe()` | no merge |
| `objects/builtins.js` | generic `structure.zones` / `structure.accessPoints` | empty lists |
| `camera/CameraController.js` | `setView(name)` / `views()` | venue declares none |

### Why each was unavoidable

**Seat metadata.** The directive requires bowl, student and camera-visibility
fields on every seat. `describe()` is engine code and returned a fixed field
set; without a venue hook, the only alternatives were hard-coding basketball
fields into the engine (a venue special-case — far worse) or shipping the
metadata somewhere other than the twin (breaking twin compatibility, which the
directive explicitly requires). The hook follows the existing venue-seam
pattern already set by `sectionLabel()` and `seatPrice()`.

**Zones and access points.** Restrooms, concessions, media rooms, officials'
rooms, entrances and emergency exits are all "a named place with a capacity"
or "a door with a throughput". Rather than a builder per type, venues declare
them as data. This also **replaced** the earlier tailgate special-case with a
general mechanism, so it is a net simplification.

**Camera presets.** Nine named views that must "function" require a way to
activate them. `setView()` reuses the existing eased transition used by
`gotoSeat()` and `reset()` — no new machinery, no new state.

### The performance constraint on the metadata hook
`seatMetadata()` sits on the `describe()` path, already identified as the
engine's hidden bottleneck (Phase III Q4: 31.8ms per full walk, dominated by
per-seat string building). A hook that allocated per seat would compound it.

The contract is therefore explicit: **return a shared frozen object per
section, never a fresh one per seat.** BasketballArena precomputes one frozen
record per section into a `Map` on first use. The acceptance test asserts this
by identity comparison, so a future venue that allocates per seat fails the
test rather than quietly degrading the whole twin.

### Camera visibility: deliberately coarse
Per-section preset lists, not line-of-sight (Option 1, as directed). The return
shape is a plain array of preset names so true occlusion results can replace it
from the same hook with no consumer change — which is the whole reason the
hook returns data rather than exposing a calculation.

---

## ADR-019 — Yield intervals must be finer than the smallest unit, not the largest

**Status:** accepted
**Phase:** CoogsNation 3.0 basketball build

### What happened
ADR-014 established chunked construction and noted "the seam must be finer than
the largest thing it is meant to divide." The arena exposed the mirror-image
failure.

The deck builder yielded every fourth row (`i & 3`). The arena's courtside tier
has **3** rows and its club tier has **4** — so the interval never triggered
and those decks built as single unbroken units. A rule tuned on a 45-row
football tier silently did nothing on a 3-row arena tier.

### Decision
Yield every row. The generator overhead is negligible against a row of deck
geometry, and correctness across venue shapes matters more than saving a few
`yield` statements on the largest tier.

### Generalisation
An interval-based seam is only safe when the interval is smaller than the
**smallest** unit it will ever encounter. Intervals tuned against the biggest
case fail silently on the smallest — no error, no warning, just a stall.

### Residual, reported not hidden
Maximum block during arena construction swings between ~29ms and ~80ms across
identical runs while p50 stays at 8.3–8.6ms and the yield count is stable. The
variance is garbage collection, not the build. The acceptance test therefore
asserts on p50 and p90 and **reports** max as informational: asserting on a
GC-dominated number would make the suite flaky and train us to ignore it.
Characterising it properly needs a real browser profile.

---

## Open questions

**~~Asymmetric footprints.~~** *Resolved by ADR-017.* Baseball ships on
`FanFootprint` with zero downstream changes.

**~~Twin delta scope.~~** *Resolved by ADR-012.* Virtual collections now
participate in delta collection identically to concrete objects, with cost
proportional to change rather than to cardinality.

**Avatar storage migration.** Tracked in ADR-012. Avatars are concrete but
scale like a virtual class; the trigger is a concurrent roster above ~10,000.

**Metadata queries are still O(n).** `query({ section: '112' })` walks all
58,298 seats — 57ms — because section is metadata and no fast path covers it.
Allocation is now proportional to results (653 objects, down from 58,298), but
the walk remains. The cost is `describe()` building a persistent-id string per
candidate. A per-section index would fix it; not built yet because no shipped
caller needs it.

**Director arbitration.** Currently highest-priority-wins with a per-channel
cooldown. Adequate for four behaviours. With twenty, this likely wants a proper
scheduler with pre-emption and blending. Deliberately not built yet.
