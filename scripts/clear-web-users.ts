import { Pool } from "pg";

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

const main = async (): Promise<void> => {
  const databaseUrl = getRequiredEnv("DATABASE_URL_DIRECT");

  console.log(
    "Connecting to database to clear web app users and organizations..."
  );

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
    ssl: true,
  });
  const client = await pool.connect();

  try {
    await client.query("begin");

    console.log(
      "Truncating users, organizations, and all related tenant data..."
    );

    // TRUNCATE CASCADE automatically handles all foreign key dependencies
    // like sessions, accounts, members, audit_events, products, sales, etc.
    // It will NOT affect admin_users or platform_admins as they are isolated.
    await client.query(`
      TRUNCATE TABLE 
        users, 
        organization, 
        verifications
      CASCADE;
    `);

    await client.query("commit");
    console.log("✅ Successfully cleared all web app users and tenant data.");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    console.error("❌ Failed to clear database:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
