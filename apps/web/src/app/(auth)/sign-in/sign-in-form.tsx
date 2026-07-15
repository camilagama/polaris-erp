"use client";

import { SignInLayout } from "@polaris/ui/components/shared/sign-in-layout";
import { useEffect } from "react";
import { authClient, hasGoogleOneTapClient } from "@/lib/auth-client";

const getSafeCallbackUrl = (callbackUrl: string) =>
  callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
    ? callbackUrl
    : "/";

const getGoogleAuthHref = (callbackUrl: string) => {
  const params = new URLSearchParams({
    callbackUrl,
  });

  return `/api/auth/google?${params.toString()}`;
};

export function SignInForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);
  const googleAuthHref = getGoogleAuthHref(safeCallbackUrl);

  useEffect(() => {
    if (!hasGoogleOneTapClient) {
      return;
    }

    const initializeOneTap = async () => {
      try {
        await authClient.oneTap({
          callbackURL: safeCallbackUrl,
          context: "signin",
          onPromptNotification: () => undefined,
        });
      } catch {
        return;
      }
    };

    initializeOneTap();
  }, [safeCallbackUrl]);

  return (
    <SignInLayout
      appName="Polaris."
      description="Use sua conta Google para continuar"
      footerText="Ao continuar, sua conta será criada automaticamente se for o primeiro acesso."
      googleAuthHref={googleAuthHref}
      title="Entrar na sua conta"
    />
  );
}
