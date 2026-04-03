"use client";

import { useActionState, useEffect, useState } from "react";
import { signInAction } from "@/app/(auth)/sign-in/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, hasGoogleAuthClient } from "@/lib/auth-client";

const authInitialState = {
  error: null,
};

const isLocalHostEnvironment = () => {
  const hostname = window.location.hostname;

  return hostname === "127.0.0.1" || hostname === "localhost";
};

function GoogleBadge() {
  return (
    <span className="flex size-5 items-center justify-center rounded-full border border-border/70 bg-background font-semibold text-[10px] text-foreground">
      G
    </span>
  );
}

export function SignInForm() {
  const [signInState, signInFormAction, signInPending] = useActionState(
    signInAction,
    authInitialState
  );
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
      setGoogleError(
        "Login com Google indisponivel neste ambiente. Use email e senha."
      );
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
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-bold">DG</span>
            </div>
            DG Imports
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs sm:max-w-sm">
            <div className="mb-8 flex flex-col items-center text-center">
              <h1 className="font-heading text-3xl tracking-tight">
                Entrar na sua conta
              </h1>
              <p className="mt-2 text-muted-foreground text-sm">
                Entre com Google ou use seu email e senha
              </p>
              {isLocalhost ? (
                <p className="mt-2 text-muted-foreground text-xs">
                  One Tap fica desativado localmente. Use o botao do Google ou
                  entre com email e senha.
                </p>
              ) : null}
            </div>

            <form action={signInFormAction} className="flex flex-col gap-4">
              <Button
                className="h-11 w-full gap-3"
                disabled={googlePending || !hasGoogleAuthClient}
                onClick={handleGoogleSignIn}
                type="button"
                variant="outline"
              >
                <GoogleBadge />
                {googlePending ? "Redirecionando..." : "Continuar com Google"}
              </Button>

              <div className="relative my-2 py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-border/70 border-t" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                    Ou use seu email
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  className="font-medium text-foreground/80 text-sm"
                  htmlFor="email"
                >
                  Email
                </Label>
                <Input
                  className="h-10"
                  id="email"
                  name="email"
                  required
                  type="email"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  className="font-medium text-foreground/80 text-sm"
                  htmlFor="password"
                >
                  Senha
                </Label>
                <Input
                  className="h-10"
                  id="password"
                  minLength={8}
                  name="password"
                  required
                  type="password"
                />
              </div>

              {signInState.error || googleError ? (
                <div className="mt-1 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                  {signInState.error || googleError}
                </div>
              ) : null}

              <Button
                className="mt-2 h-11 w-full"
                disabled={signInPending}
                type="submit"
              >
                {signInPending ? "Entrando..." : "Entrar no painel"}
              </Button>
            </form>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <div
          className="absolute inset-0 h-full w-full bg-center bg-cover dark:brightness-[0.3] dark:grayscale"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&q=80&w=2560")',
          }}
        />
      </div>
    </div>
  );
}
