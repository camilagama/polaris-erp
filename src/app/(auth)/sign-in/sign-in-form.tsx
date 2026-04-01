"use client";

import { GoogleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useActionState, useEffect, useState } from "react";
import { signInAction } from "@/app/(auth)/sign-in/actions";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

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

  useEffect(() => {
    const initializeOneTap = async () => {
      await authClient.oneTap({
        callbackURL: "/",
        context: "signin",
      });
    };

    initializeOneTap();
  }, []);

  const handleGoogleSignIn = async () => {
    setGooglePending(true);
    setGoogleError(null);

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
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-border/60 bg-card/80 p-8 shadow-sm backdrop-blur">
        <div className="mb-8 space-y-3">
          <p className="font-semibold text-primary text-xs uppercase tracking-[0.22em]">
            DG Imports
          </p>
          <h1 className="font-heading font-semibold text-3xl tracking-tight">
            Gestao operacional para revenda com produtos e estoque confiaveis.
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            A versao atual concentra autenticacao, catalogo, estoque, vendas e
            configuracoes operacionais com custo medio movel e taxas
            parametrizadas.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
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
            <div
              className="rounded-2xl border border-border/60 bg-background/80 p-4"
              key={feature.title}
            >
              <h2 className="mb-2 font-semibold">{feature.title}</h2>
              <p className="text-muted-foreground text-sm">{feature.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
        <div className="mb-6 space-y-2">
          <h2 className="font-heading font-semibold text-2xl tracking-tight">
            Entrar
          </h2>
          <p className="text-muted-foreground text-sm">
            Use email e senha para acessar a area protegida da operacao.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            className="h-10 w-full"
            disabled={googlePending}
            onClick={handleGoogleSignIn}
            type="button"
            variant="secondary"
          >
            <HugeiconsIcon icon={GoogleIcon} strokeWidth={2} />
            {googlePending ? "Redirecionando..." : "Continuar com Google"}
          </Button>
          <p className="text-center text-muted-foreground text-xs">
            One Tap abre automaticamente quando o Google permitir o prompt neste
            navegador.
          </p>
          {googleError ? (
            <p className="text-destructive text-sm">{googleError}</p>
          ) : null}
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
            ou
          </span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        <form action={signInFormAction} className="space-y-4">
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="email">
              Email
            </label>
            <input
              className={inputClassName}
              id="email"
              name="email"
              required
              type="email"
            />
          </div>
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="password">
              Senha
            </label>
            <input
              className={inputClassName}
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
      </section>
    </div>
  );
}
