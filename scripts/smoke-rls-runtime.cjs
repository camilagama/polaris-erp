"use strict";

const crypto = require("node:crypto");

require("dotenv").config({ path: ".env.local", quiet: true });

const { Client } = require("pg");

const TENANT_TABLES = [
  "organization",
  "member",
  "invitation",
  "audit_events",
  "categories",
  "system_settings",
  "products",
  "product_price_changes",
  "product_stock_entries",
  "product_stock_write_offs",
  "sales",
  "sale_items",
  "goals",
];
const RLS_POLICY_ERROR_PATTERN = /row-level security policy/i;

const assertCondition = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const main = async () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL ausente.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const baseline = await client.query(
      `
        select
          current_user,
          (select rolbypassrls from pg_roles where rolname = current_user) as current_user_bypassrls,
          (select count(*)::int from pg_policies where schemaname = 'public') as policy_count,
          (
            select count(*) filter (where relrowsecurity and relforcerowsecurity)::int
            from pg_class
            where relnamespace = 'public'::regnamespace
              and relname = any($1::text[])
          ) as forced_count,
          (select count(*)::int from organization) as organizations_without_context,
          (select count(*)::int from products) as products_without_context,
          (select count(*)::int from sales) as sales_without_context;
      `,
      [TENANT_TABLES]
    );
    const baselineRow = baseline.rows[0];

    assertCondition(
      baselineRow.current_user_bypassrls === false,
      `Role runtime ${baselineRow.current_user} ainda tem BYPASSRLS.`
    );
    assertCondition(
      baselineRow.policy_count >= 14,
      `Policies RLS insuficientes: ${baselineRow.policy_count}.`
    );
    assertCondition(
      baselineRow.forced_count === TENANT_TABLES.length,
      `FORCE RLS incompleto: ${baselineRow.forced_count}/${TENANT_TABLES.length}.`
    );
    assertCondition(
      baselineRow.organizations_without_context === 0 &&
        baselineRow.products_without_context === 0 &&
        baselineRow.sales_without_context === 0,
      "Tabelas tenant-scoped retornaram dados sem contexto RLS."
    );

    const userId = `rls_smoke_user_${crypto.randomUUID()}`;
    const organizationId = `rls_smoke_org_${crypto.randomUUID()}`;
    const memberId = crypto.randomUUID();
    const slug = `rls-smoke-${organizationId.slice(-8)}`;

    let deniedWithoutContext = false;
    await client.query("begin");
    try {
      await client.query(
        "insert into organization (id, name, slug, status) values ($1, $2, $3, $4)",
        [
          `${organizationId}_denied`,
          "RLS denied smoke",
          `${slug}-denied`,
          "active",
        ]
      );
    } catch (error) {
      deniedWithoutContext = RLS_POLICY_ERROR_PATTERN.test(error.message);
    } finally {
      await client.query("rollback");
    }

    assertCondition(
      deniedWithoutContext,
      "Insert tenant-scoped sem contexto nao foi negado por RLS."
    );

    await client.query("begin");
    try {
      await client.query(
        "insert into users (id, name, email, email_verified) values ($1, $2, $3, $4)",
        [userId, "RLS Smoke User", `${userId}@example.invalid`, true]
      );
      await client.query("select set_config($1, $2, true)", [
        "app.user_id",
        userId,
      ]);
      await client.query("select set_config($1, $2, true)", [
        "app.organization_id",
        organizationId,
      ]);
      await client.query(
        "insert into organization (id, name, slug, status) values ($1, $2, $3, $4)",
        [organizationId, "RLS Smoke Organization", slug, "active"]
      );
      await client.query(
        "insert into member (id, organization_id, user_id, role) values ($1, $2, $3, $4)",
        [memberId, organizationId, userId, "owner"]
      );
      await client.query(
        "insert into categories (organization_id, key, name, description, is_system) values ($1, $2, $3, $4, $5)",
        [organizationId, "others", "Outros", "Categoria smoke", true]
      );
      await client.query(
        "insert into system_settings (organization_id, id, minimum_markup_percent, ideal_markup_percent, payment_fee_rules) values ($1, $2, $3, $4, $5::jsonb)",
        [organizationId, "global", "0", "0", "[]"]
      );
      await client.query(
        "insert into audit_events (organization_id, actor_user_id, type, subject_type, subject_id, metadata) values ($1, $2, $3, $4, $1, $5::jsonb)",
        [organizationId, userId, "organization.created", "organization", "{}"]
      );

      const visible = await client.query(
        `
          select
            (select count(*)::int from organization where id = $1) as organizations,
            (select count(*)::int from member where organization_id = $1) as members,
            (select count(*)::int from categories where organization_id = $1) as categories,
            (select count(*)::int from system_settings where organization_id = $1) as settings,
            (select count(*)::int from audit_events where organization_id = $1) as audit_events;
        `,
        [organizationId]
      );
      const visibleRow = visible.rows[0];

      assertCondition(
        visibleRow.organizations === 1 &&
          visibleRow.members === 1 &&
          visibleRow.categories === 1 &&
          visibleRow.settings === 1 &&
          visibleRow.audit_events === 1,
        "Fluxo onboarding-like com contexto RLS nao ficou visivel dentro da transacao."
      );
    } finally {
      await client.query("rollback");
    }

    console.log(
      JSON.stringify(
        {
          currentUser: baselineRow.current_user,
          forcedTables: `${baselineRow.forced_count}/${TENANT_TABLES.length}`,
          policies: baselineRow.policy_count,
          result: "rls-runtime-smoke-ok",
        },
        null,
        2
      )
    );
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
