"use client";

import { GoogleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useActionState, useEffect, useState } from "react";
import { signInAction } from "@/app/(auth)/sign-in/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  authClient,
  hasGoogleAuthClient,
  isLocalAuthOrigin,
} from "@/lib/auth-client";

const authInitialState = {
  error: null,
};

export function SignInForm() {
  const [signInState, signInFormAction, signInPending] = useActionState(
    signInAction,
    authInitialState
  );
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isLocalOrigin, setIsLocalOrigin] = useState(false);

  useEffect(() => {
    const localOrigin = isLocalAuthOrigin(window.location.hostname);
    setIsLocalOrigin(localOrigin);

    if (localOrigin) {
      return;
    }

    if (!hasGoogleAuthClient) {
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
  }, []);

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

  let googleAccessCopy =
    "Google e One Tap nao estao configurados neste ambiente. O login por email e senha continua disponivel.";

  if (hasGoogleAuthClient) {
    googleAccessCopy = isLocalOrigin
      ? "One Tap fica desativado localmente para evitar prompts invalidos. O login por email e senha continua como caminho principal."
      : "One Tap abre automaticamente quando o Google permitir o prompt neste navegador.";
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur">
        <CardHeader className="gap-3">
          <p className="font-semibold text-primary text-xs uppercase tracking-[0.22em]">
            DG Imports
          </p>
          <CardTitle className="font-heading text-3xl tracking-tight">
            Gestao operacional para revenda com produtos e estoque confiaveis.
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-6">
            A versao atual concentra autenticacao, catalogo, estoque, vendas e
            configuracoes operacionais com custo medio movel e taxas
            parametrizadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Estoque confiavel",
              copy: "Saldo consolidado no produto e historico de movimentos sem edicao destrutiva.",
            },
            {
              title: "Custo medio simplificado",
              copy: "Reposicoes recalculam custo medio e baixas preservam rastreabilidade com observacoes.",
            },
            {
              title: "Vendas operacionais",
              copy: "O fluxo atual registra venda concluida, aplica taxa por pagamento e permite cancelamento com estorno.",
            },
          ].map((feature) => (
            <Card
              className="rounded-2xl border border-border/60 bg-background/80 p-4"
              key={feature.title}
            >
              <h2 className="mb-2 font-semibold text-sm">{feature.title}</h2>
              <p className="text-muted-foreground text-sm">{feature.copy}</p>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="gap-2">
          <CardTitle className="font-heading text-2xl tracking-tight">
            Entrar
          </CardTitle>
          <CardDescription>
            Use email e senha para acessar a area protegida da operacao.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <form action={signInFormAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="font-medium text-sm" htmlFor="email">
                Email
              </Label>
              <Input id="email" name="email" required type="email" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="font-medium text-sm" htmlFor="password">
                Senha
              </Label>
              <Input
                id="password"
                minLength={8}
                name="password"
                required
                type="password"
              />
            </div>
            {signInState.error ? (
              <p className="text-destructive text-sm">{signInState.error}</p>
            ) : null}
            <Button className="w-full" disabled={signInPending} type="submit">
              {signInPending ? "Entrando..." : "Entrar no painel"}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
              acesso alternativo
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/10 p-4">
            <Button
              className="h-10 w-full"
              disabled={googlePending || !hasGoogleAuthClient}
              onClick={handleGoogleSignIn}
              type="button"
              variant="secondary"
            >
              <HugeiconsIcon icon={GoogleIcon} strokeWidth={2} />
              {googlePending ? "Redirecionando..." : "Continuar com Google"}
            </Button>
            <p className="text-center text-muted-foreground text-xs leading-5">
              {googleAccessCopy}
            </p>
            {googleError ? (
              <p className="text-destructive text-sm">{googleError}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
