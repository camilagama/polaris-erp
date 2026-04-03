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

function LoginShowcase() {
  return (
    <div className="relative hidden overflow-hidden lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(185,28,28,0.34),transparent_38%),linear-gradient(180deg,rgba(18,18,18,0.9),rgba(10,10,10,1))]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,transparent_48%,rgba(255,255,255,0.04)_48%,rgba(255,255,255,0.04)_52%,transparent_52%,transparent_100%)] opacity-40" />
      <div className="absolute inset-y-12 right-12 left-12 rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-md" />

      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        <div className="max-w-md space-y-5">
          <p className="font-semibold text-[11px] text-white/60 uppercase tracking-[0.28em]">
            DG Imports
          </p>
          <h2 className="font-heading text-4xl text-white leading-tight tracking-tight">
            Operacao interna desenhada para giro rapido, clareza e controle.
          </h2>
          <p className="max-w-sm text-sm text-white/70 leading-relaxed">
            Produtos, estoque, vendas e configuracoes em um fluxo enxuto para
            uso diario, com baixa friccao e leitura operacional imediata.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] text-white/55 uppercase tracking-[0.18em]">
                Catalogo
              </p>
              <strong className="mt-3 block font-heading text-2xl text-white">
                1 fluxo
              </strong>
              <p className="mt-2 text-white/65 text-xs">
                Cadastro, imagem e status sem sair da operacao.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] text-white/55 uppercase tracking-[0.18em]">
                Estoque
              </p>
              <strong className="mt-3 block font-heading text-2xl text-white">
                100%
              </strong>
              <p className="mt-2 text-white/65 text-xs">
                Entradas, baixas e historico preservado por evento.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] text-white/55 uppercase tracking-[0.18em]">
                Vendas
              </p>
              <strong className="mt-3 block font-heading text-2xl text-white">
                2 modos
              </strong>
              <p className="mt-2 text-white/65 text-xs">
                Pix e cartao com taxa modelada no proprio fluxo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
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
      <LoginShowcase />
    </div>
  );
}
