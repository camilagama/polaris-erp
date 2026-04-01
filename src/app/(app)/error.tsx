"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60svh] max-w-2xl items-center justify-center">
      <div className="w-full rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
        <p className="font-semibold text-primary text-xs uppercase tracking-[0.22em]">
          Falha operacional
        </p>
        <h1 className="mt-3 font-heading font-semibold text-3xl tracking-tight">
          Nao foi possivel carregar esta area.
        </h1>
        <p className="mt-3 text-muted-foreground">
          O erro foi interceptado pela shell protegida. Tente recarregar esta
          secao. Se persistir, revise o ultimo fluxo executado.
        </p>
        <div className="mt-6 flex gap-3">
          <Button onClick={reset} type="button">
            Tentar novamente
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/">Voltar ao dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
