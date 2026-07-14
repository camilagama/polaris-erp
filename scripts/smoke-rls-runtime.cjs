"use strict";

const crypto = require("node:crypto");
const path = require("node:path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env.local"),
  quiet: true,
});
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
const BILLING_TENANT_TABLES = [
  "billing_customers",
  "billing_subscriptions",
  "billing_invoices",
  "billing_payment_attempts",
  "billing_provider_links",
];
const RLS_TABLES = [...TENANT_TABLES, ...BILLING_TENANT_TABLES];
const RLS_POLICY_ERROR_PATTERN = /row-level security policy/i;
const expectedRuntimeRole = process.env.RLS_SMOKE_EXPECTED_RUNTIME_ROLE;

const assertCondition = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const captureExpectedRlsError = async (client, callback) => {
  await client.query("SAVEPOINT rls_expected_denial");

  try {
    await callback();
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT rls_expected_denial");
    await client.query("RELEASE SAVEPOINT rls_expected_denial");
    return error;
  }

  await client.query("RELEASE SAVEPOINT rls_expected_denial");
  return null;
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
          (select count(*)::int from sales) as sales_without_context,
          (select count(*)::int from billing_subscriptions) as billing_subscriptions_without_context,
          (select count(*)::int from billing_invoices) as billing_invoices_without_context;
      `,
      [RLS_TABLES]
    );
    const baselineRow = baseline.rows[0];

    assertCondition(
      baselineRow.current_user_bypassrls === false,
      `Role runtime ${baselineRow.current_user} ainda tem BYPASSRLS.`
    );
    assertCondition(
      !expectedRuntimeRole || baselineRow.current_user === expectedRuntimeRole,
      `Smoke conectado como ${baselineRow.current_user}, esperado ${expectedRuntimeRole}.`
    );
    assertCondition(
      baselineRow.policy_count >= 20,
      `Policies RLS insuficientes: ${baselineRow.policy_count}.`
    );
    assertCondition(
      baselineRow.forced_count === RLS_TABLES.length,
      `FORCE RLS incompleto: ${baselineRow.forced_count}/${RLS_TABLES.length}.`
    );
    assertCondition(
      baselineRow.organizations_without_context === 0 &&
        baselineRow.products_without_context === 0 &&
        baselineRow.sales_without_context === 0 &&
        baselineRow.billing_subscriptions_without_context === 0 &&
        baselineRow.billing_invoices_without_context === 0,
      "Tabelas tenant-scoped retornaram dados sem contexto RLS."
    );

    const userId = `rls_smoke_user_${crypto.randomUUID()}`;
    const organizationId = `rls_smoke_org_${crypto.randomUUID()}`;
    const memberId = crypto.randomUUID();
    const slug = `rls-smoke-${organizationId.slice(-8)}`;
    const planId = `rls_smoke_plan_${crypto.randomUUID()}`;
    const billingCustomerId = crypto.randomUUID();
    const billingSubscriptionId = crypto.randomUUID();
    const billingInvoiceId = crypto.randomUUID();
    const otherUserId = `rls_smoke_user_${crypto.randomUUID()}`;
    const otherOrganizationId = `rls_smoke_org_${crypto.randomUUID()}`;
    const otherMemberId = crypto.randomUUID();
    const otherSlug = `rls-smoke-${otherOrganizationId.slice(-8)}`;
    const otherBillingCustomerId = crypto.randomUUID();
    const otherBillingSubscriptionId = crypto.randomUUID();
    const otherBillingInvoiceId = crypto.randomUUID();
    const platformAdminId = crypto.randomUUID();

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
      await client.query(
        "insert into billing_plans (id, name, status, interval, currency, amount_cents, entitlements) values ($1, $2, $3, $4, $5, $6, $7::jsonb)",
        [planId, "RLS Smoke Plan", "active", "month", "BRL", 100, "[]"]
      );
      await client.query(
        "insert into billing_customers (id, organization_id, billing_email, tax_id_last4) values ($1, $2, $3, $4)",
        [billingCustomerId, organizationId, `${userId}@example.invalid`, "1234"]
      );
      await client.query(
        "insert into billing_subscriptions (id, organization_id, billing_customer_id, plan_id, status) values ($1, $2, $3, $4, $5)",
        [
          billingSubscriptionId,
          organizationId,
          billingCustomerId,
          planId,
          "active",
        ]
      );
      await client.query(
        "insert into billing_invoices (id, organization_id, billing_subscription_id, status, currency, subtotal_cents, discount_cents, total_cents) values ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          billingInvoiceId,
          organizationId,
          billingSubscriptionId,
          "open",
          "BRL",
          100,
          0,
          100,
        ]
      );
      await client.query(
        "insert into billing_payment_attempts (organization_id, billing_invoice_id, provider, provider_event_id, status, amount_cents) values ($1, $2, $3, $4, $5, $6)",
        [
          organizationId,
          billingInvoiceId,
          "manual",
          `rls-smoke-${billingInvoiceId}`,
          "pending",
          100,
        ]
      );
      await client.query(
        "insert into billing_provider_links (organization_id, provider, entity_type, external_id, billing_customer_id, billing_subscription_id, billing_invoice_id) values ($1, $2, $3, $4, $5, $6, $7)",
        [
          organizationId,
          "manual",
          "invoice",
          `rls-smoke-${billingInvoiceId}`,
          billingCustomerId,
          billingSubscriptionId,
          billingInvoiceId,
        ]
      );

      const visible = await client.query(
        `
          select
            (select count(*)::int from organization where id = $1) as organizations,
            (select count(*)::int from member where organization_id = $1) as members,
            (select count(*)::int from categories where organization_id = $1) as categories,
            (select count(*)::int from system_settings where organization_id = $1) as settings,
            (select count(*)::int from audit_events where organization_id = $1) as audit_events,
            (select count(*)::int from billing_customers where organization_id = $1) as billing_customers,
            (select count(*)::int from billing_subscriptions where organization_id = $1) as billing_subscriptions,
            (select count(*)::int from billing_invoices where organization_id = $1) as billing_invoices,
            (select count(*)::int from billing_payment_attempts where organization_id = $1) as billing_payment_attempts,
            (select count(*)::int from billing_provider_links where organization_id = $1) as billing_provider_links;
        `,
        [organizationId]
      );
      const visibleRow = visible.rows[0];

      assertCondition(
        visibleRow.organizations === 1 &&
          visibleRow.members === 1 &&
          visibleRow.categories === 1 &&
          visibleRow.settings === 1 &&
          visibleRow.audit_events === 1 &&
          visibleRow.billing_customers === 1 &&
          visibleRow.billing_subscriptions === 1 &&
          visibleRow.billing_invoices === 1 &&
          visibleRow.billing_payment_attempts === 1 &&
          visibleRow.billing_provider_links === 1,
        "Fluxo onboarding-like com contexto RLS nao ficou visivel dentro da transacao."
      );

      await client.query(
        "insert into users (id, name, email, email_verified) values ($1, $2, $3, $4)",
        [
          otherUserId,
          "RLS Other Smoke User",
          `${otherUserId}@example.invalid`,
          true,
        ]
      );
      await client.query("select set_config($1, $2, true)", [
        "app.user_id",
        otherUserId,
      ]);
      await client.query("select set_config($1, $2, true)", [
        "app.organization_id",
        otherOrganizationId,
      ]);
      await client.query(
        "insert into organization (id, name, slug, status) values ($1, $2, $3, $4)",
        [
          otherOrganizationId,
          "RLS Other Smoke Organization",
          otherSlug,
          "active",
        ]
      );
      await client.query(
        "insert into member (id, organization_id, user_id, role) values ($1, $2, $3, $4)",
        [otherMemberId, otherOrganizationId, otherUserId, "owner"]
      );
      await client.query(
        "insert into categories (organization_id, key, name, description, is_system) values ($1, $2, $3, $4, $5)",
        [
          otherOrganizationId,
          "others",
          "Outros",
          "Categoria smoke outro tenant",
          true,
        ]
      );
      await client.query(
        "insert into billing_customers (id, organization_id, billing_email, tax_id_last4) values ($1, $2, $3, $4)",
        [
          otherBillingCustomerId,
          otherOrganizationId,
          `${otherUserId}@example.invalid`,
          "5678",
        ]
      );
      await client.query(
        "insert into billing_subscriptions (id, organization_id, billing_customer_id, plan_id, status) values ($1, $2, $3, $4, $5)",
        [
          otherBillingSubscriptionId,
          otherOrganizationId,
          otherBillingCustomerId,
          planId,
          "active",
        ]
      );
      await client.query(
        "insert into billing_invoices (id, organization_id, billing_subscription_id, status, currency, subtotal_cents, discount_cents, total_cents) values ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          otherBillingInvoiceId,
          otherOrganizationId,
          otherBillingSubscriptionId,
          "open",
          "BRL",
          100,
          0,
          100,
        ]
      );

      await client.query("select set_config($1, $2, true)", [
        "app.user_id",
        userId,
      ]);
      await client.query("select set_config($1, $2, true)", [
        "app.organization_id",
        organizationId,
      ]);

      const tenantContext = await client.query(
        `
          select
            current_setting('app.organization_id', true) as organization_id,
            current_setting('app.platform_admin_id', true) as platform_admin_id,
            current_setting('app.internal_job', true) as internal_job,
            public.has_active_platform_admin() as has_active_platform_admin
        `
      );
      const tenantContextRow = tenantContext.rows[0];

      assertCondition(
        tenantContextRow.organization_id === organizationId &&
          !tenantContextRow.platform_admin_id &&
          tenantContextRow.internal_job !== "billing_webhook_reconcile" &&
          tenantContextRow.has_active_platform_admin === false,
        "Contexto tenant do smoke contem privilegio administrativo ou interno inesperado."
      );

      const crossTenantVisible = await client.query(
        `
          select
            (select count(*)::int from organization where id = $1) as organizations,
            (select count(*)::int from member where organization_id = $1) as members,
            (select count(*)::int from categories where organization_id = $1) as categories,
            (select count(*)::int from billing_customers where organization_id = $1) as billing_customers,
            (select count(*)::int from billing_subscriptions where organization_id = $1) as billing_subscriptions,
            (select count(*)::int from billing_invoices where organization_id = $1) as billing_invoices;
        `,
        [otherOrganizationId]
      );
      const crossTenantVisibleRow = crossTenantVisible.rows[0];

      assertCondition(
        crossTenantVisibleRow.organizations === 0 &&
          crossTenantVisibleRow.members === 0 &&
          crossTenantVisibleRow.categories === 0 &&
          crossTenantVisibleRow.billing_customers === 0 &&
          crossTenantVisibleRow.billing_subscriptions === 0 &&
          crossTenantVisibleRow.billing_invoices === 0,
        "Contexto tenant A conseguiu ler dados do tenant B."
      );

      const crossTenantWriteError = await captureExpectedRlsError(
        client,
        async () => {
          await client.query(
            "insert into categories (organization_id, key, name, description, is_system) values ($1, $2, $3, $4, $5)",
            [
              otherOrganizationId,
              "cross-write",
              "Cross write",
              "Escrita cross-tenant smoke",
              false,
            ]
          );
        }
      );
      const deniedCrossTenantWrite = RLS_POLICY_ERROR_PATTERN.test(
        crossTenantWriteError?.message ?? ""
      );

      assertCondition(
        deniedCrossTenantWrite,
        "Contexto tenant A conseguiu escrever dados no tenant B."
      );

      const crossTenantBillingWriteError = await captureExpectedRlsError(
        client,
        async () => {
          await client.query(
            "insert into billing_provider_links (organization_id, provider, entity_type, external_id) values ($1, $2, $3, $4)",
            [
              otherOrganizationId,
              "manual",
              "payment_attempt",
              `rls-smoke-cross-${crypto.randomUUID()}`,
            ]
          );
        }
      );
      const deniedCrossTenantBillingWrite = RLS_POLICY_ERROR_PATTERN.test(
        crossTenantBillingWriteError?.message ?? ""
      );

      assertCondition(
        deniedCrossTenantBillingWrite,
        `Contexto tenant A conseguiu escrever billing do tenant B: ${crossTenantBillingWriteError?.message ?? "insert succeeded"}`
      );

      await client.query(
        "insert into platform_admins (id, user_id, status) values ($1, $2, 'active')",
        [platformAdminId, userId]
      );
      await client.query(
        "insert into platform_admin_grants (platform_admin_id, role, reason) values ($1, 'owner', $2)",
        [platformAdminId, "RLS runtime smoke"]
      );
      await client.query("select set_config($1, $2, true)", [
        "app.organization_id",
        "",
      ]);
      await client.query("select set_config($1, $2, true)", [
        "app.platform_admin_id",
        platformAdminId,
      ]);

      const platformAdminVisible = await client.query(
        `
          select
            (select count(*)::int from organization where id = any($1::text[])) as organizations,
            (select count(*)::int from billing_subscriptions where id = any($2::uuid[])) as billing_subscriptions
        `,
        [
          [organizationId, otherOrganizationId],
          [billingSubscriptionId, otherBillingSubscriptionId],
        ]
      );
      const platformAdminVisibleRow = platformAdminVisible.rows[0];

      assertCondition(
        platformAdminVisibleRow.organizations === 2 &&
          platformAdminVisibleRow.billing_subscriptions === 2,
        "Platform admin ativo nao conseguiu ler o escopo administrativo permitido."
      );

      const organizationUpdate = await client.query(
        "update organization set updated_at = updated_at where id = $1",
        [otherOrganizationId]
      );
      const subscriptionUpdate = await client.query(
        "update billing_subscriptions set updated_at = updated_at where id = $1",
        [otherBillingSubscriptionId]
      );

      assertCondition(
        organizationUpdate.rowCount === 1 && subscriptionUpdate.rowCount === 1,
        "Platform admin ativo nao conseguiu executar as mutacoes administrativas permitidas."
      );

      const platformCategoryUpdate = await client.query(
        "update categories set name = name where organization_id = $1",
        [otherOrganizationId]
      );

      assertCondition(
        platformCategoryUpdate.rowCount === 0,
        "Platform admin conseguiu escrever em tabela permitida somente para leitura."
      );
    } finally {
      await client.query("rollback");
    }

    console.log(
      JSON.stringify(
        {
          currentUser: baselineRow.current_user,
          forcedTables: `${baselineRow.forced_count}/${RLS_TABLES.length}`,
          policies: baselineRow.policy_count,
          platformAdminCheck: "ok",
          result: "rls-runtime-smoke-ok",
          tenantCrossCheck: "ok",
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
