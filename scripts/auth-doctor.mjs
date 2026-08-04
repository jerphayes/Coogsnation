import fs from "node:fs";
import net from "node:net";

if (fs.existsSync(".env") && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env");
}

const fail = (message) => {
  console.error(`[AUTH DOCTOR] ${message}`);
  process.exit(1);
};

const describeNetworkError = (error) => {
  if (error instanceof AggregateError && Array.isArray(error.errors)) {
    return error.errors
      .map((entry) => entry?.message || entry?.code)
      .filter(Boolean)
      .join("; ") || "connection failed";
  }
  return error?.message || error?.code || "connection failed";
};

const raw = process.env.DATABASE_URL?.trim();
if (!raw) fail("DATABASE_URL is missing. Copy .env.example to .env and configure it.");
if (!process.env.SESSION_SECRET?.trim()) fail("SESSION_SECRET is missing.");

let databaseUrl;
try {
  databaseUrl = new URL(raw);
} catch {
  fail("DATABASE_URL is not a valid PostgreSQL URL.");
}

if (!/^postgres(ql)?:$/.test(databaseUrl.protocol)) {
  fail("DATABASE_URL must use postgresql:// or postgres://.");
}

const hostname = databaseUrl.hostname;
const port = Number(databaseUrl.port || 5432);
const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

if (isLocal) {
  const urlUser = decodeURIComponent(databaseUrl.username);
  const urlPassword = decodeURIComponent(databaseUrl.password);
  const urlDatabase = databaseUrl.pathname.replace(/^\//, "");
  const configuredPort = Number(process.env.POSTGRES_HOST_PORT || 5432);

  if (process.env.POSTGRES_USER && urlUser !== process.env.POSTGRES_USER) {
    fail("DATABASE_URL username and POSTGRES_USER do not match.");
  }
  if (process.env.POSTGRES_PASSWORD && urlPassword !== process.env.POSTGRES_PASSWORD) {
    fail(
      "DATABASE_URL and POSTGRES_PASSWORD do not use the same password. " +
      "Update .env so the PostgreSQL container and host Node process share one development credential.",
    );
  }
  if (process.env.POSTGRES_DB && urlDatabase !== process.env.POSTGRES_DB) {
    fail("DATABASE_URL database name and POSTGRES_DB do not match.");
  }
  if (port !== configuredPort) {
    fail("DATABASE_URL port and POSTGRES_HOST_PORT do not match.");
  }
}

await new Promise((resolve, reject) => {
  const socket = net.createConnection({ host: hostname, port });
  const timer = setTimeout(() => {
    socket.destroy();
    reject(new Error(`Timed out connecting to ${hostname}:${port}`));
  }, 3_000);

  socket.once("connect", () => {
    clearTimeout(timer);
    socket.end();
    resolve();
  });
  socket.once("error", (error) => {
    clearTimeout(timer);
    reject(error);
  });
}).catch((error) => {
  fail(
    `PostgreSQL is not reachable at ${hostname}:${port}: ${describeNetworkError(error)}. ` +
    "For Codespaces/local host development, run: docker compose up -d database",
  );
});

console.log(`[AUTH DOCTOR] Environment and PostgreSQL TCP access passed for ${hostname}:${port}.`);
console.log("[AUTH DOCTOR] Run npm run db:migrate:dev, then npm run dev.");
