import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

function usage(): never {
  console.error("Usage: npm run admin:bootstrap -- <email|handle|user-id>");
  process.exit(1);
}

const identifier = process.argv[2]?.trim();
if (!identifier || identifier.startsWith("--")) usage();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL must be set");
  process.exit(1);
}

const configuredOwnerId = process.env.OWNER_USER_ID?.trim();
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined,
});

try {
  const result = await pool.query(
    `SELECT id, email, handle, role, account_status, is_local_account, password_hash
       FROM users
      WHERE id = $1 OR lower(email) = lower($1) OR lower(handle) = lower($1)
      LIMIT 2`,
    [identifier],
  );

  if (result.rows.length === 0) {
    console.error(`No user matched: ${identifier}`);
    process.exitCode = 1;
  } else if (result.rows.length > 1) {
    console.error(`More than one user matched: ${identifier}. Use the exact user ID.`);
    process.exitCode = 1;
  } else {
    const target = result.rows[0];

    if (!configuredOwnerId) {
      console.log(`OWNER_USER_ID=${target.id}`);
      console.log("Add that exact line to .env, reload the environment, then run this command again.");
      process.exitCode = 2;
    } else if (configuredOwnerId !== target.id) {
      console.error("Refusing owner bootstrap: OWNER_USER_ID does not match the selected account.");
      console.error(`Configured owner ID: ${configuredOwnerId}`);
      console.error(`Selected user ID: ${target.id}`);
      process.exitCode = 1;
    } else if (!target.is_local_account || !target.password_hash) {
      console.error("Refusing owner bootstrap: the owner must have a local account with a password so sensitive actions can require password confirmation.");
      process.exitCode = 1;
    } else if (target.role === "admin" && target.account_status === "active") {
      console.log(`Owner is already active with administrator access: ${target.id}`);
    } else {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `UPDATE users
              SET role = 'admin',
                  account_status = 'active',
                  session_version = session_version + 1,
                  updated_at = now()
            WHERE id = $1`,
          [target.id],
        );
        await client.query(
          `INSERT INTO auth_audit_events
             (event_type, outcome, user_id, detail)
           VALUES
             ('admin_account_action', 'success', $1,
              'actor=server_operator; action=owner_bootstrap; role=admin; account_status=active')`,
          [target.id],
        );
        await client.query("COMMIT");
        console.log(`Owner administrator access activated for user ID: ${target.id}`);
        console.log("Existing sessions were revoked. Sign in again before opening /admin.");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  }
} catch (error) {
  console.error("Owner bootstrap failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
