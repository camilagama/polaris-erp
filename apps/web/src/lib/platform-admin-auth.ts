import "server-only";

import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { platformAdminGrants, platformAdmins } from "@/db/schema";
import {
  type CloudflareAccessIdentity,
  verifyCloudflareAccess,
} from "@/lib/cloudflare-access";

type PlatformAdminRole = "owner" | "operator" | "support";

interface PlatformAdminGrantRow {
  platformAdminId: string;
  role: PlatformAdminRole;
  userId: string;
}

export interface PlatformAdminContext {
  access: CloudflareAccessIdentity | null;
  platformAdminId: string;
  role: PlatformAdminRole;
  userId: string;
}

export interface PlatformAdminOptions {
  minimumRole?: PlatformAdminRole;
  requireAccess?: boolean;
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

const getSession = async () => {
  const sessionModule = await import("@/lib/session");
  return sessionModule.getSession();
};

export const getPlatformAdminContext = async ({
  requireAccess = true,
}: Pick<
  PlatformAdminOptions,
  "requireAccess"
> = {}): Promise<PlatformAdminContext | null> => {
  const session = await getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const access = requireAccess ? await verifyCloudflareAccess() : null;
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
    access,
    platformAdminId: strongestGrant.platformAdminId,
    role: strongestGrant.role,
    userId: strongestGrant.userId,
  };
};

export const requirePlatformAdmin = async ({
  minimumRole = "support",
  requireAccess = true,
}: PlatformAdminOptions = {}): Promise<PlatformAdminContext> => {
  const context = await getPlatformAdminContext({ requireAccess });

  if (!context) {
    throw new Error("Acesso interno da plataforma negado.");
  }

  if (!hasMinimumRole(context.role, minimumRole)) {
    throw new Error("Voce nao tem permissao de plataforma suficiente.");
  }

  return context;
};
