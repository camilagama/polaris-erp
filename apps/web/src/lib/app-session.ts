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
import { getOrganizationProductQuotaStatus } from "@/lib/entitlements";

export interface AppContext {
  billingStatus: BillingSubscriptionStatus | null;
  hasBillableAccess: boolean;
  organizationId: string;
  role: OrganizationRole;
  userId: string;
}

export type AppAccess =
  | {
      context: AppContext;
      kind: "active";
    }
  | {
      kind: "onboarding";
    }
  | {
      kind: "suspended";
    };

const SESSION_ABSOLUTE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

const isOrganizationRole = (value: string): value is OrganizationRole =>
  ORGANIZATION_ROLES.includes(value as OrganizationRole);

const normalizeRole = (value: string): OrganizationRole =>
  isOrganizationRole(value) ? value : "owner";

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

const hasExceededAbsoluteSessionLifetime = (createdAt: unknown): boolean => {
  let createdAtTime = Number.NaN;

  if (createdAt instanceof Date) {
    createdAtTime = createdAt.getTime();
  } else if (typeof createdAt === "string") {
    createdAtTime = Date.parse(createdAt);
  }

  return (
    Number.isFinite(createdAtTime) &&
    createdAtTime + SESSION_ABSOLUTE_LIFETIME_MS <= Date.now()
  );
};

const revokeExpiredSession = async ({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}) => {
  const db = await getDb();

  await db.transaction(async (tx) => {
    await setUserContext(tx, userId);
    await tx
      .update(sessions)
      .set({
        expiresAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));

  });
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

const getAppAccessFromSession = async (
  session: NonNullable<SessionPayload>
): Promise<AppAccess> => {
  const userId = session?.user?.id;

  if (!userId) {
    return { kind: "onboarding" };
  }

  if (!("session" in session && session.session)) {
    return { kind: "onboarding" };
  }

  if (
    hasExceededAbsoluteSessionLifetime(
      (session.session as { createdAt?: unknown }).createdAt
    )
  ) {
    await revokeExpiredSession({
      sessionId: session.session.id,
      userId,
    });
    return { kind: "onboarding" };
  }

  const activeOrganizationId = (
    session.session as { activeOrganizationId?: string | null }
  ).activeOrganizationId;
  const membership = await resolveMembership({ activeOrganizationId, userId });

  if (!membership) {
    return { kind: "onboarding" };
  }

  if (membership.organizationStatus === "suspended") {
    return { kind: "suspended" };
  }

  if (membership.organizationStatus !== "active") {
    return { kind: "onboarding" };
  }

  if (activeOrganizationId !== membership.organizationId) {
    await ensureSessionActiveOrganization({
      organizationId: membership.organizationId,
      sessionId: session.session.id,
    });
  }

  const billingStatus = await resolveBillingStatus(membership.organizationId);

  return {
    context: {
      billingStatus,
      hasBillableAccess: billingStatus
        ? hasBillableAccess(billingStatus)
        : false,
      organizationId: membership.organizationId,
      role: normalizeRole(membership.role),
      userId,
    },
    kind: "active",
  };
};

export const getAppAccess = async (): Promise<AppAccess> => {
  const session = await getSession();

  if (!session) {
    return { kind: "onboarding" };
  }

  return getAppAccessFromSession(session);
};

export const getAppContext = async (): Promise<AppContext | null> => {
  const access = await getAppAccess();
  return access.kind === "active" ? access.context : null;
};

export const requireAppContext = async (
  permission?: AppPermission
): Promise<AppContext> => {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  const access = await getAppAccessFromSession(session);

  if (access.kind === "suspended") {
    throw new Error("Acesso restrito pela plataforma.");
  }

  if (access.kind !== "active") {
    throw new Error("Organizacao ativa nao encontrada. Conclua o onboarding.");
  }

  const { context } = access;

  if (!context.hasBillableAccess) {
    throw new Error("Assinatura ativa necessaria para acessar o Polaris.");
  }

  if (permission && !canRolePerform(context.role, permission)) {
    throw new Error("Voce nao tem permissao para executar esta acao.");
  }

  if (permission === "inventory:write" || permission === "sales:write") {
    const quota = await getOrganizationProductQuotaStatus(
      context.organizationId
    );

    if (quota.isFree && quota.isOverRegisteredProductLimit) {
      throw new Error(
        "O plano Free excedeu o limite de produtos cadastrados. Vendas e estoque permanecem bloqueados ate reduzir o uso ou reativar o plano pago."
      );
    }
  }

  return context;
};

export const requirePageAppContext = async (): Promise<AppContext> => {
  const access = await getAppAccess();

  if (access.kind === "suspended") {
    redirect("/restricted-access");
    return null as never;
  }

  if (access.kind !== "active") {
    redirect("/onboarding");
    return null as never;
  }

  const { context } = access;

  if (!context.hasBillableAccess) {
    redirect("/billing-required");
    return null as never;
  }

  return context;
};
