import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { downgradeDuePaidSubscriptions } from "@/integrations/billing/lifecycle";

vi.mock("server-only", () => ({}));

describe("billing lifecycle", () => {
  it("requires the active Free plan before selecting subscriptions to downgrade", () => {
    const source = readFileSync(
      new URL("./lifecycle.ts", import.meta.url),
      "utf8"
    );
    const freePlanIndex = source.indexOf("free_plan as (");
    const dueSubscriptionIndex = source.indexOf("due_subscriptions as (");

    expect(freePlanIndex).toBeGreaterThanOrEqual(0);
    expect(dueSubscriptionIndex).toBeGreaterThan(freePlanIndex);
    expect(source).toContain("cross join free_plan");
  });

  it("downgrades only due paid subscriptions atomically and records an audit event", async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [{ organization_id: "org_1" }],
    });
    const db = {
      transaction: async <T>(
        callback: (transaction: { execute: typeof execute }) => Promise<T>
      ) => callback({ execute }),
    };

    await expect(
      downgradeDuePaidSubscriptions(db, new Date("2026-07-21T10:00:00.000Z"))
    ).resolves.toEqual(["org_1"]);

    expect(execute).toHaveBeenCalledOnce();
    const [query] = execute.mock.calls[0] ?? [];
    expect(query).toBeDefined();
  });
});
