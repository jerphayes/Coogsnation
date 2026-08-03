# CoogsNation 3.0 — Virtual Venue Engine Integration Report

**Phases 1–6 complete. Stopped at the directed stop point.**

Gate run at the end of every phase:
`npm run check` · `npm run security:check` (14 scripts) · `npm run build` ·
`npm run venue:check` (5 engine suites, 224 assertions).

| Phase | Scope | check | security | build | venue | Status |
|---|---|:--:|:--:|:--:|:--:|---|
| — | Baseline, before any change | ✅ | 14/14 | ✅ | n/a | recorded |
| 1 | Relocate engine | ✅ | 14/14 | ✅ | 213/213 | complete |
| 2 | Typed boundary | ✅ | 14/14 | ✅ | 213/213 | complete |
| 3 | Authentication | ✅ | 14/14 | ✅ | 213/213 | complete |
| 4 | Persistence | ✅ | 14/14 | ✅ | 213/213 | complete |
| 5 | Event Bridge | ✅ | 14/14 | ✅ | 224/224 | complete |
| 6 | React mount, routing, lazy load | ✅ | 14/14 | ✅ | 224/224 | complete |

No regression gate was weakened, skipped or modified. No test was disabled.

---

## Success criteria

| Criterion | Result |
|---|---|
| One repository | ✅ engine lives at `client/src/venue-engine/` |
| One application | ✅ engine `index.html` deleted |
| One build | ✅ existing `vite build` + esbuild, unmodified in structure |
| One deployment | ✅ Dockerfile and both compose files **byte-identical** to baseline |
| One dependency tree | ✅ engine `package.json` deleted; `three` is a root dependency |
| One authentication system | ✅ `LocalAuthService` deleted; Passport is the only identity |
| One user identity | ✅ engine consumes the seven-field permission context only |
| No duplicated infrastructure | ✅ local auth and localStorage persistence removed |
| Existing functionality preserved | ✅ all 14 gates green; no existing route, API or page altered |
| Ready for browser validation | ✅ see `docs/BROWSER-VALIDATION.md` |

---

## Bundle impact — the mobile-first requirement

| | Baseline | After integration | Δ |
|---|---:|---:|---:|
| Initial client chunk | 972,870 B | 975,057 B | **+2,187 B** |
| Lazy `session` chunk | — | 973,398 B | engine + Three.js |
| Venue chunks | — | 5–13 KB each | per venue, on demand |
| Server bundle | 347.3 KB | 357.8 KB | +10.5 KB |

`WebGLRenderer` appears **0 times** in the initial chunk and 5 times in the
lazy chunk. Three.js is downloaded only when a member opens a venue; every
other CoogsNation page keeps its existing load profile.

Venue definitions split further — `FootballStadium`, `BasketballArena`,
`BaseballField` are separate chunks, so entering the arena never downloads the
stadium.

---

## File change summary

### Added (13)

| File | Purpose |
|---|---|
| `shared/venue.ts` | **The official application ↔ engine contract.** Permission context, venue ids, seat claims, bridge events, API paths |
| `server/venue/context.ts` | Maps a CoogsNation user → engine permission context |
| `server/venue/routes.ts` | Venue API: context, list, claims, claim, release |
| `client/src/pages/Venue.tsx` | React mount, lifecycle, auth gating, progress UI |
| `client/src/venue-engine/index.d.ts` | Typed contract surface |
| `client/src/venue-engine/session.d.ts` | Typed entry module |
| `client/src/venue-engine/session.js` | Engine lifecycle: create / pause / resume / dispose |
| `client/src/venue-engine/adapters/CoogsAuthService.js` | Auth adapter |
| `client/src/venue-engine/adapters/CoogsPersistenceService.js` | API-backed persistence |
| `client/src/venue-engine/bridge/eventBridge.js` | Application-level event forwarding |
| `migrations/0004_venue_seat_claims.sql` | Seat ownership table |
| `scripts/venue-engine/bridge-check.mjs` | Bridge regression check (11 assertions) |
| `docs/BROWSER-VALIDATION.md` | Phase 7 checklist |

Plus relocated: 41 engine modules → `client/src/venue-engine/`, 5 docs →
`docs/venue-engine/`, 5 suites → `scripts/venue-engine/`, `concert.venue.json`
→ `client/public/venues/`.

