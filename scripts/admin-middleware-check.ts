import assert from "node:assert/strict";

// The database module validates this variable at import time. No connection is
// opened in this test because storage.getUser is replaced before middleware runs.
process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/coogsnation_test";
process.env.SESSION_SECRET ||= "test-only-session-secret-with-sufficient-length";

const [{ storage }, { requireAdmin, requireOwner }] = await Promise.all([
  import("../server/storage"),
  import("../server/auth"),
]);

const originalGetUser = storage.getUser.bind(storage);

type ResponseCapture = {
  statusCode: number;
  body: unknown;
  status(code: number): ResponseCapture;
  json(body: unknown): ResponseCapture;
};

function makeResponse(): ResponseCapture {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
}

async function runCase(options: {
  authenticated: boolean;
  userId?: string;
  databaseRole?: "member" | "admin" | null;
  middleware?: "admin" | "owner";
}): Promise<{ statusCode: number; nextCalled: boolean }> {
  (storage as any).getUser = async () => {
    if (options.databaseRole === null) return undefined;
    return { id: options.userId, role: options.databaseRole ?? "member" };
  };

  const req = {
    isAuthenticated: () => options.authenticated,
    user: options.userId ? { id: options.userId, provider: "local" } : undefined,
  } as any;
  const res = makeResponse() as any;
  let nextCalled = false;

  const middleware = options.middleware === "owner" ? requireOwner : requireAdmin;
  await middleware(req, res, () => {
    nextCalled = true;
  });

  return { statusCode: res.statusCode, nextCalled };
}

try {
  assert.deepEqual(
    await runCase({ authenticated: false }),
    { statusCode: 401, nextCalled: false },
  );
  assert.deepEqual(
    await runCase({ authenticated: true, userId: "member-1", databaseRole: "member" }),
    { statusCode: 403, nextCalled: false },
  );
  assert.deepEqual(
    await runCase({ authenticated: true, userId: "admin-1", databaseRole: "admin" }),
    { statusCode: 200, nextCalled: true },
  );
  assert.deepEqual(
    await runCase({ authenticated: true, userId: "missing-1", databaseRole: null }),
    { statusCode: 401, nextCalled: false },
  );

  process.env.OWNER_USER_ID = "owner-1";
  assert.deepEqual(
    await runCase({ authenticated: true, userId: "admin-1", databaseRole: "admin", middleware: "owner" }),
    { statusCode: 403, nextCalled: false },
  );
  assert.deepEqual(
    await runCase({ authenticated: true, userId: "owner-1", databaseRole: "member", middleware: "owner" }),
    { statusCode: 403, nextCalled: false },
  );
  assert.deepEqual(
    await runCase({ authenticated: true, userId: "owner-1", databaseRole: "admin", middleware: "owner" }),
    { statusCode: 200, nextCalled: true },
  );
  console.log("Administrator middleware checks passed.");
} finally {
  (storage as any).getUser = originalGetUser;
}
