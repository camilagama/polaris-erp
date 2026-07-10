import "server-only";

import { db } from "@polaris/db";
import { sql } from "drizzle-orm";

export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
};
