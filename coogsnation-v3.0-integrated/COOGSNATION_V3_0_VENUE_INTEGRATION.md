# CoogsNation v3.0 — Virtual Venue Engine Integration

The Virtual Venue Engine is now an internal subsystem of CoogsNation. There is
no longer a separate engine project.

**Integration Phases 1–6 are complete.** Phase 7 (browser validation) is
performed externally and has not been done. Phase 8 (Socket.IO multi-user) is
blocked behind it, per directive.

## Verify this build

```bash
npm ci --no-audit --no-fund
npm run check          # tsc --noEmit                     → clean
npm run security:check # 14 regression scripts            → 14/14
npm run build          # client + server + migrate        → builds
npm run venue:check    # 5 engine suites                  → 224 assertions
```

All five commands pass in this snapshot.

## Then validate in a browser

```bash
docker compose up -d database
npm run db:migrate:dev     # creates venue_seat_claims — NOT yet run live
npm run dev                # http://localhost:5000/venues/basketball
```

Work through **`docs/BROWSER-VALIDATION.md`** and report results. Nothing in
the venue engine has ever rendered in a browser; every passing assertion so far
is static analysis, headless Node with a stubbed GPU, or a bundler.

## Documents

| Path | Contents |
|---|---|
| `docs/INTEGRATION-REPORT.md` | Phase ledger, file changes, migration, test results, known issues |
| `docs/BROWSER-VALIDATION.md` | The Phase 7 checklist |
| `docs/venue-engine/OBJECT-MODEL.md` | Read before touching the registry |
| `docs/venue-engine/VENUE-AUTHORING.md` | How to build a venue |
| `docs/venue-engine/DECISIONS.md` | 19 architecture decision records |

## Where things live

```
client/src/venue-engine/     the engine (JavaScript, typed at the boundary)
  index.d.ts, session.d.ts   the only surface the application may touch
  session.js                 create / pause / resume / dispose
  adapters/                  CoogsNation auth + persistence
  bridge/                    application-level event forwarding
client/src/pages/Venue.tsx   React mount, lazy-loaded
shared/venue.ts              the official application ↔ engine contract
server/venue/                context mapping + venue API
scripts/venue-engine/        5 engine test suites
docs/venue-engine/           engine documentation
```

## Boundaries that must hold

- The engine never authenticates. CoogsNation owns identity.
- The engine never touches the database. Storage goes through `IStorage`.
- The engine receives seven fields of permission context and nothing more.
- The event bridge forwards application events only — never frame traffic.
- The engine is lazy-loaded and must stay out of the initial bundle.

`scripts/venue-engine/bridge-check.mjs` enforces the fourth mechanically.
