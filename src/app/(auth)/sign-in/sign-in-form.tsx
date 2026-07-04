"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Google } from "@/components/ui/svgs/google";
import { DGImportsLogo } from "@/components/ui/svgs/logo";
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
    <div className="grid min-h-svh lg:grid-cols-[0.8fr_2fr]">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium uppercase tracking-[0.24em]">
            <DGImportsLogo className="size-6 shrink-0" />
            Polaris.
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs sm:max-w-sm">
            <div className="mb-8 flex flex-col items-center text-center">
              <h1 className="font-heading text-3xl tracking-tight">
                Entrar na sua conta
              </h1>
              <p className="mt-2 text-muted-foreground text-sm">
                Use sua conta Google para continuar
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Button
                asChild
                className="relative h-11 w-full gap-3"
                variant="outline"
              >
                <a href={googleAuthHref}>
                  <Google className="size-4" />
                  Continuar com Google
                </a>
              </Button>

              <p className="mt-8 text-center text-muted-foreground/70 text-xs leading-relaxed">
                Ao continuar, sua conta sera criada automaticamente se for o
                primeiro acesso.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <div
          className="absolute inset-0 h-full w-full bg-center bg-cover brightness-[0.3] grayscale"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&q=80&w=2560")',
          }}
        />
      </div>
    </div>
  );
}
