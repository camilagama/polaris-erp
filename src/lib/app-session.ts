import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  auditEvents,
  categories,
  member,
  organization,
  sessions,
  systemSettings,
} from "@/db/schema";
import { OTHERS_CATEGORY_KEY } from "@/features/catalog/constants";
import {
  type AppPermission,
  canRolePerform,
  ORGANIZATION_ROLES,
  type OrganizationRole,
  resolveDefaultOrganizationSlug,
} from "@/lib/app-context";

const DEFAULT_CATEGORY_NAME = "Outros";
const DEFAULT_CARD_INSTALLMENT_RULES = [{ feePercent: 0, installments: 1 }];
const DEFAULT_IDEAL_MARKUP_PERCENT = 0;
const DEFAULT_MINIMUM_MARKUP_PERCENT = 0;
const GLOBAL_SETTINGS_ID = "global";

export interface AppContext {
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
  const { db } = await import("@/db");
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
  const baseWhere = activeOrganizationId
    ? and(
        eq(member.userId, userId),
        eq(member.organizationId, activeOrganizationId)
      )
    : eq(member.userId, userId);

  const [membership] = await db
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

  return membership;
};

const getAppContextFromSession = async (
  session: NonNullable<SessionPayload>
): Promise<AppContext | null> => {
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  if (!("session" in session && session.session)) {
    return {
      organizationId: "org_dg_imports",
      organizationName: "Polaris",
      role: "owner",
      userId,
    };
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
    const db = await getDb();
    await db
      .update(sessions)
      .set({
        activeOrganizationId: membership.organizationId,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, session.session.id));
  }

  return {
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

  return context;
};

export const createInitialOrganizationForUser = async ({
  name,
  userId,
}: {
  name: string;
  userId: string;
}): Promise<string> => {
  const db = await getDb();

  const organizationId = await db.transaction(async (tx) => {
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

    const organizationId = crypto.randomUUID();
    const slugBase = resolveDefaultOrganizationSlug(name);
    const slug = `${slugBase}-${organizationId.slice(0, 8)}`;

    await tx.insert(organization).values({
      id: organizationId,
      name: name.trim(),
      slug,
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
