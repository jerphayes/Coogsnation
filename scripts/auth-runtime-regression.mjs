import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const envExample = read(".env.example");
const devCompose = read("docker-compose.yml");
const prodCompose = read("docker-compose.prod.yml");
const index = read("server/index.ts");
const readiness = read("server/databaseReadiness.ts");
const auth = read("server/auth.ts");
const profile = read("client/src/pages/ProfileCompletion.tsx");
const sessionMigration = read("migrations/0005_auth_runtime_readiness.sql");

const envValue = (name) => {
  const match = envExample.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match?.[1]?.trim() ?? "";
};

const databaseUrl = envValue("DATABASE_URL");
const postgresUser = envValue("POSTGRES_USER");
const postgresPassword = envValue("POSTGRES_PASSWORD");
const postgresDatabase = envValue("POSTGRES_DB");
const postgresHostPort = envValue("POSTGRES_HOST_PORT");
let parsedDatabaseUrl;
try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  failures.push(".env.example DATABASE_URL must be a valid PostgreSQL URL");
}

check(
  parsedDatabaseUrl && decodeURIComponent(parsedDatabaseUrl.username) === postgresUser,
  ".env.example DATABASE_URL username must match POSTGRES_USER for Codespaces development",
);
check(
  parsedDatabaseUrl && decodeURIComponent(parsedDatabaseUrl.password) === postgresPassword,
  ".env.example DATABASE_URL password must match POSTGRES_PASSWORD for Codespaces development",
);
check(
  parsedDatabaseUrl && parsedDatabaseUrl.pathname.replace(/^\//, "") === postgresDatabase,
  ".env.example DATABASE_URL database must match POSTGRES_DB for Codespaces development",
);
check(
  parsedDatabaseUrl && (parsedDatabaseUrl.port || "5432") === postgresHostPort,
  ".env.example DATABASE_URL port must match POSTGRES_HOST_PORT for Codespaces development",
);
check(
  devCompose.includes('"127.0.0.1:${POSTGRES_HOST_PORT:-5432}:5432"'),
  "development PostgreSQL must be published only to loopback for host/Codespaces Node",
);
const prodDatabaseBlock = prodCompose.split(/\n  database:\n/)[1]?.split(/\n  migrate:\n/)[0] ?? "";
check(
  !prodDatabaseBlock.includes("ports:"),
  "production PostgreSQL must remain unpublished",
);
check(
  sessionMigration.includes("CREATE TABLE IF NOT EXISTS sessions"),
  "session-store migration must create sessions idempotently",
);
check(
  sessionMigration.includes('CREATE INDEX IF NOT EXISTS "IDX_session_expire"'),
  "session-store migration must create the expiration index",
);
check(
  auth.includes("createTableIfMissing: false"),
  "session creation must remain migration-controlled rather than runtime schema mutation",
);
check(
  readiness.includes("to_regclass('public.users')") && readiness.includes("to_regclass('public.sessions')"),
  "startup readiness must verify users and sessions tables",
);
check(
  readiness.includes('column_name = \'account_status\'') && readiness.includes('column_name = \'session_version\''),
  "startup readiness must verify authentication hardening columns",
);
const readinessCall = index.indexOf("await assertDatabaseReady()");
const routeRegistration = index.indexOf("await registerRoutes(app)");
check(
  readinessCall >= 0 && routeRegistration >= 0 && readinessCall < routeRegistration,
  "database readiness must run before authentication routes and HTTP listening",
);
check(
  index.includes("await checkDatabaseHealth()") && index.includes('database: "unavailable"'),
  "/healthz must fail closed when PostgreSQL is unavailable",
);
check(
  profile.includes("if (!response.ok || typeof data.available !== 'boolean')"),
  "handle availability client must reject failed or malformed responses",
);
check(
  profile.includes("new AbortController()") && profile.includes("handleCheckController.current?.abort()"),
  "handle availability client must prevent stale requests from overwriting current input",
);
check(
  profile.includes('data-testid="handle-check-error"'),
  "handle availability failure must be visible instead of silently greying the Join button",
);

if (failures.length > 0) {
  console.error("Authentication runtime regression checks FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("Authentication runtime regression checks passed.");
