import { createSessionHelpers } from "@polaris/auth/session";
import { db } from "@polaris/db";
import { adminSessions } from "@polaris/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { hasExceededAdminSessionLifetime } from "./admin-session";

const { getSession: getRawSession } = createSessionHelpers({ auth });

type AdminSession = Awaited<ReturnType<typeof getRawSession>>;

const getSessionCreatedAt = (session: AdminSession): Date | null => {
  const createdAt = session?.session?.createdAt;

  if (createdAt instanceof Date) {
    return createdAt;
  }

  if (typeof createdAt === "string") {
    const date = new Date(createdAt);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

export const getSession = async (): Promise<AdminSession> => {
  const session = await getRawSession();
  const createdAt = getSessionCreatedAt(session);

  if (session && createdAt && hasExceededAdminSessionLifetime(createdAt)) {
    await db.delete(adminSessions).where(eq(adminSessions.id, session.session.id));
    return null;
  }

  return session;
};
