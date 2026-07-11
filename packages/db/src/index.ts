import "dotenv/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { resolveDatabasePoolMax } from "./pool-config";
// biome-ignore lint/performance/noNamespaceImport: needed for drizzle schema
import * as schema from "./schema";

type Database = NodePgDatabase<typeof schema>;

let pool: Pool | null = null;
let database: Database | null = null;

const getPool = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is required to initialize @polaris/db.");
    }

    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      max: resolveDatabasePoolMax(),
      ssl: true,
    });
  }

  return pool;
};

const getDb = (): Database => {
  if (!database) {
    database = drizzle(getPool(), { schema });
  }

  return database;
};

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const value = Reflect.get(getDb(), property);

    if (typeof value === "function") {
      return value.bind(getDb());
    }

    return value;
  },
});
