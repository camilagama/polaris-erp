import "server-only";

import { platformAdminGrants, platformAdmins } from "@polaris/db/schema";
import { withAdminUserContext } from "@polaris/db/tenant-context";
import { and, eq, gt, isNull } from "drizzle-orm";

type PlatformAdminRole = "owner" | "operator" | "support";

interface PlatformAdminGrantRow {
  adminUserId: string;
  platformAdminId: string;
  role: PlatformAdminRole;
}

interface SessionLike {
  user?: {
    id?: string;
  };
}

export interface PlatformAdminContext {
  adminUserId: string;
  platformAdminId: string;
  role: PlatformAdminRole;
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
  adminUserId: string;
  platformAdminId: string;
  role: string;
}): row is PlatformAdminGrantRow => isPlatformAdminRole(row.role);

const getStrongestGrant = (
  rows: Array<{
    adminUserId: string;
    platformAdminId: string;
    role: string;
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
      const adminUserId = session?.user?.id;

      if (!adminUserId) {
        return null;
      }

      const now = new Date();
      const rows = await withAdminUserContext(adminUserId, (tx) =>
        tx
          .select({
            adminUserId: platformAdmins.adminUserId,
            platformAdminId: platformAdmins.id,
            role: platformAdminGrants.role,
          })
          .from(platformAdmins)
          .innerJoin(
            platformAdminGrants,
            eq(platformAdminGrants.platformAdminId, platformAdmins.id)
          )
          .where(
            and(
              eq(platformAdmins.adminUserId, adminUserId),
              eq(platformAdmins.status, "active"),
              isNull(platformAdminGrants.revokedAt),
              gt(platformAdminGrants.expiresAt, now)
            )
          )
      );

      const strongestGrant = getStrongestGrant(rows);

      if (!strongestGrant) {
        return null;
      }

      return {
        adminUserId: strongestGrant.adminUserId,
        platformAdminId: strongestGrant.platformAdminId,
        role: strongestGrant.role,
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
