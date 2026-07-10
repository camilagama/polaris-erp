import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  mapWooviSubscriptionStatus,
  reconcileWooviBillingEvent,
} from "@/integrations/woovi/billing-reconciliation";

vi.mock("server-only", () => ({}));

const source = readFileSync(
  join(
    process.cwd(),
    "src",
    "integrations",
    "woovi",
    "billing-reconciliation.ts"
  ),
  "utf8"
);

const createDb = () => {
  const execute = vi
    .fn()
    .mockResolvedValueOnce({
      rows: [
        {
          id: "00000000-0000-0000-0000-000000000001",
          organization_id: "org_1",
        },
      ],
    })
    .mockResolvedValue({ rows: [] });

  return { execute };
};

describe("Woovi billing reconciliation", () => {
  it("maps known Pix Automatic events to canonical subscription statuses", () => {
    expect(
      mapWooviSubscriptionStatus({
        correlationID: "corr-1",
        event: "PIX_AUTOMATIC_APPROVED",
        globalID: "global-1",
        paymentSubscriptionGlobalID: "subscription-1",
        status: "ACTIVE",
        value: 100,
      })
    ).toBe("active");
    expect(
      mapWooviSubscriptionStatus({
        correlationID: "corr-1",
        event: "PIX_AUTOMATIC_COBR_REJECTED",
        globalID: "global-1",
        paymentSubscriptionGlobalID: "subscription-1",
        status: "CANCEL",
        value: 100,
      })
    ).toBe("past_due");
  });

  it("reconciles known Woovi events into canonical billing without duplicate attempts", async () => {
    const db = createDb();

    await expect(
      reconcileWooviBillingEvent(
        db,
        {
          correlationID:
            "billing-subscription:00000000-0000-0000-0000-000000000001",
          event: "PIX_AUTOMATIC_COBR_COMPLETED",
          globalID: "installment-1",
          paymentSubscriptionGlobalID: "subscription-1",
          status: "COMPLETED",
          value: 4900,
        },
        "installment-1"
      )
    ).resolves.toBe("processed");

    expect(db.execute).toHaveBeenCalled();
    expect(source).toContain("billing_provider_links");
    expect(source).toContain("billing_payment_attempts");
    expect(source).toContain("on conflict (provider, provider_event_id)");
  });

  it("keeps unknown events in manual review", async () => {
    const db = createDb();

    await expect(
      reconcileWooviBillingEvent(
        db,
        {
          correlationID:
            "billing-subscription:00000000-0000-0000-0000-000000000001",
          event: "PIX_AUTOMATIC_NEW_UNKNOWN_EVENT",
        },
        "unknown-1"
      )
    ).resolves.toBe("review");
  });
});
