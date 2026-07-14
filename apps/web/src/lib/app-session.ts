import "server-only";

import {
  type BillingSubscriptionStatus,
  hasBillableAccess,
  normalizeBillingStatus,
} from "@polaris/billing";
import {
  billingSubscriptions,
  member,
  organization,
  sessions,
} from "@polaris/db/schema";
import { setTenantContext, setUserContext } from "@polaris/db/tenant-context";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  type AppPermission,
  canRolePerform,
  ORGANIZATION_ROLES,
  type OrganizationRole,
} from "@/lib/app-context";

export interface AppContext {
  billingStatus: BillingSubscriptionStatus | null;
  hasBillableAccess: boolean;
  organizationId: string;
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
        sql`case when ${billingSubscriptions.status} = 'active' then 0 when ${billingSubscriptions.status} = 'incomplete' then 1 else 2 end`,
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
