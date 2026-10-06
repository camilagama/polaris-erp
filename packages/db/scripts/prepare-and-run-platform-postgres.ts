import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { Pool } from "pg";
import { validatePostgresBehaviorDatabaseEnv } from "../../../scripts/require-postgres-behavior-database";

const behaviorUrl = process.env.POSTGRES_BEHAVIOR_DATABASE_URL;
if (!behaviorUrl) {
  throw new Error("POSTGRES_BEHAVIOR_DATABASE_URL is required.");
}

const sourceUrl = new URL(behaviorUrl);
const sourceDatabase = decodeURIComponent(
  sourceUrl.pathname.replace(/^\/+/, "")
);
if (sourceDatabase !== "polaris_behavior") {
  throw new Error(
    "Platform integration tests require the isolated polaris_behavior source database."
  );
}

const targetDatabase = `polaris_platform_behavior_${randomUUID().replaceAll("-", "")}`;
const targetUrl = new URL(sourceUrl);
targetUrl.pathname = `/${targetDatabase}`;
validatePostgresBehaviorDatabaseEnv({
  DATABASE_URL: targetUrl.toString(),
  POSTGRES_BEHAVIOR_DATABASE_URL: behaviorUrl,
});

const adminUrl = new URL(sourceUrl);
adminUrl.pathname = "/postgres";
const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let targetCreated = false;

try {
  const activeConnections = await adminPool.query<{ active_count: string }>(
    `SELECT count(*)::text AS active_count
     FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [sourceDatabase]
  );
  if (activeConnections.rows[0]?.active_count !== "0") {
    throw new Error(
      "Refusing to clone the behavior database while it has active sessions."
    );
  }

  await adminPool.query(
    `CREATE DATABASE "${targetDatabase}" WITH TEMPLATE "${sourceDatabase}"`
  );
  targetCreated = true;
  console.log(
    "Running platform PostgreSQL tests in a temporary loopback-only database clone."
  );

  execFileSync(
    process.execPath,
    ["run", "--filter", "@polaris/platform", "test:postgres"],
    {
      cwd: resolve(import.meta.dir, "../../.."),
      env: { ...process.env, DATABASE_URL: targetUrl.toString() },
      stdio: "inherit",
    }
  );
} finally {
  try {
    if (targetCreated) {
      await adminPool.query(`DROP DATABASE "${targetDatabase}"`);
      console.log("Removed the temporary platform PostgreSQL test database.");
    }
  } finally {
    await adminPool.end();
  }
}
