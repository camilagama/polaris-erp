import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { requireE2eDatabaseUrl } from "@polaris/e2e-support";
import { parse } from "dotenv";
import { Client } from "pg";
import { assertE2eDatabaseSchema } from "../apps/web/src/ops/e2e-database-schema";

const repoEnvPath = fileURLToPath(new URL("../.env.local", import.meta.url));

const env = {
  ...(existsSync(repoEnvPath) ? parse(readFileSync(repoEnvPath)) : {}),
  ...(existsSync(".env.local") ? parse(readFileSync(".env.local")) : {}),
  ...process.env,
};

const e2eDatabaseUrl = requireE2eDatabaseUrl(env);

if (e2eDatabaseUrl === env.DATABASE_URL) {
  throw new Error("E2E_DATABASE_URL must not equal DATABASE_URL.");
}

const main = async () => {
  const client = new Client({ connectionString: e2eDatabaseUrl });

  await client.connect();

  try {
    const { rows } = await client.query(`
      select
        exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'sales'
            and column_name = 'idempotency_key'
        ) as "salesIdempotencyKey",
        to_regclass('public.sales_organization_idempotency_key_unique_idx') is not null
          as "salesOrganizationIdempotencyKeyUniqueIdx",
        to_regclass('public.sessions_id_unique_idx') is not null
          as "sessionsIdUniqueIdx",
        to_regclass('public.platform_admins') is not null
          as "platformAdmins",
        to_regclass('public.platform_admin_grants') is not null
          as "platformAdminGrants"
    `);

    assertE2eDatabaseSchema(rows[0]);
  } finally {
    await client.end();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
