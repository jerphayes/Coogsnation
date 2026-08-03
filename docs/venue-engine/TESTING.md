# Testing

```bash
npm install three@0.160.0 jsdom     # test-only deps; the engine has none
npm run test:all
```

Expected: **123 + 47 + 43 assertions pass, smoke reports `no failures`.**

---

## The suites

| Suite | Command | What it proves |
|---|---|---|
| Conformance | `npm test` | Concrete and virtual objects are indistinguishable to callers |
| Smoke | `npm run test:smoke` | Every venue constructs end to end under real three.js |
| Basketball acceptance | `npm run test:basketball` | Each success criterion in the basketball directive |
| Integration | `npm run test:integration` | All venues run on one engine with no venue special-casing |

### Conformance — `tests/conformance.mjs`

Runs an **identical battery** against a concrete object and a virtual one:
contract, registry parity, events, deltas, snapshot, ownership, matching. A
change that breaks parity fails on the virtual side and passes on the concrete
side, pointing straight at the seam.

It is mutation-tested. Reintroducing any of the three gaps the virtual-object
rule exposed causes a specific assertion to fail. A test that cannot fail is
not evidence.

Also asserts the performance guarantees: a census of 60,000 objects allocates
**zero** handles, and a filtered query materialises exactly the matches.

### Smoke — `smoke.mjs`

Executes the real engine modules against real three.js r160, stubbing only the
GPU surface (`WebGLRenderer`, and the 2D canvas context, which jsdom lacks).

**This harness is how most defects in this project were found** — including a
32% capacity error, a double frame tick, a dead module reference and two
chunking bugs. None were visible to static analysis or to a green conformance
run.

### Integration — `tests/integration.mjs`

Constructs every venue through an identical code path, then asserts the
architectural claim mechanically rather than by inspection:

- no engine file references a venue by name (13 directories scanned)
- no venue file imports an engine subsystem
- every registered venue is exercised

Reports capacity, sections, twin object count, presets and build time per
venue.

---

## Reading the numbers

Construction timings come from Node with a stubbed GPU on server hardware.
**Treat ratios as trustworthy and absolutes as indicative.**

The basketball suite asserts on p50 and p90 block times and merely *reports*
the maximum. That is deliberate: max swings between ~29 ms and ~80 ms across
identical runs while p50 holds at 8.3–8.6 ms and the yield count stays stable.
The variance is garbage collection, not the build. Asserting on a GC-dominated
number would make the suite flaky and train everyone to ignore it.
Characterising it properly needs a real browser profile.

---

## Verifying a release

Tests passing in a working copy is a weaker claim than the artifact working.
The standing final gate is:

```bash
unzip stadium-engine.zip && cd stadium-engine
npm install three@0.160.0 jsdom
npm run test:all
```

This has caught leaked development scripts and a package built from a dirty
tree. Run it before shipping.

---

## What is NOT verified

**The engine has never run in a browser.** `VenueEngine`, `CameraController`
and `UIManager` need real WebGL or heavy DOM and are exercised by no suite.
That is the largest remaining risk in the project, and it is not an
architecture problem.

Also unverified:

- Visual correctness of any geometry. Every capacity, position and count is
  checked numerically; nothing confirms a venue *looks* right.
- Real-device performance. All timings are server-side with a stubbed GPU.
- Network behaviour beyond the mock transport.
- The recycle-then-subscribe hole: a subscription on a virtual handle is
  silently dropped on recycle. Known, documented in `docs/OBJECT-MODEL.md`,
  and deliberately not yet fixed — the conformance battery cannot catch it
  because it subscribes and asserts within one un-recycled lifetime.

To close the browser gap: `npx serve .`, open each venue, and report the
console.
