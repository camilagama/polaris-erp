"use client";

import { oneTapClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

if (!googleClientId) {
  throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID nao configurado.");
}

export const authClient = createAuthClient({
  plugins: [
    oneTapClient({
      autoSelect: false,
      clientId: googleClientId,
      context: "signin",
      promptOptions: {
        baseDelay: 1000,
        fedCM: true,
        maxAttempts: 5,
      },
    }),
  ],
});
