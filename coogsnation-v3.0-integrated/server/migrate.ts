import dotenv from "dotenv";
dotenv.config();

import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run database migrations");
}

const migrationsDir = path.resolve(process.cwd(), "migrations");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined,
});

async function run(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS coogsnation_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = (await fs.readdir(migrationsDir))
      .filter((name) => /^\d+.*\.sql$/i.test(name))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

    if (files.length === 0) {
      console.log("[MIGRATE] No migration files found");
      return;
    }

    const appliedResult = await client.query<{ filename: string }>(
      "SELECT filename FROM coogsnation_migrations",
    );
    const applied = new Set(appliedResult.rows.map((row) => row.filename));

    for (const filename of files) {
      if (applied.has(filename)) continue;

      const sql = await fs.readFile(path.join(migrationsDir, filename), "utf8");
      console.log(`[MIGRATE] Applying ${filename}`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO coogsnation_migrations (filename) VALUES ($1)",
          [filename],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("[MIGRATE] Database migrations are current");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("[MIGRATE] Migration failed", error);
  process.exit(1);
});
