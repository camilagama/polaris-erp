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

export const normalizeBillingStatus = (
  value: string | null | undefined
): BillingSubscriptionStatus => {
  const normalized = value?.trim().toLowerCase();

  if (isBillingSubscriptionStatus(normalized)) {
    return normalized;
  }

  return "incomplete";
};
