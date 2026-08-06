/**
 * scripts/lounge-regression.ts
 * ---------------------------------------------------------------------------
 * Real multi-user regression for the lounge room layer.
 *
 * This is NOT static analysis. It stands up an actual HTTP server, an actual
 * Socket.IO server with the real `registerLoungeNamespace`, and connects real
 * `socket.io-client` sockets over a real TCP port. Two authenticated users
 * genuinely occupy the same room and genuinely exchange messages.
 *
 * WHAT THIS VERIFIES
 *   Socket.IO room mechanics · multi-user messaging · presence · join and
 *   leave notices · recent-history replay · rate limiting · per-room
 *   authorization logic, using STUB identities.
 *
 * WHAT THIS DOES NOT VERIFY — do not read a pass here as covering any of it:
 *   Passport session cookies · PostgreSQL session storage · a real browser
 *   handshake · account suspension against a live database · sessionVersion
 *   revocation against a live database.
 *
 * Authentication is stubbed so authorisation can be tested in isolation. The
 * real handshake — cookie, session store, `evaluateSessionState()` against
 * live rows — is a Codespaces / Phase 7 item and is NOT covered by any suite
 * in this repository.
 *
 * Run: npx tsx scripts/lounge-regression.ts
 */

import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import {
  registerLoungeNamespace,
  evaluateLoungeAccess,
  __resetLoungeStateForTests,
} from "../server/lounge/rooms";
import {
  LOUNGE_EVENTS,
  LOUNGE_NAMESPACE,
  getLoungeRoom,
  type LoungeChatMessage,
  type LoungeErrorPayload,
  type LoungeJoinedPayload,
  type LoungePresencePayload,
} from "../shared/lounge";

let passed = 0;
let failed = 0;
function ok(label: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` → ${detail}` : ""}`);
  }
}

const VERIFIED = {
  id: "u1", email: "cougar@uh.edu", firstName: "Ada", lastName: "Lovelace", username: "ada",
};
const VERIFIED_TWO = {
  id: "u2", email: "second@cougarnet.uh.edu", firstName: "Grace", lastName: "Hopper", username: "grace",
};
const OUTSIDER = {
  id: "u3", email: "someone@gmail.com", firstName: "Alan", lastName: "Turing", username: "alan",
};
const NO_NAME = { id: "u4", email: "nameless@uh.edu", firstName: "", lastName: "", username: "nameless" };
const HANDLE_ONLY = { id: "u7", email: "handle@yahoo.com", firstName: "", lastName: "", username: "coogfan99" };

/* ═══ 1. access evaluation, no sockets required ═══════════════════════ */

console.log("\nACCESS EVALUATION\n");
const room = getLoungeRoom("coogpaws")!;

/* Coog Paws is OPEN: every authenticated member, whatever their email domain
 * or how complete their profile is. */
ok("Coog Paws admits a UH member", evaluateLoungeAccess(room, VERIFIED).allowed);
ok("Coog Paws admits a non-UH email", evaluateLoungeAccess(room, OUTSIDER).allowed);
ok("Coog Paws admits a blank profile", evaluateLoungeAccess(room, NO_NAME).allowed);
ok("Coog Paws admits a handle-only member", evaluateLoungeAccess(room, HANDLE_ONLY).allowed);

/* The "uh" level is still enforced — tested against the reserved room so the
 * access level cannot rot while no enabled room uses it. */
const uhRoom = { ...getLoungeRoom("uh-verified-lounge")!, enabled: true };
ok("UH room admits a verified member", evaluateLoungeAccess(uhRoom, VERIFIED).allowed);
ok(
  "UH room refuses a non-UH email",
  evaluateLoungeAccess(uhRoom, OUTSIDER).code === "UH_VERIFICATION_REQUIRED",
  String(evaluateLoungeAccess(uhRoom, OUTSIDER).code),
);
ok(
  "UH room refuses an incomplete profile",
  evaluateLoungeAccess(uhRoom, NO_NAME).code === "PROFILE_INCOMPLETE",
);
ok(
  "a disabled room refuses everyone",
  evaluateLoungeAccess(getLoungeRoom("football-lounge")!, VERIFIED).code === "ROOM_DISABLED",
);
ok(
  "moderator room refuses a plain member",
  evaluateLoungeAccess(
    { ...getLoungeRoom("moderator-lounge")!, enabled: true },
    VERIFIED,
  ).code === "MODERATOR_ONLY",
);
ok(
  "moderator room admits an administrator",
  evaluateLoungeAccess(
    { ...getLoungeRoom("moderator-lounge")!, enabled: true },
    { ...VERIFIED, isAdmin: true },
  ).allowed,
);

/* ═══ 2. live two-user session ════════════════════════════════════════ */

console.log("\nLIVE MULTI-USER SESSION\n");
__resetLoungeStateForTests();

const httpServer = createServer();
const io = new SocketIOServer(httpServer, { cors: { origin: true } });

/** Stub authentication. The client declares who it is via handshake auth. */
const stubAuth = (socket: any, next: (error?: Error) => void) => {
  const identity = socket.handshake.auth?.identity;
  if (!identity) return next(new Error("Unauthorized"));
  socket.data.userId = identity.id;
  socket.data.user = identity;
  next();
};

registerLoungeNamespace({ io, requireSocketUser: stubAuth });

const port: number = await new Promise((resolve) => {
  httpServer.listen(0, () => resolve((httpServer.address() as any).port));
});
const url = `http://localhost:${port}${LOUNGE_NAMESPACE}`;

