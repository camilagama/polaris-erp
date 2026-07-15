import "server-only";

import { FREE_PLAN_ID, PAID_MONTHLY_PLAN_ID } from "@polaris/billing";
import {
  auditEvents,
  billingCustomers,
  billingPlans,
  billingProviderLinks,
  billingSubscriptions,
  categories,
  member,
  organization,
  signupCheckoutIntents,
  systemSettings,
  users,
} from "@polaris/db/schema";
import {
  setInternalJobContext,
  setTenantContext,
  setUserContext,
} from "@polaris/db/tenant-context";
import { asc, eq, sql } from "drizzle-orm";
import { OTHERS_CATEGORY_KEY } from "@/lib/catalog-defaults";

const DEFAULT_CATEGORY_NAME = "Outros";
const DEFAULT_CARD_INSTALLMENT_RULES = [{ feePercent: 0, installments: 1 }];
const DEFAULT_IDEAL_MARKUP_PERCENT = 0;
const DEFAULT_MINIMUM_MARKUP_PERCENT = 0;
const GLOBAL_SETTINGS_ID = "global";
const ONBOARDING_LOCK_NAMESPACE = 208_544;

const getDb = async () => {
  const { db } = await import("@polaris/db");
  return db;
};

const normalizeBillingEmail = (
  value: string | null | undefined
): string | null => {
  const normalized = value?.trim().toLowerCase();

  return normalized ? normalized : null;
};

const toRows = (value: unknown): Record<string, unknown>[] => {
  if (typeof value !== "object" || value === null || !("rows" in value)) {
    return [];
  }

  const rows = (value as { rows?: unknown }).rows;

  return Array.isArray(rows)
    ? rows.filter(
        (row): row is Record<string, unknown> =>
          typeof row === "object" && row !== null
      )
    : [];
};

export const createInitialOrganizationForUser = async ({
  billingEmail,
  organizationName,
  userId,
}: {
  billingEmail?: string | null;
  organizationName: string;
  userId: string;
}): Promise<{ organizationId: string; planId: string }> => {
  const db = await getDb();

  const organizationId = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(${ONBOARDING_LOCK_NAMESPACE}, hashtext(${userId}))`
    );
    await setInternalJobContext(tx, "onboarding");
    await setUserContext(tx, userId);

    const [existingMembership] = await tx
      .select({
        organizationId: member.organizationId,
      })
      .from(member)
      .where(eq(member.userId, userId))
      .orderBy(asc(member.createdAt))
      .limit(1);

    if (existingMembership) {
      return {
        organizationId: existingMembership.organizationId,
        planId: FREE_PLAN_ID,
      };
    }

    const canonicalBillingEmail = normalizeBillingEmail(billingEmail);
    const [identity] = canonicalBillingEmail
      ? await tx
          .select({
            emailVerified: users.emailVerified,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)
      : [];
    const [paidSignupIntent] =
      canonicalBillingEmail && identity?.emailVerified
        ? toRows(
            await tx.execute(sql`
            select id, provider, provider_subscription_id as "providerSubscriptionId"
            from signup_checkout_intents
            where billing_email = ${canonicalBillingEmail}
              and plan_id = ${PAID_MONTHLY_PLAN_ID}
              and status = 'paid'
              and claimed_at is null
            order by paid_at asc
            limit 1
            for update
          `)
          )
        : [];
    const selectedPlanId = paidSignupIntent
      ? PAID_MONTHLY_PLAN_ID
      : FREE_PLAN_ID;

    const [plan] = await tx
      .select({
        id: billingPlans.id,
      })
      .from(billingPlans)
      .where(
        sql`${billingPlans.id} = ${selectedPlanId} and ${billingPlans.status} = 'active'`
      )
      .orderBy(asc(billingPlans.id))
      .limit(1);

    if (!plan) {
      throw new Error("Plano de billing ativo nao encontrado.");
    }

    const organizationId = crypto.randomUUID();
    const billingCustomerId = crypto.randomUUID();
    await setTenantContext(tx, organizationId);

    const technicalSlug = `tenant-${organizationId}`;

    await tx.insert(organization).values({
      id: organizationId,
      name: organizationName,
      slug: technicalSlug,
      status: "active",
    });

    await tx.insert(member).values({
      id: crypto.randomUUID(),
      organizationId,
      role: "owner",
      userId,
    });

    await tx.insert(categories).values({
      description: "Categoria padrao protegida pelo sistema.",
      isSystem: true,
      key: OTHERS_CATEGORY_KEY,
      name: DEFAULT_CATEGORY_NAME,
      organizationId,
    });

    await tx.insert(systemSettings).values({
      id: GLOBAL_SETTINGS_ID,
      idealMarkupPercent: DEFAULT_IDEAL_MARKUP_PERCENT.toFixed(2),
      minimumMarkupPercent: DEFAULT_MINIMUM_MARKUP_PERCENT.toFixed(2),
      organizationId,
      paymentFeeRules: DEFAULT_CARD_INSTALLMENT_RULES,
    });

    await tx.insert(billingCustomers).values({
      billingEmail,
      id: billingCustomerId,
      organizationId,
    });

    const billingSubscriptionId = crypto.randomUUID();
    await tx.insert(billingSubscriptions).values({
      billingCustomerId,
      id: billingSubscriptionId,
      organizationId,
      planId: plan.id,
      status: "active",
    });

    if (paidSignupIntent) {
      await tx
        .update(signupCheckoutIntents)
        .set({
          claimedAt: new Date(),
          claimedOrganizationId: organizationId,
          claimedUserId: userId,
        })
        .where(eq(signupCheckoutIntents.id, paidSignupIntent.id as string));

      if (typeof paidSignupIntent.providerSubscriptionId === "string") {
        await tx.insert(billingProviderLinks).values({
          billingSubscriptionId,
          entityType: "subscription",
          externalId: paidSignupIntent.providerSubscriptionId,
          organizationId,
          provider: paidSignupIntent.provider as "asaas",
        });
      }
    }

    await tx.insert(auditEvents).values({
      actorUserId: userId,
      organizationId,
      subjectId: organizationId,
      subjectType: "organization",
      type: "organization.created",
    });

    return { organizationId, planId: plan.id };
  });

  return organizationId;
};
