import "server-only";

import { db } from "@polaris/db";
import {
  adminAccounts,
  adminSessions,
  adminUsers,
  adminVerifications,
} from "@polaris/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { resolveAdminAuthOptions, type AdminAuthEnvironment } from "./admin-auth-options";

export interface AdminAuthDependencies {
  admitAdminSession: (adminUserId: string) => Promise<void>;
  environment?: AdminAuthEnvironment;
  hasActiveEnrollment: (email: string) => Promise<boolean>;
}

export const createAdminAuth = ({
  admitAdminSession,
  environment = process.env,
  hasActiveEnrollment,
}: AdminAuthDependencies) => {
  const { baseUrl, hasGoogleAuth, secret } = resolveAdminAuthOptions(environment);
  const clientId = environment.ADMIN_GOOGLE_CLIENT_ID?.trim();
  const clientSecret = environment.ADMIN_GOOGLE_CLIENT_SECRET?.trim();

  return betterAuth({
    advanced: {
      cookiePrefix: "polaris_admin",
    },
    basePath: "/api/auth",
    baseURL: baseUrl,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        account: adminAccounts,
        session: adminSessions,
        user: adminUsers,
        verification: adminVerifications,
      },
      // Admin model names are already physical plural table names. Enabling
      // usePlural would pluralize them a second time (e.g. admin_verificationss).
      usePlural: false,
    }),
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            await admitAdminSession(session.userId);
          },
        },
      },
      user: {
        create: {
          before: async (user) => {
            const email = user.email.trim().toLowerCase();

            if (!(await hasActiveEnrollment(email))) {
              throw new APIError("FORBIDDEN", {
                message: "Esta conta nao esta autorizada para o admin.",
              });
            }

            return { data: { ...user, email } };
          },
        },
      },
    },
    emailAndPassword: {
      enabled: false,
    },
    plugins: [nextCookies()],
    secret,
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    socialProviders: hasGoogleAuth
      ? {
          google: {
            clientId: clientId as string,
            clientSecret: clientSecret as string,
            disableImplicitSignUp: true,
          },
        }
      : {},
    trustedOrigins: [baseUrl],
  });
};