function connect(identity: unknown): ClientSocket {
  return ioClient(url, { auth: { identity }, transports: ["websocket"], forceNew: true });
}

function waitFor<T>(socket: ClientSocket, event: string, ms = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    socket.once(event, (payload: T) => { clearTimeout(timer); resolve(payload); });
  });
}

try {
  /* ── an unauthenticated socket is refused at the handshake ────────── */
  const anon = ioClient(url, { transports: ["websocket"], forceNew: true });
  const anonError = await waitFor<Error>(anon, "connect_error");
  ok("unauthenticated handshake is refused", !!anonError);
  anon.close();

  /* ── a non-UH member is now ADMITTED to Coog Paws ─────────────────── */
  const outsider = connect(OUTSIDER);
  await waitFor(outsider, "connect");
  const outsiderJoin = waitFor<LoungeJoinedPayload>(outsider, LOUNGE_EVENTS.joined);
  outsider.emit(LOUNGE_EVENTS.join, { roomId: "coogpaws" });
  const outsiderJoined = await outsiderJoin;
  ok("a non-UH member enters Coog Paws", outsiderJoined.roomId === "coogpaws");
  outsider.close();

  /* ── a refusal still arrives as a typed error, not a silent hang ──── */
  const denied = connect(VERIFIED);
  await waitFor(denied, "connect");
  denied.emit(LOUNGE_EVENTS.join, { roomId: "moderator-lounge" });
  const refusal = await waitFor<LoungeErrorPayload>(denied, LOUNGE_EVENTS.error);
  ok("a refusal is a typed code, not a hang", refusal.code === "ROOM_DISABLED", refusal.code);
  ok("refusal carries a message the UI can render", refusal.message.length > 10);
  denied.close();

  /* ── a member with no name at all still gets a usable identity ────── */
  const nameless = connect(HANDLE_ONLY);
  await waitFor(nameless, "connect");
  const namelessJoin = waitFor<LoungeJoinedPayload>(nameless, LOUNGE_EVENTS.joined);
  nameless.emit(LOUNGE_EVENTS.join, { roomId: "coogpaws" });
  const namelessJoined = await namelessJoin;
  ok("handle is used when no name is set", namelessJoined.you.displayName === "coogfan99");
  nameless.close();

  /* ── user one joins ───────────────────────────────────────────────── */
  const alice = connect(VERIFIED);
  await waitFor(alice, "connect");
  alice.emit(LOUNGE_EVENTS.join, { roomId: "coogpaws" });
  const aliceJoined = await waitFor<LoungeJoinedPayload>(alice, LOUNGE_EVENTS.joined);
  ok("first member is confirmed into the room", aliceJoined.roomId === "coogpaws");
  ok("join payload names the venue to render", aliceJoined.venueId === "coogpaws");
  ok("display name is derived from the profile", aliceJoined.you.displayName === "Ada Lovelace");
  ok("roster contains one occupant", aliceJoined.occupants.length === 1);

  /* ── user two joins; user one is told ─────────────────────────────── */
  const bob = connect(VERIFIED_TWO);
  await waitFor(bob, "connect");

  const alicePresence = waitFor<LoungePresencePayload>(alice, LOUNGE_EVENTS.presence);
  const aliceSeesJoin = waitFor<LoungeChatMessage>(alice, LOUNGE_EVENTS.chat);

  bob.emit(LOUNGE_EVENTS.join, { roomId: "coogpaws" });
  const bobJoined = await waitFor<LoungeJoinedPayload>(bob, LOUNGE_EVENTS.joined);

  ok("second member joins the same room", bobJoined.occupants.length === 2, String(bobJoined.occupants.length));

  const notice = await aliceSeesJoin;
  ok("existing member receives a join notification", notice.system === true && notice.message.includes("Grace"));

  const presence = await alicePresence;
  ok("online list updates for everyone", presence.occupants.length === 2);

  /* ── a message reaches BOTH members ───────────────────────────────── */
  const aliceHears = waitFor<LoungeChatMessage>(alice, LOUNGE_EVENTS.chat);
  const bobHears = waitFor<LoungeChatMessage>(bob, LOUNGE_EVENTS.chat);
  bob.emit(LOUNGE_EVENTS.message, { roomId: "coogpaws", message: "Go Coogs" });

  const [heardByAlice, heardByBob] = await Promise.all([aliceHears, bobHears]);
  ok("message reaches the other member", heardByAlice.message === "Go Coogs");
  ok("message echoes to the sender", heardByBob.message === "Go Coogs");
  ok("message is attributed", heardByAlice.displayName === "Grace Hopper");
  ok("messages carry a stable id", !!heardByAlice.id && heardByAlice.id === heardByBob.id);

  /* ── a late joiner receives recent history ────────────────────────── */
  const carol = connect({ ...VERIFIED, id: "u5", firstName: "Carol", lastName: "Shaw" });
  await waitFor(carol, "connect");
  /* Register BEFORE emitting: the server sends `joined` and `history` in the
   * same tick, so awaiting the first would miss the second. */
  const historyPromise = waitFor<{ messages: LoungeChatMessage[] }>(carol, LOUNGE_EVENTS.history);
  const carolJoined = waitFor<LoungeJoinedPayload>(carol, LOUNGE_EVENTS.joined);
  carol.emit(LOUNGE_EVENTS.join, { roomId: "coogpaws" });
  await carolJoined;
  const history = await historyPromise;
  ok(
    "late joiner receives recent history",
    history.messages.some((m) => m.message === "Go Coogs"),
    `${history.messages.length} messages`,
  );
  carol.close();

  /* ── sending without joining is refused ───────────────────────────── */
  const stray = connect({ ...VERIFIED, id: "u6" });
  await waitFor(stray, "connect");
  stray.emit(LOUNGE_EVENTS.message, { roomId: "coogpaws", message: "hello" });
  const strayError = await waitFor<LoungeErrorPayload>(stray, LOUNGE_EVENTS.error);
  ok("a message before joining is refused", strayError.code === "NOT_IN_ROOM", strayError.code);
  stray.close();

  /* ── an empty message is rejected by schema ───────────────────────── */
  bob.emit(LOUNGE_EVENTS.message, { roomId: "coogpaws", message: "   " });
  const invalid = await waitFor<LoungeErrorPayload>(bob, LOUNGE_EVENTS.error);
  ok("blank messages are rejected", invalid.code === "INVALID_MESSAGE", invalid.code);

  /* ── rate limiting ────────────────────────────────────────────────── */
  let limited: LoungeErrorPayload | null = null;
  bob.on(LOUNGE_EVENTS.error, (payload: LoungeErrorPayload) => {
    if (payload.code === "RATE_LIMITED") limited = payload;
  });
  for (let i = 0; i < 40; i++) bob.emit(LOUNGE_EVENTS.message, { roomId: "coogpaws", message: `spam ${i}` });
  await new Promise((resolve) => setTimeout(resolve, 400));
  ok("per-user rate limit engages", limited !== null);

  /* ── leaving notifies the room ────────────────────────────────────── */
  const aliceSeesLeave = waitFor<LoungeChatMessage>(alice, LOUNGE_EVENTS.chat, 4000).catch(() => null);
  bob.close();
  const leaveNotice = await aliceSeesLeave;
  ok(
    "leaving produces a departure notification",
    !!leaveNotice && leaveNotice.system === true && leaveNotice.message.includes("left"),
  );

  alice.close();
} catch (error) {
  failed += 1;
  console.log(`  FAIL  live session threw → ${(error as Error).message}`);
} finally {
  io.close();
  httpServer.close();
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
