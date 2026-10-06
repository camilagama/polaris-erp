import "server-only";
import { dash, sentinel } from "@better-auth/infra";
import { db } from "@polaris/db";
import {
  accounts,
  invitation,
  member,
  organization,
  sessions,
  users,
  verifications,
} from "@polaris/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import {
  oneTap,
  organization as organizationPlugin,
} from "better-auth/plugins";
import { serverEnv } from "./env";
import {
  rejectWorkspaceOrganizationUpdate,
  rejectWorkspaceUserManagement,
} from "./workspace-management-policy";

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
    origins.add("http://127.0.0.1:3001");
    origins.add("http://localhost:3001");
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
      beforeAcceptInvitation: rejectWorkspaceUserManagement,
      beforeCreateInvitation: rejectWorkspaceUserManagement,
      beforeRemoveMember: rejectWorkspaceUserManagement,
      beforeUpdateOrganization: rejectWorkspaceOrganizationUpdate,
      beforeUpdateMemberRole: rejectWorkspaceUserManagement,
    },
    requireEmailVerificationOnInvitation: true,
    schema: {
      // Keep the plugin's physical table names singular while core models map
      // explicitly to their existing plural physical tables below.
      invitation: {
        modelName: "invitation",
      },
      member: {
        modelName: "member",
      },
      organization: {
        modelName: "organization",
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

interface AuthHookContext {
  body?: unknown;
  path?: string;
}

interface AuthSessionHookPayload {
  activeOrganizationId?: unknown;
  id?: string;
  userId?: string;
}

interface AuthSessionDeleteHookPayload {
  id?: string;
  userId?: string;
}

type RecordAuthLoginAuditEvent = (input: {
  context: AuthHookContext | null;
  session: AuthSessionHookPayload;
}) => Promise<void> | void;

type RecordAuthSessionAuditEvent = (input: {
  context: AuthHookContext | null;
  session: AuthSessionDeleteHookPayload;
}) => Promise<void> | void;

export const createPolarisAuth = ({
  recordAuthLoginAuditEvent,
  recordAuthSessionAuditEvent,
}: {
  recordAuthLoginAuditEvent?: RecordAuthLoginAuditEvent;
  recordAuthSessionAuditEvent?: RecordAuthSessionAuditEvent;
} = {}) => {
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

  return betterAuth({
    secret: serverEnv.BETTER_AUTH_SECRET,
    baseURL: serverEnv.BETTER_AUTH_URL,
    basePath: "/api/auth",
    disabledPaths: ["/sign-in/email", "/sign-up/email"],
    trustedOrigins: getTrustedOrigins(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        account: accounts,
        invitation,
        member,
        organization,
        session: sessions,
        user: users,
        verification: verifications,
      },
      usePlural: false,
    }),
    databaseHooks: {
      session: {
        create: {
          after: async (
            session: AuthSessionHookPayload,
            context: AuthHookContext | null
          ) => {
            await recordAuthLoginAuditEvent?.({ context, session });
          },
        },
        delete: {
          after: async (
            session: AuthSessionDeleteHookPayload,
            context: AuthHookContext | null
          ) => {
            await recordAuthSessionAuditEvent?.({ context, session });
          },
        },
      },
    } as never,
    emailAndPassword: {
      enabled: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    account: {
      accountLinking: {
        enabled: true,
        allowDifferentEmails: false,
        disableImplicitLinking: true,
        trustedProviders: ["google"],
      },
    },
    socialProviders,
    // Better Auth recommends nextCookies() as the final plugin so
    // Server Actions always receive the final Set-Cookie handling.
    plugins: authPlugins,
  });
};
