"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Google } from "@/components/ui/svgs/google";
import { DGImportsLogo } from "@/components/ui/svgs/logo";
import { authClient, hasGoogleAuthClient } from "@/lib/auth-client";

type AuthFormMode = "register" | "sign-in";

const isLocalHostEnvironment = () => {
  const hostname = window.location.hostname;

  return hostname === "127.0.0.1" || hostname === "localhost";
};

const getSafeCallbackUrl = (callbackUrl: string) =>
  callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
    ? callbackUrl
    : "/onboarding";

const getGoogleButtonLabel = ({
  isRegister,
  pending,
}: {
  isRegister: boolean;
  pending: boolean;
}) => {
  if (pending) {
    return "Redirecionando...";
  }

  return isRegister ? "Cadastrar com Google" : "Continuar com Google";
};

export function SignInForm({
  callbackUrl = "/onboarding",
  mode = "sign-in",
}: {
  callbackUrl?: string;
  mode?: AuthFormMode;
}) {
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);
  const isRegister = mode === "register";
  const googleButtonLabel = getGoogleButtonLabel({
    isRegister,
    pending: googlePending,
  });

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
          callbackURL: safeCallbackUrl,
          context: isRegister ? "signup" : "signin",
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
  }, [isLocalhost, isRegister, safeCallbackUrl]);

  const handleGoogleSignIn = async () => {
    setGooglePending(true);
    setGoogleError(null);

    if (!hasGoogleAuthClient) {
      setGoogleError("Login com Google indisponivel neste ambiente.");
      setGooglePending(false);
      return;
    }

    const result = await authClient.signIn.social({
      callbackURL: safeCallbackUrl,
      disableRedirect: true,
      errorCallbackURL: "/sign-in?error=google",
      newUserCallbackURL: "/onboarding",
      provider: "google",
      requestSignUp: isRegister,
    });

    if (result.error) {
      setGoogleError(
        result.error.message ?? "Nao foi possivel entrar com Google."
      );
      setGooglePending(false);
      return;
    }

    if (result.data?.url) {
      window.location.assign(result.data.url);
      return;
    }

    setGoogleError("Nao recebemos a URL de redirecionamento do Google.");
    setGooglePending(false);
  };

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
                {isRegister ? "Criar sua conta" : "Entrar na sua conta"}
              </h1>
              <p className="mt-2 text-muted-foreground text-sm">
                {isRegister
                  ? "Comece com sua conta Google"
                  : "Use sua conta Google para continuar"}
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
                {googleButtonLabel}
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
                {isRegister
                  ? "Depois do primeiro acesso voce configura sua organizacao."
                  : "Ainda nao tem conta?"}
              </p>
              <Button asChild className="w-full" type="button" variant="ghost">
                <Link href={isRegister ? "/sign-in" : "/register"}>
                  {isRegister ? "Ja tenho conta" : "Criar conta"}
                </Link>
              </Button>
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
