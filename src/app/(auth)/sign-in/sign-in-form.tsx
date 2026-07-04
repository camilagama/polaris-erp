"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [email, setEmail] = useState("");
  const [magicLinkPending, setMagicLinkPending] = useState(false);
  const [magicLinkMessage, setMagicLinkMessage] = useState<string | null>(null);
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
          callbackURL: "/onboarding",
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
      callbackURL: "/onboarding",
      provider: "google",
    });

    if (result.error) {
      setGoogleError(
        result.error.message ?? "Nao foi possivel entrar com Google."
      );
      setGooglePending(false);
    }
  };

  const handleMagicLinkSignIn = async () => {
    setMagicLinkPending(true);
    setMagicLinkMessage(null);

    const result = await authClient.signIn.magicLink({
      callbackURL: "/onboarding",
      email,
      newUserCallbackURL: "/onboarding",
    });

    if (result.error) {
      setMagicLinkMessage(
        result.error.message ?? "Nao foi possivel enviar o link de acesso."
      );
      setMagicLinkPending(false);
      return;
    }

    setMagicLinkMessage("Enviamos um link de acesso para o seu email.");
    setMagicLinkPending(false);
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
                Use Google ou receba um link magico por email
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="magic-link-email">Email</Label>
                <Input
                  autoComplete="email"
                  id="magic-link-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@empresa.com"
                  type="email"
                  value={email}
                />
                <Button
                  className="h-11 w-full"
                  disabled={magicLinkPending || email.trim().length === 0}
                  onClick={handleMagicLinkSignIn}
                  type="button"
                >
                  {magicLinkPending ? "Enviando..." : "Enviar link de acesso"}
                </Button>
              </div>

              {magicLinkMessage ? (
                <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-center text-muted-foreground text-sm">
                  {magicLinkMessage}
                </div>
              ) : null}

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
                Novas contas criam uma organizacao propria no primeiro acesso.
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
