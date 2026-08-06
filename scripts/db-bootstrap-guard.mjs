#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import pg from "pg";

const { Client } = pg;

function fail(message) {
  console.error(`[DB BOOTSTRAP BLOCKED] ${message}`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) fail("DATABASE_URL is required.");

const client = new Client({
  connectionString: databaseUrl,
  application_name: "coogsnation-db-bootstrap-guard",
});

try {
  await client.connect();
  const result = await client.query(`
    SELECT table_name
      FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
     ORDER BY table_name
  `);

  if (result.rows.length > 0) {
    const names = result.rows.map((row) => row.table_name).join(", ");
    fail(
      `Schema push is allowed only on a completely empty disposable database. ` +
      `This database already contains ${result.rows.length} table(s): ${names}. ` +
      `Use numbered migrations or restore a backup instead.`,
    );
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await client.end().catch(() => undefined);
}

const binary = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "drizzle-kit.cmd" : "drizzle-kit",
);

if (!fs.existsSync(binary)) {
  fail("drizzle-kit is not installed. Run npm install first.");
}

console.log("[DB BOOTSTRAP] Empty database confirmed. Running drizzle-kit push...");
const result = spawnSync(binary, ["push"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (result.error) fail(result.error.message);
process.exit(result.status ?? 1);
