import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { oneTap } from "better-auth/plugins";
import { db } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";
import { serverEnv } from "@/lib/env";

const googleClientId = serverEnv.GOOGLE_CLIENT_ID;
const googleClientSecret = serverEnv.GOOGLE_CLIENT_SECRET;
const publicGoogleClientId = serverEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const hasGoogleAuth =
  typeof googleClientId === "string" &&
  typeof googleClientSecret === "string" &&
  typeof publicGoogleClientId === "string";

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
        disableImplicitSignUp: true,
      },
    }
  : {};

const authPlugins = hasGoogleAuth
  ? [
      oneTap({
        clientId: googleClientId,
        disableSignup: true,
      }),
      nextCookies(),
    ]
  : [nextCookies()];

export const auth = betterAuth({
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL: serverEnv.BETTER_AUTH_URL,
  basePath: "/api/auth",
  trustedOrigins: getTrustedOrigins(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      accounts,
      sessions,
      users,
      verifications,
    },
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  socialProviders,
  // Better Auth recommends nextCookies() as the final plugin so
  // Server Actions always receive the final Set-Cookie handling.
  plugins: authPlugins,
});
