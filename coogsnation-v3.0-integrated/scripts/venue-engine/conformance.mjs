/**
 * tests/conformance.mjs
 * ---------------------------------------------------------------------------
 * The guarantee, made testable.
 *
 * "Callers cannot distinguish whether an object is concrete or virtual" is a
 * claim, and a claim in a README decays. This suite runs an IDENTICAL battery
 * of assertions against a concrete object and a virtual one. If a future
 * change makes the two behave differently, the same test fails on the virtual
 * side and passes on the concrete side, which points straight at the seam.
 *
 * Run:  node tests/conformance.mjs
 * No three.js, no DOM, no network — pure contract.
 */

import { VenueObject, OBJECT_TYPE, persistentId } from '../../client/src/venue-engine/core/VenueObject.js';
import { VirtualCollection } from '../../client/src/venue-engine/core/VirtualCollection.js';
import ObjectRegistry from '../../client/src/venue-engine/core/ObjectRegistry.js';
import { validateDirective } from '../../client/src/venue-engine/ai/directives.js';

/* ── tiny harness ────────────────────────────────────────────────────── */
let pass = 0, fail = 0, suite = '';
const group = name => { suite = name; console.log(`\n${name}`); };
const ok = (label, cond) => {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ ${label}`); }
};
const eq = (label, a, b) => ok(`${label} (${JSON.stringify(a)} vs ${JSON.stringify(b)})`,
                               JSON.stringify(a) === JSON.stringify(b));

/* ═══════════════════════════════════════════════════════════════════════
 * FIXTURES: the same logical object, built both ways.
 * ═══════════════════════════════════════════════════════════════════════ */

/** Concrete: an ordinary stored instance. */
const makeConcrete = () => new VenueObject({
  type: 'widget',
  persistentId: persistentId('widget', 'test', 'concrete', 1),
  transform: { position: [1, 2, 3] },
  metadata: { lane: 'A', capacity: 10 },
  state: { status: 'free', level: 0 }
});

/** Virtual: the same shape, backed by typed arrays. */
class WidgetCollection extends VirtualCollection {
  constructor(n) {
    super({ type: 'widget', venueId: 'test' });
    this.n = n;
    this.status = new Uint8Array(n);     // 0 free, 1 busy
    this.level = new Uint8Array(n);
    this.owners = new Array(n).fill(null);
    this.built = new Uint8Array(n);      // snapshot divergence marker
  }
  get count() { return this.n; }
  describe(i) {
    return {
      persistentId: persistentId('widget', 'test', 'virtual', i + 1),
      metadata: { lane: i % 2 ? 'B' : 'A', capacity: 10 }
    };
  }
  readState(i) {
    return { status: this.status[i] ? 'busy' : 'free', level: this.level[i] };
  }
  writeState(i, patch) {
    const changed = [];
    if ('status' in patch) {
      const v = patch.status === 'busy' ? 1 : 0;
      if (v !== this.status[i]) { this.status[i] = v; changed.push('status'); }
    }
    if ('level' in patch && patch.level !== this.level[i]) {
      this.level[i] = patch.level; changed.push('level');
    }
    if (changed.length) this.built[i] = 1;
    return changed;
  }
  readTransform(i) { return { position: [1, 2, 3], rotation: [0, 0, 0], scale: [1, 1, 1] }; }
  readOwner(i) { return this.owners[i]; }
  claimAt(i, spec) {
    if (this.owners[i] != null && this.owners[i] !== spec.userId) return false;
    this.owners[i] = spec.userId; this.built[i] = 1; return true;
  }
  releaseAt(i) {
    if (this.owners[i] == null) return false;
    this.owners[i] = null; this.built[i] = 1; return true;
  }
  isDivergent(i) { return this.built[i] === 1; }
  fastQuery(c) {
    if (Object.keys(c).some(k => k !== 'status')) return null;
    const want = c.status === 'busy' ? 1 : 0;
    const out = [];
    for (let i = 0; i < this.n; i++) if (this.status[i] === want) out.push(i);
    return out;
  }
  fastSummary(f) {
    if (f !== 'status') return null;
    let busy = 0;
    for (let i = 0; i < this.n; i++) busy += this.status[i];
    return { free: this.n - busy, busy };
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 * THE SHARED BATTERY
 * Every assertion below runs against both representations, unchanged.
 * ═══════════════════════════════════════════════════════════════════════ */

function contractBattery(label, makeObject) {
  group(`contract: ${label}`);
  const o = makeObject();

  ok('has a runtime id', typeof o.id === 'string' && o.id.length > 0);
  ok('has a persistent id', typeof o.persistentId === 'string');
  ok('reports its type', o.type === 'widget');

  eq('transform shape', Object.keys(o.transform).sort(), ['position', 'rotation', 'scale']);
  ok('transform position readable', o.transform.position[0] === 1);

  eq('metadata readable', o.metadata.lane !== undefined, true);
  ok('metadata is frozen', Object.isFrozen(o.metadata));

  // state read/write
  ok('initial state readable', o.state.status === 'free');
  const changed = o.setState({ status: 'busy' });
  eq('setState reports changed keys', changed, ['status']);
  ok('state reflects the write', o.state.status === 'busy');
  eq('idempotent write is silent', o.setState({ status: 'busy' }), []);

  // events
  let seen = [];
  const offState = o.on('state', e => seen.push(e.key));
  const offChanged = o.on('changed', e => seen.push('changed:' + e.keys.join(',')));
  o.setState({ level: 5 });
  ok('emits state event', seen.includes('level'));
  ok('emits changed event', seen.some(s => s.startsWith('changed:')));
  offState(); offChanged();
  seen = [];
  o.setState({ level: 6 });
  ok('unsubscribe works', seen.length === 0);

  // dirty + delta
  ok('is dirty after a write', o.isDirty);
  const d = o.collectDelta();
  ok('delta identifies the object', d && d.pid === o.persistentId);
  ok('delta carries changed state', d.state.level === 6);
  ok('collect clears dirty', !o.isDirty);
  ok('second collect returns null', o.collectDelta() === null);

  // ownership
  ok('claim succeeds', o.claim('user-1') === true);
  ok('owner reflects claim', o.owner === 'user-1');
  ok('second claimant rejected', o.claim('user-2') === false);
  let released = false;
  o.on('released', () => released = true);
  ok('release succeeds', o.release() === true);
  ok('release emits', released);
  ok('owner cleared', o.owner === null);

  // matching
  ok('matches exact value', o.matches({ status: 'busy' }));
  ok('matches any-of', o.matches({ status: ['free', 'busy'] }));
  ok('matches predicate', o.matches({ level: v => v >= 6 }));
  ok('matches on metadata', o.matches({ capacity: 10 }));
  ok('rejects non-match', !o.matches({ status: 'free' }));

  // serialization
  const snap = o.serialize();
  ok('serialize is versioned', snap.v === 1);
  ok('serialize carries pid', snap.pid === o.persistentId);
  ok('serialize carries state', snap.state.level === 6);

  ok('toString is readable', String(o).includes('widget'));
}

/* ═══════════════════════════════════════════════════════════════════════
 * REGISTRY PARITY
 * The same registry operations, over both kinds of membership.
 * ═══════════════════════════════════════════════════════════════════════ */

function registryBattery(label, registry, type, expectedCount) {
  group(`registry: ${label}`);

  ok('countOfType is right', registry.countOfType(type) === expectedCount);
  ok('type is listed', registry.types().includes(type));

  const some = registry.query({ type }, { limit: 3 });
  ok('query returns objects', some.length === 3);
  ok('query respects limit', registry.query({ type }, { limit: 1 }).length === 1);
  ok('queried objects satisfy the contract',
     some.every(o => typeof o.persistentId === 'string' && o.state && o.transform));

  const first = some[0];
  const again = registry.get(first.persistentId);
  ok('get by persistentId resolves', again && again.persistentId === first.persistentId);

  first.setState({ status: 'busy' });
  const busy = registry.query({ type, status: 'busy' });
  ok('query reflects a state change', busy.length >= 1);

  const census = registry.summary(type, 'status');
  ok('summary returns counts', census && typeof census.busy === 'number');
  ok('summary sums to total',
     Object.values(census).reduce((a, b) => a + b, 0) === expectedCount);

  const nearby = registry.near(1, 2, 3, 5, { type });
  ok('spatial query works', nearby.length > 0);

  let watched = 0;
  const unwatch = registry.watch(() => watched++);
  registry.query({ type }, { limit: 1 })[0].setState({ level: 9 });
  ok('change stream sees the event', watched > 0);
  unwatch();

  const deltas = registry.collectDeltas();
  ok('deltas are collected', deltas.length > 0);
  ok('deltas carry a pid', deltas.every(d => typeof d.pid === 'string'));
  ok('deltas drain', registry.collectDeltas().length === 0);

  const snap = registry.snapshot();
  ok('snapshot is versioned', snap.v === 1);
  ok('snapshot includes this type',
     snap.objects.some(o => o.type === type) || !!snap.collections[type]);
}

/* ═══════════════════════════════════════════════════════════════════════
 * RUN
 * ═══════════════════════════════════════════════════════════════════════ */

// 1. The contract, both ways.
contractBattery('concrete instance', makeConcrete);

const widgets = new WidgetCollection(50000);
contractBattery('virtual handle', () => widgets.resolveByIndex(0));

// 2. Registry parity, both ways.
const concreteReg = new ObjectRegistry();
for (let i = 0; i < 25; i++) {
  concreteReg.add(new VenueObject({
    type: 'widget',
    persistentId: persistentId('widget', 'test', 'concrete', i),
    transform: { position: [1, 2, 3] },
    metadata: { lane: i % 2 ? 'B' : 'A', capacity: 10 },
    state: { status: 'free', level: 0 }
  }));
}
registryBattery('concrete membership', concreteReg, 'widget', 25);

const virtualReg = new ObjectRegistry();
virtualReg.registerCollection(new WidgetCollection(25));
registryBattery('virtual membership', virtualReg, 'widget', 25);

/* ── performance guarantees ──────────────────────────────────────────── */
group('performance: virtual must not allocate to answer');

const N = 60000;
const big = new WidgetCollection(N);
for (let i = 0; i < N; i += 3) big.status[i] = 1;

let allocations = 0;
const origResolve = big.resolveByIndex.bind(big);
big.resolveByIndex = i => { allocations++; return origResolve(i); };

const perfReg = new ObjectRegistry();
perfReg.registerCollection(big);

allocations = 0;
const census = perfReg.summary('widget', 'status');
ok('census of 60,000 allocates nothing', allocations === 0);
ok('census is correct', census.busy === Math.ceil(N / 3));

allocations = 0;
const busyOnes = perfReg.query({ type: 'widget', status: 'busy' });
ok('fastQuery materialises exactly the matches', allocations === busyOnes.length);
ok('fastQuery result is correct', busyOnes.length === Math.ceil(N / 3));
ok('fastQuery result is a real subset', busyOnes.length < N);

allocations = 0;
ok('countOfType allocates nothing',
   perfReg.countOfType('widget') === N && allocations === 0);

allocations = 0;
perfReg.query({ type: 'widget' }, { limit: 10 });
ok('limited query stops early', allocations === 10);

// delta cost is proportional to change, not to cardinality
big._dirty.clear();
const h = perfReg.query({ type: 'widget' }, { limit: 1 })[0];
h.setState({ level: 3 });
const dl = perfReg.collectDeltas();
ok('one change yields one delta', dl.length === 1);
ok('untouched venue yields no deltas', perfReg.collectDeltas().length === 0);

// snapshot proportional to divergence
const snapshot = big.snapshot();
ok('snapshot covers only divergent entries',
   snapshot.entries.length > 0 && snapshot.entries.length < N * 0.5);

/* ── handle pooling ──────────────────────────────────────────────────── */
group('pooling: handles are reused, indices are stable');

const pooled = new WidgetCollection(10);
const a = pooled.resolveByIndex(0);
const pidA = a.persistentId;
pooled.recycle(a);
const b = pooled.resolveByIndex(5);
ok('recycled handle is reused', a === b);
ok('rebound handle reports the new identity', b.persistentId !== pidA);
ok('rebound handle reports the new index', b.index === 5);
ok('index is the stable reference', pooled.resolveByIndex(5).index === 5);

let leaked = 0;
pooled.forEach(() => leaked++);
ok('forEach visits every index', leaked === 10);
ok('forEach returns handles to the pool', pooled.stats().pooled > 0);

/* ── directive validation ────────────────────────────────────────────── */
group('directives');
ok('valid accepted', validateDirective({ channel: 'crowd', action: 'react', params: { type: 'wave' } }).ok);
ok('unknown channel rejected', !validateDirective({ channel: 'nope', action: 'x' }).ok);
ok('unknown action rejected', !validateDirective({ channel: 'crowd', action: 'explode' }).ok);
ok('missing param rejected', !validateDirective({ channel: 'crowd', action: 'setDensity', params: {} }).ok);
ok('bad enum rejected', !validateDirective({ channel: 'crowd', action: 'react', params: { type: 'sulk' } }).ok);
ok('wrong type rejected', !validateDirective({ channel: 'crowd', action: 'setDensity', params: { rate: 'lots' } }).ok);
ok('optional param omittable', validateDirective({ channel: 'announce', action: 'say', params: { text: 'hi' } }).ok);

/* ── result ──────────────────────────────────────────────────────────── */
console.log(`\n${'─'.repeat(52)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail === 0) {
  console.log('Concrete and virtual objects are indistinguishable to callers.');
}
process.exit(fail ? 1 : 0);
