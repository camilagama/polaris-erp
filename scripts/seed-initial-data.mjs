import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL_DIRECT ou DATABASE_URL nao configurado.");
}

const seedUser = {
  email: "contato.juniordiniz@gmail.com",
  name: "Junior Diniz",
  password: "DgImports@2026!",
};

const seedSettings = {
  estimatedFeePercent: "5.00",
  lowStockThreshold: 2,
  minimumMarginPercent: "15.00",
  staleProductDays: 45,
  targetMarginPercent: "25.00",
};

const pool = new Pool({
  connectionString,
  ssl: true,
});

const run = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      "select id from users where email = $1 limit 1",
      [seedUser.email]
    );
    const userId = userResult.rows[0]?.id ?? randomUUID();

    if (userResult.rowCount === 0) {
      await client.query(
        `insert into users (id, name, email, email_verified, image, created_at, updated_at)
         values ($1, $2, $3, true, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, seedUser.name, seedUser.email]
      );
    } else {
      await client.query(
        `update users
         set name = $2, email_verified = true, updated_at = CURRENT_TIMESTAMP
         where id = $1`,
        [userId, seedUser.name]
      );
    }

    const passwordHash = await hashPassword(seedUser.password);
    const accountResult = await client.query(
      "select id from accounts where user_id = $1 and provider_id = 'credential' limit 1",
      [userId]
    );

    if (accountResult.rowCount === 0) {
      await client.query(
        `insert into accounts (
          id, account_id, provider_id, user_id, access_token, refresh_token, id_token,
          access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at
        ) values ($1, $2, 'credential', $3, null, null, null, null, null, null, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [randomUUID(), userId, userId, passwordHash]
      );
    } else {
      await client.query(
        `update accounts
         set account_id = $2, password = $3, updated_at = CURRENT_TIMESTAMP
         where id = $1`,
        [accountResult.rows[0].id, userId, passwordHash]
      );
    }

    const settingsResult = await client.query(
      "select id from system_settings order by id asc limit 1"
    );

    if (settingsResult.rowCount === 0) {
      await client.query(
        `insert into system_settings (
          target_margin_percent,
          minimum_margin_percent,
          low_stock_threshold,
          stale_product_days,
          estimated_fee_percent,
          created_at,
          updated_at
        ) values ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          seedSettings.targetMarginPercent,
          seedSettings.minimumMarginPercent,
          seedSettings.lowStockThreshold,
          seedSettings.staleProductDays,
          seedSettings.estimatedFeePercent,
        ]
      );
    } else {
      await client.query(
        `update system_settings
         set target_margin_percent = $2,
             minimum_margin_percent = $3,
             low_stock_threshold = $4,
             stale_product_days = $5,
             estimated_fee_percent = $6,
             updated_at = CURRENT_TIMESTAMP
         where id = $1`,
        [
          settingsResult.rows[0].id,
          seedSettings.targetMarginPercent,
          seedSettings.minimumMarginPercent,
          seedSettings.lowStockThreshold,
          seedSettings.staleProductDays,
          seedSettings.estimatedFeePercent,
        ]
      );
    }

    await client.query("COMMIT");
    console.log("Seed inicial aplicado com sucesso.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
