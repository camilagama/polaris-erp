"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
        <div className="w-full max-w-3xl rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
          <p className="font-semibold text-primary text-xs uppercase tracking-[0.22em]">
            Falha global
          </p>
          <h1 className="mt-3 font-heading font-semibold text-3xl tracking-tight">
            A aplicacao interceptou um erro fora do fluxo protegido.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Tente reiniciar a renderizacao. Se o erro persistir, revise a ultima
            alteracao estrutural ou a configuracao de ambiente.
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={reset} type="button">
              Tentar novamente
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/sign-in">Ir para login</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
