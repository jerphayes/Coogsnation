/**
 * scripts/venue-seat-transaction.mjs
 * ---------------------------------------------------------------------------
 * Proves the ORDER of operations in `claimVenueSeat()` against a faithful
 * in-memory model of the two unique indexes.
 *
 * WHAT THIS IS AND IS NOT
 * -----------------------
 * This is not a database test. There is no PostgreSQL here. It models the
 * table and its two constraints and runs both the OLD and the NEW algorithm
 * against identical scenarios, so the regression it guards is the sequencing
 * defect itself: delete-then-insert loses the member's seat when the target is
 * occupied, insert-then-delete does not.
 *
 * Modelling both algorithms is the point. A test of only the new one would
 * pass without demonstrating that the old one fails, and the whole reason this
 * file exists is that the old ordering looked correct in review.
 *
 * Real transactional behaviour, real constraint enforcement and real
 * concurrency against PostgreSQL remain Phase 7 / Codespaces items.
 */

let passed = 0;
let failed = 0;
function ok(label, condition, detail = '') {
  if (condition) { passed++; console.log(`  PASS  ${label}`); }
  else { failed++; console.log(`  FAIL  ${label}${detail ? ` → ${detail}` : ''}`); }
}

/** A table with the two unique indexes migration 0006 guarantees. */
function makeTable() {
  const rows = [];
  return {
    rows,
    /** unique (venue_id, seat_persistent_id) */
    seatHolder(venueId, seat) {
      return rows.find((r) => r.venueId === venueId && r.seat === seat) || null;
    },
    /** unique (venue_id, user_id) */
    userSeat(venueId, userId) {
      return rows.find((r) => r.venueId === venueId && r.userId === userId) || null;
    },
    insertIfSeatFree(row) {
      if (this.seatHolder(row.venueId, row.seat)) return null;   // conflict → do nothing
      const stored = { ...row, id: `row${rows.length + 1}` };
      rows.push(stored);
      return stored;
    },
    deleteUserExcept(venueId, userId, exceptId) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        if (r.venueId === venueId && r.userId === userId && r.id !== exceptId) rows.splice(i, 1);
      }
    },
    deleteUser(venueId, userId) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        if (r.venueId === venueId && r.userId === userId) rows.splice(i, 1);
      }
    },
  };
}

/** The OLD transaction: delete the member's claim, then try to insert. */
function claimOld(table, claim) {
  table.deleteUser(claim.venueId, claim.userId);
  return table.insertIfSeatFree(claim);
}

/** The NEW transaction: insert first, release the old seat only on success. */
function claimNew(table, claim) {
  const inserted = table.insertIfSeatFree(claim);
  if (inserted) {
    table.deleteUserExcept(claim.venueId, claim.userId, inserted.id);
    return inserted;
  }
  const existing = table.seatHolder(claim.venueId, claim.seat);
  if (existing && existing.userId === claim.userId) return existing;   // idempotent
  return null;
}

const V = 'coogpaws';
const seat = (n) => `seat:coogpaws:lounge:L${n}:1:1`;

console.log('\nSEAT CLAIM TRANSACTION\n');

/* ── the defect, demonstrated ─────────────────────────────────────── */
{
  const table = makeTable();
  claimOld(table, { venueId: V, userId: 'ada', seat: seat(1) });
  claimOld(table, { venueId: V, userId: 'bob', seat: seat(2) });

  const result = claimOld(table, { venueId: V, userId: 'ada', seat: seat(2) });
  ok('OLD: a move onto an occupied seat is refused', result === null);
  ok(
    'OLD: and the member LOSES the seat they were in  ← the defect',
    table.userSeat(V, 'ada') === null,
  );
}

/* ── the correction ───────────────────────────────────────────────── */
{
  const table = makeTable();
  claimNew(table, { venueId: V, userId: 'ada', seat: seat(1) });
  claimNew(table, { venueId: V, userId: 'bob', seat: seat(2) });

  const result = claimNew(table, { venueId: V, userId: 'ada', seat: seat(2) });
  ok('NEW: a move onto an occupied seat is refused', result === null);
  ok(
    'NEW: and the member KEEPS their original seat',
    table.userSeat(V, 'ada')?.seat === seat(1),
    String(table.userSeat(V, 'ada')?.seat),
  );
  ok('NEW: the occupant is undisturbed', table.seatHolder(V, seat(2)).userId === 'bob');
}

/* ── a successful first claim ─────────────────────────────────────── */
{
  const table = makeTable();
  const result = claimNew(table, { venueId: V, userId: 'ada', seat: seat(3) });
  ok('a first claim succeeds', result !== null);
  ok('exactly one row exists', table.rows.length === 1);
}

/* ── a successful move ────────────────────────────────────────────── */
{
  const table = makeTable();
  claimNew(table, { venueId: V, userId: 'ada', seat: seat(1) });
  const moved = claimNew(table, { venueId: V, userId: 'ada', seat: seat(5) });
  ok('a move to a free seat succeeds', moved !== null);
  ok('the member now holds only the new seat', table.userSeat(V, 'ada').seat === seat(5));
  ok('the old seat is free', table.seatHolder(V, seat(1)) === null);
  ok('one seat per member is preserved', table.rows.filter((r) => r.userId === 'ada').length === 1);
}

/* ── two users racing for one seat ────────────────────────────────── */
{
  const table = makeTable();
  const first = claimNew(table, { venueId: V, userId: 'ada', seat: seat(7) });
  const second = claimNew(table, { venueId: V, userId: 'bob', seat: seat(7) });
  ok('a contested seat has exactly one winner', !!first && second === null);
  ok('the loser holds nothing', table.userSeat(V, 'bob') === null);
  ok('the seat has one owner', table.rows.filter((r) => r.seat === seat(7)).length === 1);
}

/* ── re-claiming your own seat is idempotent ──────────────────────── */
{
  const table = makeTable();
  claimNew(table, { venueId: V, userId: 'ada', seat: seat(4) });
  const again = claimNew(table, { venueId: V, userId: 'ada', seat: seat(4) });
  ok('re-claiming your own seat succeeds', again !== null);
  ok('and does not duplicate the row', table.rows.length === 1);
}

/* ── the migration's dedupe rule ──────────────────────────────────── */
{
  /* Rows the OLD code could have left behind: one member, two seats. The
   * migration keeps the most recent and deletes the rest, because that is the
   * seat the member last chose and expects to still be in. */
  const rows = [
    { venueId: V, userId: 'ada', seat: seat(1), claimedAt: 100, id: 'a' },
    { venueId: V, userId: 'ada', seat: seat(2), claimedAt: 300, id: 'b' },
    { venueId: V, userId: 'bob', seat: seat(3), claimedAt: 200, id: 'c' },
  ];
  const keep = new Map();
  for (const r of rows) {
    const key = `${r.venueId}:${r.userId}`;
    const held = keep.get(key);
    if (!held || r.claimedAt > held.claimedAt || (r.claimedAt === held.claimedAt && r.id > held.id)) {
      keep.set(key, r);
    }
  }
  const survivors = [...keep.values()];
  ok('dedupe leaves one row per member per venue', survivors.length === 2);
  ok('dedupe keeps the most recent claim', keep.get(`${V}:ada`).seat === seat(2));
  ok('dedupe does not touch members holding one seat', keep.get(`${V}:bob`).seat === seat(3));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
