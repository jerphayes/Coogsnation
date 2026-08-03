# Review Packet — Phase II.1 Fixes

> **HISTORICAL SNAPSHOT.** This packet documents the Phase II.1 defect round.
> Figures inside are the values *at that time* and are deliberately preserved —
> the wrong-capacity table is the evidence for ADR-016, not a current claim.
>
> For current state see [../README.md](../README.md) and
> [DECISIONS.md](DECISIONS.md). Two items here have since closed: baseball's
> asymmetric footprint shipped (ADR-017), and the arena was retargeted from
> ~20,300 to 10,630 seats for the collegiate spec. The open questions at the
> end remain open.

**For adversarial review. Please try to break these claims.**

Context: this engine's own author (Claude) reviewed the shipped Phase II build,
found seven defects, and fixed them. This packet states each fix, the evidence
offered, and — most importantly — **where I think the fix is weakest**. Attack
those first. Confirming bugs also exist elsewhere is more useful than confirming
that these particular ones are gone.

Reproduce everything with:

```bash
npm install three@0.160.0 jsdom
npm test          # object-model conformance, 123 assertions
node smoke.mjs    # constructs all 3 venues under real three.js, GPU stubbed
```

---

## How the defects were found, and what that implies

Four of the seven were invisible to static analysis, import auditing and a
green 123-assertion suite. They appeared only when the code was **executed for
the first time** under real three.js in a headless harness.

That is the meta-finding, and it should shape how you weight everything below:
**the test suite was measuring the wrong things.** It exhaustively verified an
object-model contract (13% of source lines) while the other 87% — including
every renderer, the builder, the camera, and all wiring — had never run.

If you review only one thing, review whether the *remaining* untested surface
is likely to contain more of this. My own estimate: yes, in `VenueEngine`,
`CameraController` and `UIManager`, which still have not been executed because
they need real WebGL or heavy DOM.

---

## Fix 1 — Capacity estimator disagreed with reality

**Defect.** `VenueDefinition.estimateCapacity()` approximated a section's arc
length as `perimeter(d) × Δt`. Wrong: the perimeter parameter `t` is normalised
against a *reference* radius, so that product is not arc length at offset `d`.
Per-section error reached 28%, partly cancelling between straights and corners —
so totals looked plausible and shipped wrong into every document.

| venue | documented | actual | error |
|---|---:|---:|---:|
| football | 59,802 | 58,298 | −2.5% |
| basketball | 20,376 | 20,304 | −0.4% |
| concert | ~24,000 | 16,260 | **−32%** |

**Fix.** The estimator now calls `footprint.arcTable()` — the same measurement
`SeatManager` uses. Verified to agree exactly for all three venues.

**Weakest point.** The estimator now costs roughly what construction costs,
since it does the same arc-length work. It is no longer a cheap preview. Is a
correct-but-expensive estimator better than a fast-but-wrong one, or should it
be deleted outright and replaced by "build it and read `.count`"?

---

## Fix 2 — Boot froze the main thread

**Defect.** ~520ms of unbroken computation on desktop; 4–6× that on a phone.
The loading bar could not repaint during it.

**Fix.** Generator-based construction driven by `core/scheduler.js` with an 8ms
budget. Synchronous constructors retained for tests; output byte-identical.

| | before | after |
|---|---:|---:|
| longest block | 522ms | 62ms |
| median block | — | 8.2ms |
| blocks over 16.7ms | 2 of 2 | 6 of 45 |
| total wall time | 522ms | 575ms |

**Notable.** The first attempt yielded per *span* and barely helped, because a
`spans: 'full'` tier is a single 180ms span. The seam must be finer than the
largest thing it divides.

**Weakest points.**
1. Six blocks still exceed a frame, peaking at 62ms — atomic
   `computeVertexNormals()` calls on merged geometry. Is 62ms acceptable during
   a loading screen, or does it need restructuring?
2. **All timings are from Node with a stubbed GPU on server hardware.** Real
   browser numbers will differ, possibly a lot. Treat the ratios as more
   trustworthy than the absolutes.
3. 8ms budget is a guess. No evidence it is right.

---

## Fix 3 — Director and plugins ticked twice per frame

