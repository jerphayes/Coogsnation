#!/usr/bin/env node

import process from "node:process";
import pg from "pg";

const { Client } = pg;
const LEGACY_TABLES = [
  "coogpaws_profiles",
  "coogpaws_swipes",
  "coogpaws_matches",
  "coogpaws_messages",
  "coogpaws_blocks",
  "coogpaws_reports",
];

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

const client = new Client({
  connectionString: databaseUrl,
  application_name: "coogsnation-legacy-coogpaws-audit",
});

try {
  await client.connect();
  await client.query("BEGIN READ ONLY");

  const existingResult = await client.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name = ANY($1::text[])
      ORDER BY table_name`,
    [LEGACY_TABLES],
  );
  const existing = existingResult.rows.map((row) => row.table_name);

  console.log("Legacy Coogpaws database audit (READ ONLY)");
  console.log("================================================");
  if (existing.length === 0) {
    console.log("Legacy tables found: none");
  } else {
    console.log(`Legacy tables found: ${existing.join(", ")}`);
    console.log("\nRow counts:");
    for (const table of existing) {
      const countResult = await client.query(
        `SELECT count(*)::bigint AS count FROM ${quoteIdentifier(table)}`,
      );
      console.log(`- ${table}: ${countResult.rows[0]?.count ?? "unknown"}`);
    }
  }

  const foreignKeys = await client.query(
    `SELECT
       tc.constraint_name,
       tc.table_name AS source_table,
       kcu.column_name AS source_column,
       ccu.table_name AS target_table,
       ccu.column_name AS target_column,
       rc.update_rule,
       rc.delete_rule
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_catalog = kcu.constraint_catalog
      AND tc.constraint_schema = kcu.constraint_schema
      AND tc.constraint_name = kcu.constraint_name
     JOIN information_schema.constraint_column_usage ccu
       ON tc.constraint_catalog = ccu.constraint_catalog
      AND tc.constraint_schema = ccu.constraint_schema
      AND tc.constraint_name = ccu.constraint_name
     JOIN information_schema.referential_constraints rc
       ON tc.constraint_catalog = rc.constraint_catalog
      AND tc.constraint_schema = rc.constraint_schema
      AND tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND (tc.table_name = ANY($1::text[]) OR ccu.table_name = ANY($1::text[]))
    ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position`,
    [LEGACY_TABLES],
  );

  console.log("\nForeign keys touching legacy tables:");
  if (foreignKeys.rows.length === 0) {
    console.log("- none");
  } else {
    for (const row of foreignKeys.rows) {
      console.log(
        `- ${row.constraint_name}: ${row.source_table}.${row.source_column} -> ` +
        `${row.target_table}.${row.target_column} ` +
        `(ON UPDATE ${row.update_rule}, ON DELETE ${row.delete_rule})`,
      );
    }
  }

  const forumTables = await client.query(`
    SELECT
      to_regclass('public.forum_categories')::text AS categories_table,
      to_regclass('public.forum_topics')::text AS topics_table
  `);
  const forumState = forumTables.rows[0];

  console.log("\nLegacy forum category:");
  if (!forumState?.categories_table || !forumState?.topics_table) {
    console.log("- forum_categories/forum_topics are not both present");
  } else {
    const categoryResult = await client.query(`
      SELECT
        fc.id,
        fc.slug,
        fc.name,
        fc.is_active,
        count(ft.id)::bigint AS topic_count
      FROM forum_categories fc
      LEFT JOIN forum_topics ft ON ft.category_id = fc.id
      WHERE fc.slug = 'coogpaws'
      GROUP BY fc.id, fc.slug, fc.name, fc.is_active
    `);
    if (categoryResult.rows.length === 0) {
      console.log("- no category with slug 'coogpaws'");
    } else {
      for (const row of categoryResult.rows) {
        console.log(
          `- id=${row.id}, active=${row.is_active}, topics=${row.topic_count}, name=${row.name}`,
        );
      }
    }
  }

  await client.query("ROLLBACK");
  console.log("\nAudit finished without changing the database.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error("Legacy audit failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
