export const BILLING_SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "paused",
  "canceled",
  "incomplete",
] as const;

export const BILLING_INVOICE_STATUSES = [
  "draft",
  "open",
  "paid",
  "void",
  "uncollectible",
] as const;

export const BILLING_PAYMENT_ATTEMPT_STATUSES = [
  "pending",
  "processing",
  "succeeded",
  "failed",
] as const;

export type BillingSubscriptionStatus =
  (typeof BILLING_SUBSCRIPTION_STATUSES)[number];

export type BillingInvoiceStatus = (typeof BILLING_INVOICE_STATUSES)[number];

export type BillingPaymentAttemptStatus =
  (typeof BILLING_PAYMENT_ATTEMPT_STATUSES)[number];

export interface BillingEntitlement {
  key: string;
  value: boolean | number | string;
}

export interface PlanEntitlements {
  maxActiveGoals: number;
  maxImagesPerProduct: number;
  maxRegisteredProducts: number;
}

export const FREE_PLAN_ID = "polaris-free";
export const PAID_MONTHLY_PLAN_ID = "polaris-paid-monthly";

export const FREE_PLAN_ENTITLEMENTS: PlanEntitlements = {
  maxActiveGoals: 1,
  maxImagesPerProduct: 1,
  maxRegisteredProducts: 50,
};

export const PAID_MONTHLY_PLAN_ENTITLEMENTS: PlanEntitlements = {
  maxActiveGoals: 3,
  maxImagesPerProduct: 5,
  maxRegisteredProducts: 250,
};

export const BILLING_GRACE_PERIOD_DAYS = 7;

export type BillingLifecycleTransition = "downgrade_to_free" | "none";

export interface BillingLifecycleInput {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt: Date | null;
  now: Date;
  status: BillingSubscriptionStatus;
}

export const resolveBillingLifecycleTransition = ({
  cancelAtPeriodEnd,
  currentPeriodEnd,
  gracePeriodEndsAt,
  now,
  status,
}: BillingLifecycleInput): BillingLifecycleTransition => {
  if (status === "past_due") {
    return gracePeriodEndsAt && gracePeriodEndsAt <= now
      ? "downgrade_to_free"
      : "none";
  }

  if (
    status === "active" &&
    cancelAtPeriodEnd &&
    currentPeriodEnd &&
    currentPeriodEnd <= now
  ) {
    return "downgrade_to_free";
  }

  return "none";
};

export const getGracePeriodEnd = (from: Date): Date => {
  const gracePeriodEnd = new Date(from);
  gracePeriodEnd.setUTCDate(
    gracePeriodEnd.getUTCDate() + BILLING_GRACE_PERIOD_DAYS
  );

  return gracePeriodEnd;
};

export const toBillingEntitlementList = (
  entitlements: PlanEntitlements
): BillingEntitlement[] => [
  {
    key: "catalog.products.limit",
    value: entitlements.maxRegisteredProducts,
  },
  {
    key: "goals.active.limit",
    value: entitlements.maxActiveGoals,
  },
  {
    key: "product.images.limit",
    value: entitlements.maxImagesPerProduct,
  },
];

const isBillingSubscriptionStatus = (
  value: string | undefined
): value is BillingSubscriptionStatus =>
  BILLING_SUBSCRIPTION_STATUSES.some((status) => status === value);

const ACTIVE_ACCESS_STATUSES = new Set<BillingSubscriptionStatus>(["active"]);

export const hasBillableAccess = (status: BillingSubscriptionStatus): boolean =>
  ACTIVE_ACCESS_STATUSES.has(status);

export const getEntitlementValue = (
  entitlements: BillingEntitlement[],
  key: string
): BillingEntitlement["value"] | null => {
  const entitlement = entitlements.find((item) => item.key === key);

  return entitlement?.value ?? null;
};

const getPositiveIntegerEntitlement = (
  entitlements: BillingEntitlement[],
  key: string,
  fallback: number
): number => {
  const value = getEntitlementValue(entitlements, key);

  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : fallback;
};

export const resolvePlanEntitlements = (
  entitlements: BillingEntitlement[]
): PlanEntitlements => ({
  maxActiveGoals: getPositiveIntegerEntitlement(
    entitlements,
    "goals.active.limit",
    FREE_PLAN_ENTITLEMENTS.maxActiveGoals
  ),
  maxImagesPerProduct: getPositiveIntegerEntitlement(
    entitlements,
    "product.images.limit",
    FREE_PLAN_ENTITLEMENTS.maxImagesPerProduct
  ),
  maxRegisteredProducts: getPositiveIntegerEntitlement(
    entitlements,
    "catalog.products.limit",
    FREE_PLAN_ENTITLEMENTS.maxRegisteredProducts
  ),
});

export const normalizeBillingStatus = (
  value: string | null | undefined
): BillingSubscriptionStatus => {
  const normalized = value?.trim().toLowerCase();

  if (isBillingSubscriptionStatus(normalized)) {
    return normalized;
  }

  return "incomplete";
};