### Modified (5)

| File | Change |
|---|---|
| `package.json` | `+three@^0.160.0` (dep), `+jsdom` (dev), 6 `venue:*` scripts |
| `shared/schema.ts` | `+venueSeatClaims` table and its two types |
| `server/storage.ts` | `+4` methods on `IStorage` and `DatabaseStorage` |
| `server/routes.ts` | `+2` lines registering venue routes, mirroring commerce |
| `client/src/App.tsx` | `+2` lazy routes |

### Deleted (4)

- Engine `index.html` — one HTML entry.
- Engine `package.json` — one dependency tree.
- The unpkg CDN import map — Three.js is a normal dependency.
- `LocalAuthService` and `LocalStoragePersistenceService` — duplicated
  infrastructure the integration exists to remove.

### Untouched

All 14 regression scripts · `Dockerfile` · `docker-compose.yml` ·
`docker-compose.prod.yml` · `vite.config.ts` · `tsconfig.json` ·
`server/auth.ts` · `server/db.ts` · all AI code · all commerce code ·
every existing page, route and API.

---

## Database migration summary

`migrations/0004_venue_seat_claims.sql` — additive and idempotent. Creates one
table and three indexes. Modifies nothing that exists, so it is safe against a
populated database and safe to re-run. A commented rollback block is included.

```
venue_seat_claims
  id, venue_id, seat_persistent_id, seat_index,
  section, "row", seat_number,
  user_id → users(id) ON DELETE CASCADE,
  display_name, claimed_at

  UNIQUE (venue_id, seat_persistent_id)   one claim per seat, enforced by the DB
  INDEX  (venue_id)                       venue load reads all claims
  INDEX  (user_id)                        "where am I sitting" + cascade delete
```

The unique index is the real concurrency guard: two simultaneous claims cannot
both succeed, and the loser receives HTTP 409 rather than an exception.

**Not yet run against a live database.** No PostgreSQL instance was available;
`npm run db:migrate:dev` must be executed in Codespaces or Docker.

---

## Architecture notes

**Authorization is entirely application-side.** `server/venue/context.ts` is the
only place a CoogsNation user becomes engine-visible data, and it emits exactly
seven fields. The output is validated against the shared Zod schema before it
leaves the function, so a future edit that tried to widen the boundary fails
there rather than silently leaking a profile.

Venue access requires **authentication only**. University membership is not
hardcoded anywhere in the engine — email domain influences whether someone is
labelled `student` or `alumni`, never whether they may enter.

**The engine never reaches the database.** Every persistent operation is an
HTTP call to the venue API, which authorizes and then uses `IStorage`.

**The event bridge is an allow-list, not a filter.** `bridge-check.mjs` asserts
that `engine:tick`, camera, hover, crowd and load-progress events do **not**
cross, while seat, avatar and significant director events do. Forwarding frame
traffic into React would re-render the app 60 times a second and destroy the
mobile budget; the check exists so that cannot regress silently.

**Persistence failures degrade rather than crash.** A failed save is reported
through the bridge as a non-fatal notice; the seat stays claimed in the running
venue. This follows the fault-tolerance directive.

---

## Startup fix — `server/index.ts` (post-integration)

Browser validation reported `Error: DATABASE_URL must be set` from
`npm run dev` despite a valid `.env`.

**Root cause: a pre-existing latent defect, not caused by this integration.**
`server/index.ts` was byte-identical to the pre-integration baseline (verified
by diff). It read:

```ts
import dotenv from "dotenv";
dotenv.config();
import { registerRoutes } from "./routes";
```

ES modules evaluate every imported module *before* any statement in the
importing module's body. So `./routes` — and through it `./storage` and
`./db` — was fully evaluated before `dotenv.config()` ever ran, and `db.ts`
throws at module scope when `DATABASE_URL` is unset.

The defect was invisible under Docker because compose supplies `DATABASE_URL`
as a real environment variable, so dotenv was never needed. It only surfaced
running `npm run dev` locally against a `.env` file.

**Fix — two lines replaced by one side-effect import:**

```ts
import "dotenv/config";
```

`dotenv/config` performs the load during its own module evaluation, which the
ES module spec orders before the imports beneath it.

Verified: `npm run dev` reaches `serving on port 5000` with `DATABASE_URL`
present only in `.env`; the esbuild production bundle preserves the ordering
and `node dist/index.js` also resolves it. No behaviour changed beyond
environment initialization.

