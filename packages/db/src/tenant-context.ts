import { sql } from "drizzle-orm";
import { db } from "./index";

export type TenantTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export const setTenantContext = async (
  tx: TenantTransaction,
  organizationId: string
): Promise<void> => {
  await tx.execute(
    sql`select set_config('app.organization_id', ${organizationId}, true)`
  );
};

export const setUserContext = async (
  tx: TenantTransaction,
  userId: string
): Promise<void> => {
  await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
};

export const setAdminUserContext = async (
  tx: TenantTransaction,
  adminUserId: string
): Promise<void> => {
  await tx.execute(
    sql`select set_config('app.admin_user_id', ${adminUserId}, true)`
  );
};

export const setPlatformAdminContext = async (
  tx: TenantTransaction,
  platformAdminId: string
): Promise<void> => {
  await tx.execute(
    sql`select set_config('app.platform_admin_id', ${platformAdminId}, true)`
  );
};

export type InternalJobContext =
  | "auth_audit"
  | "billing_checkout"
  | "billing_lifecycle"
  | "billing_webhook_reconcile"
  | "goal_resolution"
  | "platform_admin_bootstrap"
  | "platform_admin_admission"
  | "platform_admin_grant_management"
  | "product_image_reconcile"
  | "stock_ledger_reconciliation";

const setInternalJobContext = async (
  tx: TenantTransaction,
  job: InternalJobContext
): Promise<void> => {
  await tx.execute(sql`select set_config('app.internal_job', ${job}, true)`);
};

export const withTenantContext = async <T>(
  organizationId: string,
  callback: (tx: TenantTransaction) => Promise<T> | T
): Promise<T> =>
  db.transaction(async (tx) => {
    await setTenantContext(tx, organizationId);
    return callback(tx);
  });

export const withUserContext = async <T>(
  userId: string,
  callback: (tx: TenantTransaction) => Promise<T> | T
): Promise<T> =>
  db.transaction(async (tx) => {
    await setUserContext(tx, userId);
    return callback(tx);
  });

export const withAdminUserContext = async <T>(
  adminUserId: string,
  callback: (tx: TenantTransaction) => Promise<T> | T
): Promise<T> =>
  db.transaction(async (tx) => {
    await setAdminUserContext(tx, adminUserId);
    return callback(tx);
  });

export const withPlatformAdminContext = async <T>(
  platformAdminId: string,
  callback: (tx: TenantTransaction) => Promise<T> | T
): Promise<T> =>
  db.transaction(async (tx) => {
    await setPlatformAdminContext(tx, platformAdminId);
    return callback(tx);
  });

export const withInternalJobContext = async <T>(
  job: InternalJobContext,
  callback: (tx: TenantTransaction) => Promise<T> | T
): Promise<T> =>
  db.transaction(async (tx) => {
    await setInternalJobContext(tx, job);
    return callback(tx);
  });
