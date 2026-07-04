"use client";

import { sentinelClient } from "@better-auth/infra/client";
import { oneTapClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const isLocalhostRuntime = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname === "127.0.0.1" || hostname === "localhost";
};

export const hasGoogleAuthClient =
  typeof googleClientId === "string" && googleClientId.trim().length > 0;
const hasGoogleOneTapClient = hasGoogleAuthClient && !isLocalhostRuntime();

const authClientPlugins =
  hasGoogleOneTapClient && googleClientId
    ? [
        sentinelClient({
          autoSolveChallenge: true,
        }),
        oneTapClient({
          autoSelect: false,
          cancelOnTapOutside: true,
          clientId: googleClientId,
          context: "signin",
          promptOptions: {
            baseDelay: 1000,
            fedCM: true,
            maxAttempts: 5,
          },
        }),
      ]
    : [
        sentinelClient({
          autoSolveChallenge: true,
        }),
      ];

export const authClient = createAuthClient({
  plugins: authClientPlugins,
});
