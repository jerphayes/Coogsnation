import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const { Pool } = pg;

async function main() {
  const ownerEmail = (process.env.COOGSNATION_OWNER_EMAIL || "").trim();
  const databaseUrl = (process.env.DATABASE_URL || "").trim();

  if (!ownerEmail) {
    console.log("WARNING: COOGSNATION_OWNER_EMAIL is unavailable; owner sync skipped.");
    return;
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is unavailable.");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await pool.query(
      `
        UPDATE users
        SET
          role = 'admin',
          session_version =
            CASE
              WHEN role IS DISTINCT FROM 'admin'
              THEN session_version + 1
              ELSE session_version
            END
        WHERE lower(email) = lower($1)
        RETURNING id, email, handle, role, account_status;
      `,
      [ownerEmail],
    );

    if (result.rowCount === 0) {
      console.log("Owner account is not registered in this database yet.");
      console.log("Register it once, then rerun npm run codespace:start.");
      return;
    }

    const owner = result.rows[0];
    const envPath = ".env";
    const raw = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
    const lines = raw.split(/\r?\n/);

    let ownerIdWritten = false;

    const output = lines.map((line) => {
      if (line.startsWith("OWNER_USER_ID=")) {
        ownerIdWritten = true;
        return `OWNER_USER_ID=${owner.id}`;
      }

      return line;
    });

    if (!ownerIdWritten) {
      output.push(`OWNER_USER_ID=${owner.id}`);
    }

    writeFileSync(envPath, output.join("\n").replace(/\n*$/, "\n"));

    console.log("Owner administrator access synchronized.");
    console.log(`Owner handle: ${owner.handle || "<none>"}`);
    console.log(`Owner role: ${owner.role}`);
    console.log(`Account status: ${owner.account_status}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`ERROR: Owner synchronization failed: ${error.message}`);
  process.exit(1);
});
