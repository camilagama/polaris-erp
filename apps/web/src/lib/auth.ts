import "server-only";
import { dash, sentinel } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import {
  oneTap,
  organization as organizationPlugin,
} from "better-auth/plugins";
import { db } from "@/db";
import {
  accounts,
  invitation,
  member,
  organization,
  sessions,
  users,
  verifications,
} from "@/db/schema";
import { recordAuthLoginAuditEvent } from "@/lib/auth-audit";
import { serverEnv } from "@/lib/env";
import {
  rejectWorkspaceOrganizationUpdate,
  rejectWorkspaceUserManagement,
} from "@/lib/workspace-management-policy";

const googleClientId = serverEnv.GOOGLE_CLIENT_ID;
const googleClientSecret = serverEnv.GOOGLE_CLIENT_SECRET;
const googlePublicClientId = serverEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const hasGoogleAuth =
  typeof googleClientId === "string" && typeof googleClientSecret === "string";

if (!hasGoogleAuth && serverEnv.NODE_ENV === "production") {
  throw new Error(
    "Google auth must be configured in production and staging environments."
  );
}

if (
  serverEnv.NODE_ENV === "production" &&
  (!googlePublicClientId || googlePublicClientId !== googleClientId)
) {
  throw new Error(
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID must match GOOGLE_CLIENT_ID in production and staging environments."
  );
}

const getTrustedOrigins = () => {
  const origins = new Set<string>([
    new URL(serverEnv.BETTER_AUTH_URL).origin,
    new URL(serverEnv.NEXT_PUBLIC_APP_URL).origin,
  ]);

  if (serverEnv.NODE_ENV === "development") {
    origins.add("http://127.0.0.1:3000");
    origins.add("http://localhost:3000");
  }

  return [...origins];
};

const socialProviders = hasGoogleAuth
  ? {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
    }
  : {};

const createOrganizationAuthPlugin = () =>
  organizationPlugin({
    allowUserToCreateOrganization: false,
    creatorRole: "owner",
    disableOrganizationDeletion: true,
    membershipLimit: 1,
    organizationHooks: {
      beforeAddMember: rejectWorkspaceUserManagement,
      beforeCreateInvitation: rejectWorkspaceUserManagement,
      beforeRemoveMember: rejectWorkspaceUserManagement,
      beforeUpdateOrganization: rejectWorkspaceOrganizationUpdate,
      beforeUpdateMemberRole: rejectWorkspaceUserManagement,
    },
    requireEmailVerificationOnInvitation: true,
    schema: {
      organization: {
        additionalFields: {
          status: {
            defaultValue: "active",
            input: false,
            required: true,
            type: "string",
          },
        },
      },
    },
  });

const authPlugins = [
  dash({
    apiKey: serverEnv.BETTER_AUTH_API_KEY,
  }),
  sentinel({
    apiKey: serverEnv.BETTER_AUTH_API_KEY,
  }),
  ...(hasGoogleAuth
    ? [
        oneTap({
          clientId: googleClientId,
          disableSignup: false,
        }),
      ]
    : []),
  createOrganizationAuthPlugin(),
  nextCookies(),
];

interface AuthHookContext {
  body?: unknown;
  path?: string;
}

interface AuthSessionHookPayload {
  activeOrganizationId?: unknown;
  id?: string;
  userId?: string;
}

export const auth = betterAuth({
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL: serverEnv.BETTER_AUTH_URL,
  basePath: "/api/auth",
  disabledPaths: ["/sign-in/email", "/sign-up/email"],
  trustedOrigins: getTrustedOrigins(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      accounts,
      invitation,
      member,
      organization,
      sessions,
      users,
      verifications,
    },
    usePlural: true,
  }),
  databaseHooks: {
    session: {
      create: {
        after: async (
          session: AuthSessionHookPayload,
          context: AuthHookContext | null
        ) => {
          await recordAuthLoginAuditEvent({ context, session });
        },
      },
    },
  } as never,
  emailAndPassword: {
    enabled: false,
  },
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: false,
      disableImplicitLinking: false,
      trustedProviders: ["google"],
    },
  },
  socialProviders,
  // Better Auth recommends nextCookies() as the final plugin so
  // Server Actions always receive the final Set-Cookie handling.
  plugins: authPlugins,
});
