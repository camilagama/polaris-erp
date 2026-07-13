/**
 * Apply missing migrations manually by running the SQL files directly.
 * This is needed because drizzle-kit migrate fails when the initial schema
 * was created via `push` (no migration history) and subsequent migrations
 * try to create objects that already exist.
 *
 * Usage: bun scripts/apply-pending-migrations.ts
 */

import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const MIGRATIONS_DIR = join(
  import.meta.dirname ?? ".",
  "..",
  "packages",
  "db",
  "src",
  "migrations"
);
const STATEMENT_BREAKPOINT_PATTERN = /^\s*statement-breakpoint\s*/;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL_DIRECT,
});

// Get applied migrations
const { rows: appliedRows } = await pool.query(
  "SELECT hash FROM drizzle.__drizzle_migrations__"
);
const appliedHashes = new Set(appliedRows.map((r: { hash: string }) => r.hash));

// Get all .sql migration files sorted
const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(
  `Found ${files.length} migration files, ${appliedHashes.size} already applied.\n`
);

let applied = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  const filePath = join(MIGRATIONS_DIR, file);
  const rawSql = readFileSync(filePath, "utf-8");

  // Split on drizzle statement breakpoints
  const statements = rawSql
    .split("-->")
    .map((s) => s.replace(STATEMENT_BREAKPOINT_PATTERN, "").trim())
    .filter(Boolean);

  console.log(`--- ${file} (${statements.length} statements)`);

  let fileOk = true;
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (e: unknown) {
      const msg = (e as { message: string }).message;
      // Skip "already exists" errors
      if (
        msg.includes("already exists") ||
        msg.includes("42710") ||
        msg.includes("42P07")
      ) {
        console.log(`  SKIP (already exists): ${stmt.slice(0, 80)}...`);
      } else {
        console.error(`  FAIL: ${msg}`);
        console.error(`  Statement: ${stmt.slice(0, 120)}...`);
        fileOk = false;
        failed++;
        break;
      }
    }
  }

  if (fileOk) {
    applied++;
    console.log("  OK");
  } else {
    skipped++;
  }
}

console.log(
  `\nDone. Applied: ${applied}, Skipped: ${skipped}, Failed: ${failed}`
);
await pool.end();