`server/migrate.ts` uses the same two-line pattern but is **not** affected — it
imports nothing that reads `process.env` at module scope, and was confirmed to
reach a live connection attempt.

## Known issues

1. **Nothing has run in a browser.** The gates are static analysis, headless
   Node and a bundler. Rendering, camera, touch input, real performance and
   memory are unverified. This is the intended stop point, not an oversight.

2. **The migration has not run against PostgreSQL.** Syntax is hand-written in
   the project's existing style and the Drizzle schema typechecks, but no live
   database confirmed it.

3. **Pre-existing engine defect, unfixed:** `npm run venue:smoke` prints
   `[EventBus] handler for "seat:claimed" threw: Cannot read properties of
   undefined (reading 'points')` 23–29 times per run. I verified this against
   the standalone engine — **identical rate before the move**, so it is not an
   integration regression. `CrowdManager`'s seat-claim handler assumes every
   claimed seat has a crowd chunk. Harmless (the bus isolates handler throws)
   but noisy. Not fixed here because it is engine behaviour, not integration.

4. **`docker compose config` not re-verified** — no Docker CLI in this
   environment. All three Docker files are byte-identical to baseline, so the
   risk is nil, but the command should be run before deploying.

5. **Seat claim conflict UX is minimal.** The API returns 409 correctly; the
   engine currently treats a rejected claim as a silent no-op rather than
   surfacing "someone just took that seat."

6. **Avatar locality defect carries over** (engine ADR-012, Phase III Q2). At
   large rosters most nearby users are invisible. Unchanged by integration;
   relevant when multi-user lands in Phase 8.

---

## Test results

```
npm run check            tsc --noEmit                          clean
npm run security:check   14/14 regression scripts              passed
npm run build            client + server + migrate             built
npm run venue:conformance  object-model conformance      123 passed, 0 failed
npm run venue:smoke        4 venues under real three.js  no failures
npm run venue:basketball   basketball acceptance          47 passed, 0 failed
npm run venue:integration  cross-venue, one engine        43 passed, 0 failed
npm run venue:bridge       event bridge boundary          11 passed, 0 failed
                                                    ─────────────────────────
                                                    224 assertions, 0 failures
```

Venue capacities are unchanged by integration:

| venue | plan | seats | sections | twin objects |
|---|---|---:|---:|---:|
| football | bowl | 58,298 | 110 | 124,838 |
| basketball | bowl | 10,630 | 78 | 23,244 |
| baseball | fan | 4,916 | 40 | 10,083 |
| concert | bowl | 16,260 | 84 | 31,690 |

---

## Recommendations before Cougar Den

1. **Run browser validation first** (`docs/BROWSER-VALIDATION.md`). Every
   estimate below is conditional on it.
2. **Run the migration** in Codespaces or Docker and exercise a real claim.
3. **Fix the frame-loop fault isolation** (engine Phase III Q5) before
   multi-user. One throw in any module currently stops rendering permanently
   with no recovery — that becomes much more likely with real network traffic.
4. **Then Phase 8 (Socket.IO).** The `/venue` namespace can reuse
   `requireSocketUser` exactly as the AI namespace does.
5. **Avatar storage migration** before any large gathering — the locality
   defect is the first thing users will notice in a populated venue.

---

## Deliverables

| Deliverable | Location |
|---|---|
| Integrated repository | this tree — `coogsnation-3.0-integrated.zip` |
| Updated dependency tree | `package.json` + `package-lock.json` |
| Updated build system | unchanged in structure; `venue:*` scripts added |
| Updated Docker configuration | **unchanged** — integration required none |
| Integration report | `docs/INTEGRATION-REPORT.md` |
| File change summary | above, in this document |
| Database migration summary | above; SQL in `migrations/0004_venue_seat_claims.sql` |
| Test results | above — 224 assertions, 0 failures |
| Known issues | above — 6 recorded |
| Browser validation checklist | `docs/BROWSER-VALIDATION.md` |
| Recommendations before Cougar Den | above |

### Release verification

The artifact is verified by unpacking the zip into a clean directory, running
`npm ci`, and running the full gate there — not by trusting the working tree.
That check has previously caught leaked development files and a package built
from a dirty tree.
