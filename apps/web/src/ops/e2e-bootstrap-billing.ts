import "server-only";

import {
  PAID_MONTHLY_PLAN_ENTITLEMENTS,
  PAID_MONTHLY_PLAN_ID,
  toBillingEntitlementList,
} from "@polaris/billing";

const E2E_BILLING_PLAN = {
  amountCents: 4990,
  currency: "BRL",
  entitlements: toBillingEntitlementList(PAID_MONTHLY_PLAN_ENTITLEMENTS),
  id: PAID_MONTHLY_PLAN_ID,
  interval: "month",
  name: "Polaris Mensal",
  status: "active",
};

export const ensureE2EBillingPlan = async () => {
  const [{ db }, { billingPlans }] = await Promise.all([
    import("@polaris/db"),
    import("@polaris/db/schema"),
  ]);

  await db.insert(billingPlans).values(E2E_BILLING_PLAN).onConflictDoNothing();
};
