import { config } from "dotenv";

config({ path: "../../.env.local" });
config({ path: ".env.local" });

import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL_DIRECT?.trim() ?? "";

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
