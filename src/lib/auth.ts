import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { oneTap } from "better-auth/plugins";
import { db } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";
import { serverEnv } from "@/lib/env";

export const auth = betterAuth({
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL: serverEnv.BETTER_AUTH_URL,
  basePath: "/api/auth",
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
  socialProviders: {
    google: {
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
      disableImplicitSignUp: true,
    },
  },
  plugins: [
    nextCookies(),
    oneTap({
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      disableSignup: true,
    }),
  ],
});
