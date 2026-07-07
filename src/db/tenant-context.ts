import { sql } from "drizzle-orm";
import { db } from "@/db";

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

export type InternalJobContext = "product_image_reconcile";

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

export const withInternalJobContext = async <T>(
  job: InternalJobContext,
  callback: (tx: TenantTransaction) => Promise<T> | T
): Promise<T> =>
  db.transaction(async (tx) => {
    await setInternalJobContext(tx, job);
    return callback(tx);
  });
