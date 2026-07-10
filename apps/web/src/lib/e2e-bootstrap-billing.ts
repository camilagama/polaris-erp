import "server-only";

const E2E_BILLING_PLAN = {
  amountCents: 9900,
  currency: "BRL",
  entitlements: [
    { key: "catalog.products.limit", value: 500 },
    { key: "support.priority", value: false },
  ],
  id: "polaris-start-monthly",
  interval: "month",
  name: "Polaris Start",
  status: "active",
};

export const ensureE2EBillingPlan = async () => {
  const [{ db }, { billingPlans }] = await Promise.all([
    import("@/db"),
    import("@/db/schema"),
  ]);

  await db.insert(billingPlans).values(E2E_BILLING_PLAN).onConflictDoNothing();
};
