import "server-only";

import {
  type BillingSubscriptionStatus,
  normalizeBillingStatus,
} from "@polaris/billing";
import {
  billingCustomers,
  billingPlans,
  billingSubscriptions,
} from "@polaris/db/schema";
import { withTenantContext } from "@polaris/db/tenant-context";
import { desc, eq, sql } from "drizzle-orm";

export interface AccountBillingSummary {
  amountCents: number | null;
  billingEmail: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  interval: string | null;
  planName: string | null;
  status: BillingSubscriptionStatus | null;
}

export const getAccountBillingSummary = async (
  organizationId: string
): Promise<AccountBillingSummary> => {
  const [row] = await withTenantContext(organizationId, (tx) =>
    tx
      .select({
        amountCents: billingPlans.amountCents,
        billingEmail: billingCustomers.billingEmail,
        cancelAtPeriodEnd: billingSubscriptions.cancelAtPeriodEnd,
        currentPeriodEnd: billingSubscriptions.currentPeriodEnd,
        interval: billingPlans.interval,
        planName: billingPlans.name,
        status: billingSubscriptions.status,
      })
      .from(billingSubscriptions)
      .leftJoin(
        billingCustomers,
        eq(billingSubscriptions.billingCustomerId, billingCustomers.id)
      )
      .leftJoin(billingPlans, eq(billingSubscriptions.planId, billingPlans.id))
      .where(eq(billingSubscriptions.organizationId, organizationId))
      .orderBy(
        sql`case when ${billingSubscriptions.status} = 'active' then 0 when ${billingSubscriptions.status} = 'incomplete' then 1 else 2 end`,
        desc(billingSubscriptions.createdAt)
      )
      .limit(1)
  );

  if (!row) {
    return {
      amountCents: null,
      billingEmail: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      interval: null,
      planName: null,
      status: null,
    };
  }

  return {
    ...row,
    status: normalizeBillingStatus(row.status),
  };
};
