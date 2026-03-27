import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  migrations: {
    prefix: "timestamp",
    table: "__drizzle_migrations__",
    schema: "drizzle",
  },
  verbose: true,
  strict: true,
});
