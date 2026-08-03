# Browser Validation Checklist — Phase 7

Everything below is **unverified**. Phases 1–6 were validated by TypeScript,
14 regression scripts, a bundler and headless Node. None of that executes a
renderer, a camera, a touch event or a GPU.

Work top to bottom. Stop at the first failure in a section and report it —
later checks in the same section usually depend on earlier ones.

Report back with: the section, the check number, what happened, and the exact
console output. Console text matters more than a description; the engine logs
with a `[venue]` prefix.

---

## 0. Start the application

```bash
cp .env.example .env          # set SESSION_SECRET and DATABASE_URL
docker compose up             # or: npm run dev with PostgreSQL running
```

- [ ] **0.1** App reachable at `http://localhost:5000`
- [ ] **0.2** `GET /healthz` returns `{"status":"ok"}`
- [ ] **0.3** `docker compose config` exits 0 *(not re-verified during integration — no Docker CLI in the build environment)*

### Run the migration

```bash
npm run db:migrate:dev
```

- [ ] **0.4** Migration `0004_venue_seat_claims.sql` applies without error
- [ ] **0.5** `\d venue_seat_claims` shows the table, and 3 indexes exist
- [ ] **0.6** Re-running the migration is a no-op (it is written to be idempotent)

---

## 1. Existing functionality — regression check

**Do this before touching a venue.** If integration broke something existing,
that matters more than anything below.

- [ ] **1.1** Landing page loads, and in DevTools → Network the initial JS is
      **~975 KB** and there is **no** `session-*.js` chunk
- [ ] **1.2** Sign in with an existing account
- [ ] **1.3** Forums load and a topic opens
- [ ] **1.4** Store loads; cart opens
- [ ] **1.5** Profile page loads
- [ ] **1.6** Admin dashboard loads for an owner account
- [ ] **1.7** AI chat still streams (Socket.IO `/ai` namespace)
- [ ] **1.8** No new console errors on any page above

> If 1.1 shows a `session` or `three` chunk downloading on a normal page, the
> lazy boundary has failed. Stop and report — that is a mobile-budget defect.

---

## 2. Venue entry

Navigate to `/venues/basketball`.

- [ ] **2.1** Progress bar appears and advances with changing text
      ("Building seating decks", "Setting seat manifest", …)
- [ ] **2.2** In Network, a `session-*.js` chunk (~973 KB) downloads **now**,
      not earlier
- [ ] **2.3** A `BasketballArena-*.js` chunk (~13 KB) downloads; the football
      and baseball chunks do **not**
- [ ] **2.4** The arena renders. Record what you see even if wrong — a
      screenshot is worth more than a description
- [ ] **2.5** Console logs `[venue] entered Generic Arena` with seats `10630`,
      sections `78`
- [ ] **2.6** No WebGL errors, no shader compile failures

### The other three venues

- [ ] **2.7** `/venues/football` — 58,298 seats, 110 sections
- [ ] **2.8** `/venues/baseball` — 4,916 seats, 40 sections. **Look closely:**
      this is the only venue on the open `fan` footprint, and its grandstand
      geometry has never been seen. Dugouts, bullpens and the outfield wall
      are hand-derived trig, verified numerically but never visually
- [ ] **2.9** `/venues/concert` — 16,260 seats, loaded from
      `/venues/concert.venue.json`

> **Most likely failure point.** Venue geometry has been checked numerically
> for four sessions and never rendered. Capacities and positions are correct;
> whether the buildings *look* right is genuinely unknown.

---

## 3. Camera

In `/venues/basketball`:

- [ ] **3.1** Orbit auto-rotates on entry
- [ ] **3.2** Drag orbits; pinch zooms
- [ ] **3.3** All nine presets fly correctly and end at a sensible view:
      `broadcast-center`, `mid-court`, `baseline-left`, `baseline-right`,
      `corner`, `upper-bowl`, `student-section`, `suite`, `free-roam`
- [ ] **3.4** `free-roam` returns control to orbit; the others lock
- [ ] **3.5** Click a seat — camera eases to it and enters seat mode
- [ ] **3.6** Seat panel shows section, row, seat, tier and price