**Defect.** `VenueEngine._frame` iterated all registered modules calling
`update()`, then *also* called `director.update()` and `plugins.update()`
explicitly. Both are registered modules.

Visible effect: `PollingPlugin`'s 30-second poll expired in 15 seconds.

**Fix.** Removed the explicit calls; registration order already gives the
correct tick order.

**Weakest point.** This now depends on `main.js` registering the director and
plugin host *after* the modules they observe. That ordering constraint is
enforced only by a comment. Should it be structural?

---

## Fix 4 — Dead board-redraw call

**Defect.** `VenueEngine` called `this.modules.get('stadium')?.drawBoards(...)`,
but the module is registered as `'builder'`. Optional chaining swallowed a
rename regression silently. Had it *not* been dead, it would have been a second
writer competing with the twin for the same canvas.

**Fix.** Removed; the `ScoreboardObject` twin is the sole writer.

**Weakest point.** `?.` on a module lookup will hide the next such rename too.
Worth a registry that throws on unknown module names?

---

## Fix 5 — Fast paths returned silent wrong answers

**Defect.** A `VirtualCollection` subclass that omits the empty-criteria guard
returns `[]` instead of `null`, so `query({ type })` yields **zero results with
no error**. All three shipped collections happened to have the guard; nothing
enforced it, and conformance did not detect its absence.

**Fix.** `safeQueryIndices()` / `safeSummary()` enforce the contract centrally:
empty criteria fall back, non-arrays rejected, out-of-range indices rejected.

Verified: a deliberately unguarded subclass now returns 100 of 100 (was 0).

**Weakest point.** Validation is shallow — it checks the first and last index,
not the whole array, and does not verify the results actually match the
criteria. A subclass returning *wrong but in-range* indices still passes.

---

## Fix 6 — Query and proximity costs

**Defect.** `near()` materialised every object of a type before filtering by
distance.

**Fix.** `positionAt(i)` reads the typed array directly; `near()` filters on raw
positions and materialises only survivors. `query()` recycles non-matching
handles.

Measured on 58,298 seats (allocation = actual constructor calls):

| operation | before | after |
|---|---|---|
| `near(seat, r=8)` | 117ms / 60,000 allocs | **2.0ms / 192 allocs** (192 results) |
| `find({section})` | 15ms / 22,891 allocs | **6.1ms / 1 alloc** |
| `query({section})` | 34ms / 60,000 allocs | 57ms / **653 allocs** (653 results) |

**Weakest point, and I want this challenged specifically.** `query({section})`
got *slower in wall time* (34→57ms) while allocating 99% less. The remaining
cost is `describe()` building a persistent-id string per candidate during the
walk. I traded time for GC pressure without measuring which matters more here.
That may be the wrong trade.

---

## Fix 7 — Stray `.git` shipped inside `src/`

120 KB of hooks from a stray `git init`. Removed.

---

## What I did NOT fix, and why

1. **`VenueEngine`, `CameraController`, `UIManager` have never been executed.**
   They need real WebGL or heavy DOM. This is the largest remaining risk.
2. **Avatars are concrete but scale like a virtual class** (`Map` roster).
   Documented in ADR-012 with a trigger at ~10,000 concurrent.
3. **Metadata queries remain O(n).** A per-section index would fix it; no
   shipped caller needs it yet.
4. **Conformance still cannot catch the recycle-then-subscribe hole**: a
   subscription on a virtual handle is silently dropped when the handle
   recycles. I found this in review, documented it, and did **not** fix it.
   It is a genuine break in the "indistinguishable" guarantee.

---

## Questions I most want answered

1. Is the recycle-then-subscribe hole (item 4) serious enough to break the
   flyweight design, or is "hold the index, not the handle" a sufficient
   contract? I have argued the latter; I am not confident.
2. Did fix 6 trade the wrong way on `query({section})`?
3. Is chunked-but-still-62ms good enough, or is a Worker mandatory before this
   goes on a public site?
4. What else in the 87% untested surface would you expect to be broken?
5. Is there a defect class I am systematically blind to? Four of seven defects
   were only findable by execution — that pattern suggests my review process,
   not just my code, has a gap.
