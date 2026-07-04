import "server-only";
import { dash, sentinel } from "@better-auth/infra";
import { APIError, betterAuth } from "better-auth";
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
import { recordActorAuditEvent } from "@/lib/audit-log";
import { serverEnv } from "@/lib/env";

const googleClientId = serverEnv.GOOGLE_CLIENT_ID;
const googleClientSecret = serverEnv.GOOGLE_CLIENT_SECRET;
const hasGoogleAuth =
  typeof googleClientId === "string" && typeof googleClientSecret === "string";

if (!hasGoogleAuth && serverEnv.NODE_ENV === "production") {
  throw new Error(
    "Google auth must be configured in production and staging environments."
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

const rejectWorkspaceUserManagement = (): never => {
  throw new APIError("FORBIDDEN", {
    code: "WORKSPACE_USER_MANAGEMENT_DISABLED",
    message: "Workspace user management is disabled for this sprint.",
  });
};

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

const DEFAULT_ORGANIZATION_ID = "org_dg_imports";

interface AuthHookContext {
  body?: unknown;
  path?: string;
}

interface AuthSessionHookPayload {
  activeOrganizationId?: unknown;
  id?: string;
  userId?: string;
}

const recordAuthAuditEvent = async ({
  actorUserId,
  metadata,
  organizationId,
  subjectId,
  subjectType,
  type,
}: {
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
  organizationId?: string | null;
  subjectId?: string | null;
  subjectType: string;
  type: string;
}) => {
  await recordActorAuditEvent({
    actorUserId,
    metadata,
    organizationId: organizationId ?? DEFAULT_ORGANIZATION_ID,
    subjectId,
    subjectType,
    type,
  });
};

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
          await recordAuthAuditEvent({
            actorUserId: session.userId,
            metadata: {
              path: context?.path ?? null,
              provider: context?.body
                ? (context.body as { provider?: unknown }).provider
                : null,
            },
            organizationId:
              typeof session.activeOrganizationId === "string"
                ? session.activeOrganizationId
                : null,
            subjectId: session.id,
            subjectType: "session",
            type: "auth.login",
          });
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
  user: {
    // Tenta atualizar se dados vierem da rede social depois:
  },
  socialProviders,
  // Better Auth recommends nextCookies() as the final plugin so
  // Server Actions always receive the final Set-Cookie handling.
  plugins: authPlugins,
});
