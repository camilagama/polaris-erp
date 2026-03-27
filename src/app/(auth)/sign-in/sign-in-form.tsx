"use client";

import { useActionState } from "react";
import { authInitialState, signInAction } from "@/app/(auth)/sign-in/actions";
import { Button } from "@/components/ui/button";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function SignInForm() {
  const [signInState, signInFormAction, signInPending] = useActionState(
    signInAction,
    authInitialState
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-border/60 bg-card/80 p-8 shadow-sm backdrop-blur">
        <div className="mb-8 space-y-3">
          <p className="font-semibold text-primary text-xs uppercase tracking-[0.22em]">
            DG Imports
          </p>
          <h1 className="font-heading font-semibold text-3xl tracking-tight">
            Gestao operacional para revenda com estoque e financeiro coerentes.
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Esta base ja nasce preparada para custo medio movel, estoque
            agregado, compras, vendas, recebimentos e visao separada de
            resultado operacional e caixa.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Estoque confiavel",
              copy: "Saldo consolidado no produto e historico de movimentos sem edicao destrutiva.",
            },
            {
              title: "Compras com custo medio",
              copy: "Recebimento recalcula custo medio apenas quando uma entrada valida acontece.",
            },
            {
              title: "Base pronta para vendas",
              copy: "Snapshot de custo, recebimentos parciais e eventos financeiros previstos no schema.",
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
