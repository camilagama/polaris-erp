"use client";

import { oneTapClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const localAuthHosts = new Set(["127.0.0.1", "localhost"]);

export const isLocalAuthOrigin = (hostname: string) =>
  localAuthHosts.has(hostname);

export const hasGoogleAuthClient = typeof googleClientId === "string";

const authClientPlugins = googleClientId
  ? [
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
  : [];

export const authClient = createAuthClient({
  plugins: authClientPlugins,
});
