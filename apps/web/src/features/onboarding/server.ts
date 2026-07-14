import "server-only";

import {
  auditEvents,
  billingCustomers,
  billingPlans,
  billingSubscriptions,
  categories,
  member,
  organization,
  systemSettings,
} from "@polaris/db/schema";
import { setTenantContext, setUserContext } from "@polaris/db/tenant-context";
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

const shouldActivateBillingForE2E = (): boolean =>
  process.env.NODE_ENV === "production" &&
  process.env.ALLOW_PLAYWRIGHT_BOOTSTRAP === "true" &&
  process.env.VERCEL_ENV !== "preview" &&
  process.env.VERCEL_ENV !== "production" &&
  Boolean(process.env.E2E_DATABASE_URL) &&
  process.env.DATABASE_URL === process.env.E2E_DATABASE_URL;

export const createInitialOrganizationForUser = async ({
  billingEmail,
  userId,
}: {
  billingEmail?: string | null;
  userId: string;
}): Promise<string> => {
  const db = await getDb();

  const organizationId = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(${ONBOARDING_LOCK_NAMESPACE}, hashtext(${userId}))`
    );
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
      return existingMembership.organizationId;
    }

    const [plan] = await tx
      .select({
        id: billingPlans.id,
      })
      .from(billingPlans)
      .where(eq(billingPlans.status, "active"))
      .orderBy(asc(billingPlans.amountCents), asc(billingPlans.id))
      .limit(1);

    if (!plan) {
      throw new Error("Plano de billing ativo nao encontrado.");
    }

    const organizationId = crypto.randomUUID();
    const billingCustomerId = crypto.randomUUID();
    await setTenantContext(tx, organizationId);

    const technicalName = `Tenant ${organizationId.slice(0, 8)}`;
    const technicalSlug = `tenant-${organizationId}`;

    await tx.insert(organization).values({
      id: organizationId,
      name: technicalName,
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

    await tx.insert(billingSubscriptions).values({
      billingCustomerId,
      organizationId,
      planId: plan.id,
      status: shouldActivateBillingForE2E() ? "active" : "incomplete",
    });

    await tx.insert(auditEvents).values({
      actorUserId: userId,
      organizationId,
      subjectId: organizationId,
      subjectType: "organization",
      type: "organization.created",
    });

    return organizationId;
  });

  return organizationId;
};
