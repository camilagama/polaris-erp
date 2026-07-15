import "server-only";

import {
  type BillingEntitlement,
  FREE_PLAN_ENTITLEMENTS,
  FREE_PLAN_ID,
  type PlanEntitlements,
  resolvePlanEntitlements,
} from "@polaris/billing";
import {
  billingPlans,
  billingSubscriptions,
  products,
} from "@polaris/db/schema";
import {
  type TenantTransaction,
  withTenantContext,
} from "@polaris/db/tenant-context";
import { and, count, desc, eq, isNull } from "drizzle-orm";

interface ActivePlanRow {
  entitlements: BillingEntitlement[];
  planId: string;
}

const getActivePlan = async (
  tx: TenantTransaction,
  organizationId: string
): Promise<ActivePlanRow | null> => {
  const [subscription] = await tx
    .select({
      entitlements: billingPlans.entitlements,
      planId: billingPlans.id,
    })
    .from(billingSubscriptions)
    .innerJoin(billingPlans, eq(billingSubscriptions.planId, billingPlans.id))
    .where(
      and(
        eq(billingSubscriptions.organizationId, organizationId),
        eq(billingSubscriptions.status, "active"),
        eq(billingPlans.status, "active")
      )
    )
    .orderBy(desc(billingSubscriptions.createdAt))
    .limit(1);

  return subscription
    ? {
        entitlements: subscription.entitlements as BillingEntitlement[],
        planId: subscription.planId,
      }
    : null;
};

export const getOrganizationPlanEntitlements = async (
  tx: TenantTransaction,
  organizationId: string
): Promise<PlanEntitlements> => {
  const subscription = await getActivePlan(tx, organizationId);

  if (!subscription) {
    return FREE_PLAN_ENTITLEMENTS;
  }

  return resolvePlanEntitlements(subscription.entitlements);
};

export const getOrganizationProductQuotaStatus = async (
  organizationId: string
) =>
  withTenantContext(organizationId, async (tx) => {
    const [activePlan, [{ value: registeredProductCount }]] = await Promise.all(
      [
        getActivePlan(tx, organizationId),
        tx
          .select({ value: count() })
          .from(products)
          .where(
            and(
              eq(products.organizationId, organizationId),
              isNull(products.softDeletedAt)
            )
          ),
      ]
    );
    const entitlements = activePlan
      ? resolvePlanEntitlements(activePlan.entitlements)
      : FREE_PLAN_ENTITLEMENTS;

    return {
      isFree: activePlan?.planId === FREE_PLAN_ID || activePlan === null,
      isOverRegisteredProductLimit:
        Number(registeredProductCount ?? 0) >
        entitlements.maxRegisteredProducts,
      maxRegisteredProducts: entitlements.maxRegisteredProducts,
      registeredProductCount: Number(registeredProductCount ?? 0),
    };
  });