Console (a `venue` handle is exposed in development builds only — it is
stripped from production so it cannot pin the engine in memory after teardown):

```js
venue.cameraViews()                    // the nine preset names
venue.setCameraView('upper-bowl')      // fly to one
venue.occupancy()                      // { empty, ai, user }
venue.stats                            // seats, sections, twin objects
```

---

## 4. Seat claiming and persistence

This is the only path that writes to PostgreSQL.

- [ ] **4.1** Claim a seat in the UI
- [ ] **4.2** `SELECT * FROM venue_seat_claims;` shows one row with a
      persistent id shaped like `seat:basketball:lower:112:3:14`
- [ ] **4.3** Reload the page — the seat is still claimed
- [ ] **4.4** Claim a *different* seat; the old row is gone, one row remains
      (a user holds at most one seat per venue)
- [ ] **4.5** Release the seat; the row disappears
- [ ] **4.6** In a second browser as a different user, claim the *same* seat
      simultaneously — one succeeds, the other gets **HTTP 409**, and exactly
      one row exists

> **Known gap:** on a 409 the engine currently no-ops silently. The user sees
> nothing. Expected behaviour today; logged as Known Issue 5.

---

## 5. Performance and memory — mobile is the target

Test on a **real mid-range phone**, not a desktop throttle.

- [ ] **5.1** Time from tapping the venue link to first render
- [ ] **5.2** Sustained FPS while orbiting (DevTools Performance)
- [ ] **5.3** Any single frame over 50 ms during load *(construction is chunked
      to a median ~8 ms block, but that was measured in Node with a stubbed
      GPU — the real number is unknown)*
- [ ] **5.4** Peak JS heap after entering the football venue (the largest, at
      124,838 twin objects)
- [ ] **5.5** Device gets uncomfortably warm?
- [ ] **5.6** Battery drain over 5 minutes

### Teardown — the leak check

- [ ] **5.7** Enter a venue, navigate away, repeat **five times**
- [ ] **5.8** Heap returns to roughly its starting level each time
- [ ] **5.9** `performance.memory.usedJSHeapSize` is not climbing monotonically

> If the heap climbs, `session.dispose()` is not releasing GPU resources. That
> teardown path has never executed — it is the second most likely defect after
> geometry.

---

## 6. Touch — mobile-first policy

Every one of these must work **without** hover, right-click or a keyboard.

- [ ] **6.1** Tap selects a seat
- [ ] **6.2** Drag orbits
- [ ] **6.3** Pinch zooms
- [ ] **6.4** Two-finger rotate
- [ ] **6.5** Swipe does not conflict with orbit
- [ ] **6.6** UI controls are reachable with a thumb and large enough to hit

> **Expected to be incomplete.** The engine's UI was built desktop-first and
> uses hover states. This section is an inventory of what needs work, not a
> pass/fail gate.

---

## 7. Lifecycle

- [ ] **7.1** Switch tabs — rendering pauses (`session.pause()` on
      `visibilitychange`)
- [ ] **7.2** Return — rendering resumes
- [ ] **7.3** Navigate away mid-load — no console errors, no orphaned canvas
- [ ] **7.4** Browser back/forward across venues works
- [ ] **7.5** Sign out while in a venue — no crash

---

## 8. Authorization

- [ ] **8.1** Signed out, `/venues/basketball` shows "Sign in required"
- [ ] **8.2** `GET /api/venues/context` returns 401 when signed out
- [ ] **8.3** Signed in, it returns exactly seven fields: `userId`,
      `displayName`, `avatarId`, `authenticated`, `permissionLevel`, `roles`,
      `permissions`
- [ ] **8.4** **No email, no password hash, no profile data in that response**
- [ ] **8.5** An owner account shows `permissionLevel: "administrator"`
- [ ] **8.6** A non-university email still gets `venue:enter` — access must not
      be gated on university membership

---

## What to send back

1. Which checks failed, with console output
2. Screenshots of each venue — especially baseball
3. The numbers from section 5 (load time, FPS, heap, thermal)
4. Anything that looked wrong even if it passed

Failures in **2 (geometry)** and **5.7–5.9 (teardown)** are the two I most
expect. Both are engine-internal and neither would indicate an integration
defect.
