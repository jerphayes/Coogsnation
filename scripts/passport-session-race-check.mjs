import fs from "node:fs";

const source =
  fs.readFileSync(
    "server/auth.ts",
    "utf8",
  );

const fail = message => {
  throw new Error(message);
};

if (
  !source.includes(
    "PASSPORT_LOGOUT_SESSION_RACE_V1",
  )
) {
  fail(
    "safe Passport session invalidation helper missing",
  );
}

if (
  source.includes(
    "req.logout(() => undefined)",
  )
) {
  fail(
    "fire-and-forget Passport logout detected",
  );
}

if (
  /req\.logout\([\s\S]{0,100}?req\.session\?\.destroy/.test(
    source,
  )
) {
  fail(
    "concurrent Passport logout/session destroy detected",
  );
}

const uses =
  source.match(
    /await invalidatePassportSession\(req\);/g,
  ) || [];

if (uses.length !== 4) {
  fail(
    `expected 4 safe invalidations, found ${uses.length}`,
  );
}

console.log(
  "PASS: Passport 0.7 session race contract",
);
