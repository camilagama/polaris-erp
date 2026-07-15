import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schemaSource = readFileSync(
  join(process.cwd(), "../../packages/db/src/schema.ts"),
  "utf8"
);

describe("billing schema", () => {
  it("models canonical billing tables before provider adapters", () => {
    expect(schemaSource).toContain('"billing_plans"');
    expect(schemaSource).toContain('"billing_customers"');
    expect(schemaSource).toContain('"billing_subscriptions"');
    expect(schemaSource).toContain('"billing_checkout_sessions"');
    expect(schemaSource).toContain('"billing_invoices"');
    expect(schemaSource).toContain('"billing_payment_attempts"');
    expect(schemaSource).toContain('"billing_provider_links"');
    expect(schemaSource).toContain('status: text("status")');
    expect(schemaSource).toContain(
      'providerEventId: text("provider_event_id")'
    );
    expect(schemaSource).toContain('cardBrand: text("card_brand")');
    expect(schemaSource).toContain('cardLast4: text("card_last4")');
    expect(schemaSource).toContain('acceptedAt: timestamp("accepted_at", tz)');
    expect(schemaSource).toContain(
      'providerOccurredAt: timestamp("provider_occurred_at", tz)'
    );
    expect(schemaSource).toContain('attemptCount: integer("attempt_count")');
    expect(schemaSource).toContain(
      'nextAttemptAt: timestamp("next_attempt_at", tz)'
    );
    expect(schemaSource).toContain(
      "'pending', 'accepted', 'failed', 'delivered', 'bounced', 'suppressed'"
    );
    expect(schemaSource).toContain(
      "billing_provider_links_provider_entity_external_unique_idx"
    );
    expect(schemaSource).toContain(
      "billing_provider_links_card_last4_safe_check"
    );
    expect(schemaSource).toContain(
      "billing_checkout_sessions_one_open_per_organization_idx"
    );
    expect(schemaSource).toContain(
      "billing_checkout_sessions_organization_idempotency_unique_idx"
    );
    expect(schemaSource).not.toContain("woovi_correlation");
    expect(schemaSource).not.toContain("asaas_subscription");
  });
});
