import type { PoolClient } from "pg";
import { pool } from "./db";

export type DatabaseHealth =
  | { ok: true }
  | { ok: false; message: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function databaseTarget(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return "unconfigured database";

  try {
    const url = new URL(raw);
    const port = url.port || "5432";
    return `${url.hostname}:${port}/${url.pathname.replace(/^\//, "")}`;
  } catch {
    return "configured database";
  }
}

/**
 * Verify the database pieces required by authentication before opening the
 * HTTP listener. This converts hidden login/handle 500s into one actionable
 * startup failure and prevents /healthz from reporting a false healthy state.
 */
export async function assertDatabaseReady(): Promise<void> {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    const result = await client.query<{
      users_table: string | null;
      sessions_table: string | null;
      has_account_status: boolean;
      has_session_version: boolean;
    }>(`
      SELECT
        to_regclass('public.users')::text AS users_table,
        to_regclass('public.sessions')::text AS sessions_table,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'account_status'
        ) AS has_account_status,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'session_version'
        ) AS has_session_version
    `);

    const state = result.rows[0];
    const missing: string[] = [];
    if (!state?.users_table) missing.push("users table");
    if (!state?.sessions_table) missing.push("sessions table");
    if (!state?.has_account_status) missing.push("users.account_status");
    if (!state?.has_session_version) missing.push("users.session_version");

    if (missing.length > 0) {
      throw new Error(
        `Missing ${missing.join(", ")}. Run npm run db:bootstrap for a new database, then npm run db:migrate:dev.`,
      );
    }
  } catch (error) {
    throw new Error(
      `[DATABASE] Authentication database is not ready at ${databaseTarget()}: ${errorMessage(error)}`,
      { cause: error },
    );
  } finally {
    client?.release();
  }
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    await pool.query({ text: "SELECT 1", query_timeout: 2_000 });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
