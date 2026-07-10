import "server-only";

import {
  type BillingSubscriptionStatus,
  hasBillableAccess,
  normalizeBillingStatus,
} from "@polaris/billing";
import {
  auditEvents,
  billingCustomers,
  billingPlans,
  billingSubscriptions,
  categories,
  member,
  organization,
  sessions,
  systemSettings,
} from "@polaris/db/schema";
import { setTenantContext, setUserContext } from "@polaris/db/tenant-context";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  type AppPermission,
  canRolePerform,
  ORGANIZATION_ROLES,
  type OrganizationRole,
  resolveDefaultOrganizationSlug,
} from "@/lib/app-context";
import { OTHERS_CATEGORY_KEY } from "@/lib/catalog-defaults";

const DEFAULT_CATEGORY_NAME = "Outros";
const DEFAULT_CARD_INSTALLMENT_RULES = [{ feePercent: 0, installments: 1 }];
const DEFAULT_IDEAL_MARKUP_PERCENT = 0;
const DEFAULT_MINIMUM_MARKUP_PERCENT = 0;
const GLOBAL_SETTINGS_ID = "global";
const ONBOARDING_LOCK_NAMESPACE = 208_544;

export interface AppContext {
  billingStatus: BillingSubscriptionStatus | null;
  hasBillableAccess: boolean;
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
  userId: string;
}

const isOrganizationRole = (value: string): value is OrganizationRole =>
  ORGANIZATION_ROLES.includes(value as OrganizationRole);

const normalizeRole = (value: string): OrganizationRole =>
  isOrganizationRole(value) ? value : "operator";

const getDb = async () => {
  const { db } = await import("@polaris/db");
  return db;
};

type SessionPayload = Awaited<
  ReturnType<typeof import("@/lib/session").getSession>
>;

const getSession = async () => {
  const sessionModule = await import("@/lib/session");
  return sessionModule.getSession();
};

const shouldActivateBillingForE2E = (): boolean =>
  process.env.NODE_ENV === "production" &&
  process.env.ALLOW_PLAYWRIGHT_BOOTSTRAP === "true" &&
  process.env.VERCEL_ENV !== "preview" &&
  process.env.VERCEL_ENV !== "production" &&
  Boolean(process.env.E2E_DATABASE_URL) &&
  process.env.DATABASE_URL === process.env.E2E_DATABASE_URL;

const resolveMembership = async ({
  activeOrganizationId,
  userId,
}: {
  activeOrganizationId: string | null | undefined;
  userId: string;
}) => {
  const db = await getDb();
  const membership = await db.transaction(async (tx) => {
    await setUserContext(tx, userId);

    const baseWhere = activeOrganizationId
      ? and(
          eq(member.userId, userId),
          eq(member.organizationId, activeOrganizationId)
        )
      : eq(member.userId, userId);

    const [row] = await tx
      .select({
        organizationId: member.organizationId,
        organizationName: organization.name,
        organizationStatus: organization.status,
        role: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(baseWhere)
      .orderBy(asc(member.createdAt))
      .limit(1);

    return row;
  });

  return membership;
};

const resolveBillingStatus = async (organizationId: string) => {
  const db = await getDb();
  const [row] = await db.transaction(async (tx) => {
    await setTenantContext(tx, organizationId);

    return tx
      .select({
        status: billingSubscriptions.status,
      })
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.organizationId, organizationId))
      .orderBy(
        sql`case when ${billingSubscriptions.status} in ('trialing', 'active', 'past_due') then 0 when ${billingSubscriptions.status} = 'incomplete' then 1 else 2 end`,
        desc(billingSubscriptions.createdAt)
      )
      .limit(1);
  });

  return row ? normalizeBillingStatus(row.status) : null;
};

const ensureSessionActiveOrganization = async ({
  organizationId,
  sessionId,
}: {
  organizationId: string;
  sessionId: string;
}) => {
  const db = await getDb();
  await db
    .update(sessions)
    .set({
      activeOrganizationId: organizationId,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId));
};

const getAppContextFromSession = async (
  session: NonNullable<SessionPayload>
): Promise<AppContext | null> => {
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  if (!("session" in session && session.session)) {
    return null;
  }

  const activeOrganizationId = (
    session.session as { activeOrganizationId?: string | null }
  ).activeOrganizationId;
  const membership = await resolveMembership({ activeOrganizationId, userId });

  if (!membership) {
    return null;
  }

  if (membership.organizationStatus !== "active") {
    return null;
  }

  if (activeOrganizationId !== membership.organizationId) {
    await ensureSessionActiveOrganization({
      organizationId: membership.organizationId,
      sessionId: session.session.id,
    });
  }

  const billingStatus = await resolveBillingStatus(membership.organizationId);

  return {
    billingStatus,
    hasBillableAccess: billingStatus ? hasBillableAccess(billingStatus) : false,
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
    role: normalizeRole(membership.role),
    userId,
  };
};

export const getAppContext = async (): Promise<AppContext | null> => {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return getAppContextFromSession(session);
};

export const requireAppContext = async (
  permission?: AppPermission
): Promise<AppContext> => {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  const context = await getAppContextFromSession(session);

  if (!context) {
    throw new Error("Organizacao ativa nao encontrada. Conclua o onboarding.");
  }

  if (!context.hasBillableAccess) {
    throw new Error("Assinatura ativa necessaria para acessar o Polaris.");
  }

  if (permission && !canRolePerform(context.role, permission)) {
    throw new Error("Voce nao tem permissao para executar esta acao.");
  }

  return context;
};

export const requirePageAppContext = async (): Promise<AppContext> => {
  const context = await getAppContext();

  if (!context) {
    redirect("/onboarding");
  }

  if (!context.hasBillableAccess) {
    redirect("/billing-required");
  }

  return context;
};

export const createInitialOrganizationForUser = async ({
  billingEmail,
  organizationName,
  userId,
}: {
  billingEmail?: string | null;
  organizationName: string;
  userId: string;
}): Promise<string> => {
  const normalizedOrganizationName = organizationName.trim();

  if (!normalizedOrganizationName) {
    throw new Error("Nome da workspace e obrigatorio.");
  }

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

    const baseSlug = resolveDefaultOrganizationSlug(normalizedOrganizationName);
    const [existingSlug] = await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, baseSlug))
      .limit(1);
    const organizationSlug = existingSlug
      ? `${baseSlug}-${organizationId.slice(0, 8)}`
      : baseSlug;

    await tx.insert(organization).values({
      id: organizationId,
      name: normalizedOrganizationName,
      slug: organizationSlug,
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
