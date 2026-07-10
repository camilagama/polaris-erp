import "server-only";

import { db } from "@polaris/db";
import { platformAdminGrants, platformAdmins } from "@polaris/db/schema";
import { and, eq, gt, isNull, or } from "drizzle-orm";

type PlatformAdminRole = "owner" | "operator" | "support";

interface PlatformAdminGrantRow {
  platformAdminId: string;
  role: PlatformAdminRole;
  userId: string;
}

interface SessionLike {
  user?: {
    id?: string;
  };
}

export interface PlatformAdminContext {
  platformAdminId: string;
  role: PlatformAdminRole;
  userId: string;
}

export interface PlatformAdminOptions {
  minimumRole?: PlatformAdminRole;
}

export interface PlatformAdminAuthDependencies {
  getSession: () => Promise<SessionLike | null>;
}

const roleRank: Record<PlatformAdminRole, number> = {
  operator: 2,
  owner: 3,
  support: 1,
};

const isPlatformAdminRole = (value: string): value is PlatformAdminRole =>
  value === "owner" || value === "operator" || value === "support";

const isPlatformAdminGrantRow = (row: {
  platformAdminId: string;
  role: string;
  userId: string;
}): row is PlatformAdminGrantRow => isPlatformAdminRole(row.role);

const getStrongestGrant = (
  rows: Array<{
    platformAdminId: string;
    role: string;
    userId: string;
  }>
) => {
  const validRows = rows.filter(isPlatformAdminGrantRow);

  return validRows.reduce<(typeof validRows)[number] | null>(
    (strongest, row) => {
      if (!strongest || roleRank[row.role] > roleRank[strongest.role]) {
        return row;
      }

      return strongest;
    },
    null
  );
};

const hasMinimumRole = (
  role: PlatformAdminRole,
  minimumRole: PlatformAdminRole
): boolean => roleRank[role] >= roleRank[minimumRole];

export const createPlatformAdminAuth = ({
  getSession,
}: PlatformAdminAuthDependencies) => {
  const getPlatformAdminContext =
    async (): Promise<PlatformAdminContext | null> => {
      const session = await getSession();
      const userId = session?.user?.id;

      if (!userId) {
        return null;
      }

      const now = new Date();
      const rows = await db
        .select({
          platformAdminId: platformAdmins.id,
          role: platformAdminGrants.role,
          userId: platformAdmins.userId,
        })
        .from(platformAdmins)
        .innerJoin(
          platformAdminGrants,
          eq(platformAdminGrants.platformAdminId, platformAdmins.id)
        )
        .where(
          and(
            eq(platformAdmins.userId, userId),
            eq(platformAdmins.status, "active"),
            isNull(platformAdminGrants.revokedAt),
            or(
              isNull(platformAdminGrants.expiresAt),
              gt(platformAdminGrants.expiresAt, now)
            )
          )
        );

      const strongestGrant = getStrongestGrant(rows);

      if (!strongestGrant) {
        return null;
      }

      return {
        platformAdminId: strongestGrant.platformAdminId,
        role: strongestGrant.role,
        userId: strongestGrant.userId,
      };
    };

  const requirePlatformAdmin = async ({
    minimumRole = "support",
  }: PlatformAdminOptions = {}): Promise<PlatformAdminContext> => {
    const context = await getPlatformAdminContext();

    if (!context) {
      throw new Error("Acesso interno da plataforma negado.");
    }

    if (!hasMinimumRole(context.role, minimumRole)) {
      throw new Error("Voce nao tem permissao de plataforma suficiente.");
    }

    return context;
  };

  return {
    getPlatformAdminContext,
    requirePlatformAdmin,
  };
};
