"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Google } from "@/components/ui/svgs/google";
import { DGImportsLogo } from "@/components/ui/svgs/logo";
import { authClient, hasGoogleAuthClient } from "@/lib/auth-client";

const isLocalHostEnvironment = () => {
  const hostname = window.location.hostname;

  return hostname === "127.0.0.1" || hostname === "localhost";
};

export function SignInForm() {
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    setIsLocalhost(isLocalHostEnvironment());
  }, []);

  useEffect(() => {
    if (!hasGoogleAuthClient || isLocalhost) {
      return;
    }

    let cancelled = false;

    const initializeOneTap = async () => {
      try {
        await authClient.oneTap({
          callbackURL: "/",
          context: "signin",
        });
      } catch {
        if (!cancelled) {
          setGoogleError(null);
        }
      }
    };

    initializeOneTap();

    return () => {
      cancelled = true;
    };
  }, [isLocalhost]);

  const handleGoogleSignIn = async () => {
    setGooglePending(true);
    setGoogleError(null);

    if (!hasGoogleAuthClient) {
      setGoogleError("Login com Google indisponivel neste ambiente.");
      setGooglePending(false);
      return;
    }

    const result = await authClient.signIn.social({
      callbackURL: "/",
      provider: "google",
    });

    if (result.error) {
      setGoogleError(
        result.error.message ?? "Nao foi possivel entrar com Google."
      );
      setGooglePending(false);
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-[0.8fr_2fr]">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium uppercase tracking-[0.24em]">
            <DGImportsLogo className="size-6 shrink-0" />
            DG Imports.
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs sm:max-w-sm">
            <div className="mb-8 flex flex-col items-center text-center">
              <h1 className="font-heading text-3xl tracking-tight">
                Entrar na sua conta
              </h1>
              <p className="mt-2 text-muted-foreground text-sm">
                Use sua conta Google aprovada para acessar o painel
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Button
                className="relative h-11 w-full gap-3"
                disabled={googlePending || !hasGoogleAuthClient}
                onClick={handleGoogleSignIn}
                type="button"
                variant="outline"
              >
                {googlePending ? null : <Google className="size-4" />}
                {googlePending ? "Redirecionando..." : "Continuar com Google"}
              </Button>

              {googleError ? (
                <div className="mt-1 rounded-md bg-destructive/10 p-3 text-center text-destructive text-sm">
                  {googleError}
                </div>
              ) : null}

              {isLocalhost && hasGoogleAuthClient ? (
                <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-center text-muted-foreground text-xs leading-relaxed">
                  One Tap fica desativado localmente para evitar avisos do GSI
                  no console.
                </p>
              ) : null}

              <p className="mt-8 text-center text-muted-foreground/70 text-xs leading-relaxed">
                O acesso é liberado apenas para usuários previamente
                provisionados na operação.
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
