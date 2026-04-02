"use client";

import { oneTapClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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
