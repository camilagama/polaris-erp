import { config } from "dotenv";

config({ path: "../../.env.local" });
config({ path: ".env.local" });

import { defineConfig } from "drizzle-kit";
import type { LocalDbPushTargetEnv } from "./src/local-db-push-target";
import { validateLocalDbPushTarget } from "./src/local-db-push-target";

validateLocalDbPushTarget(process.env as LocalDbPushTargetEnv);

const databaseUrl = process.env.DATABASE_URL_PUSH_LOCAL?.trim() ?? "";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./src/migrations",
  dbCredentials: {
    url: databaseUrl,
  },
  migrations: {
    prefix: "timestamp",
    table: "__drizzle_migrations__",
    schema: "drizzle",
  },
  verbose: true,
  strict: true,
});
