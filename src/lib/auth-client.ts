"use client";

import { sentinelClient } from "@better-auth/infra/client";
import { createAuthClient } from "better-auth/client";
import { oneTapClient } from "better-auth/client/plugins";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

export const hasGoogleOneTapClient =
  typeof googleClientId === "string" && googleClientId.length > 0;

export const authClient = createAuthClient({
  plugins: [
    sentinelClient({
      autoSolveChallenge: true,
    }),
    oneTapClient({
      autoSelect: false,
      cancelOnTapOutside: true,
      clientId: googleClientId ?? "missing-google-client-id",
      context: "signin",
      promptOptions: {
        baseDelay: 1000,
        maxAttempts: 3,
      },
    }),
  ],
});
