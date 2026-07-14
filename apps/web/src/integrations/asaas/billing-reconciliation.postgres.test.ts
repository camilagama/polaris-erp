import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { reconcileAsaasBillingEvent } from "@/integrations/asaas/billing-reconciliation";

vi.mock("server-only", () => ({}));

const databaseUrl = process.env.POSTGRES_BEHAVIOR_DATABASE_URL;
const behaviorDescribe = databaseUrl ? describe : describe.skip;
const organizationId = `asaas-concurrency-${randomUUID()}`;
const planId = `asaas-concurrency-plan-${randomUUID()}`;
const subscriptionId = randomUUID();
const paymentId = `asaas-payment-${randomUUID()}`;
const providerEventId = `asaas-event-${randomUUID()}`;

behaviorDescribe("Asaas billing reconciliation on PostgreSQL", () => {
  const pool = new Pool({ connectionString: databaseUrl });

  beforeAll(async () => {
    if (!databaseUrl) {
      throw new Error("POSTGRES_BEHAVIOR_DATABASE_URL is required.");
    }

    process.env.DATABASE_URL = databaseUrl;

    await pool.query(
      "INSERT INTO organization (id, name, slug) VALUES ($1, $2, $3)",
      [organizationId, "Asaas concurrency", organizationId]
    );
    await pool.query(
      "INSERT INTO billing_plans (id, name, interval, amount_cents, entitlements) VALUES ($1, $2, 'month', 0, '[]'::jsonb)",
      [planId, "Asaas concurrency plan"]
    );
    await pool.query(
      "INSERT INTO billing_subscriptions (id, organization_id, plan_id, status) VALUES ($1, $2, $3, 'incomplete')",
      [subscriptionId, organizationId, planId]
    );
  });

  afterAll(async () => {
    await pool.query("DELETE FROM organization WHERE id = $1", [
      organizationId,
    ]);
    await pool.end();
  });

  it("creates one invoice, link and attempt for concurrent deliveries", async () => {
    const { withInternalJobContext } = await import(
      "@polaris/db/tenant-context"
    );
    const payload = {
      event: "PAYMENT_RECEIVED",
      id: providerEventId,
      payment: {
        externalReference: `billing-subscription:${subscriptionId}`,
        id: paymentId,
        status: "RECEIVED",
        value: 49.9,
      },
    };

    const results = await Promise.all(
      Array.from(
        { length: 2 },
        async () =>
          await withInternalJobContext(
            "billing_webhook_reconcile",
            async (tx) =>
              await reconcileAsaasBillingEvent(tx, payload, providerEventId)
          )
      )
    );

    expect(results).toEqual(["processed", "processed"]);

    const [invoice, link, attempt] = await Promise.all([
      pool.query<{ count: string }>(
        "SELECT count(*) FROM billing_invoices WHERE billing_subscription_id = $1",
        [subscriptionId]
      ),
      pool.query<{ count: string }>(
        "SELECT count(*) FROM billing_provider_links WHERE provider = 'asaas' AND entity_type = 'invoice' AND external_id = $1",
        [paymentId]
      ),
      pool.query<{ count: string }>(
        "SELECT count(*) FROM billing_payment_attempts WHERE provider = 'asaas' AND provider_event_id = $1",
        [providerEventId]
      ),
    ]);

    expect(invoice.rows[0]?.count).toBe("1");
    expect(link.rows[0]?.count).toBe("1");
    expect(attempt.rows[0]?.count).toBe("1");
  });
});
