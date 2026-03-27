import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
// biome-ignore lint/performance/noNamespaceImport: needed for drizzle schema
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL está não definida em .env.local");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true, // Neon requer SSL
});

// Testar a conexão
pool.on("error", (err) => {
  console.error("Erro de conexão com pool:", err);
});

export const db = drizzle(pool, { schema });

export default db;
