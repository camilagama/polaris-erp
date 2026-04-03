"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
    <div className="mx-auto flex min-h-[60svh] max-w-2xl items-center justify-center p-6">
      <div className="w-full rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
        <div className="mb-6 inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <HugeiconsIcon icon={Alert02Icon} size={24} strokeWidth={2} />
        </div>
        <p className="font-medium text-destructive text-xs uppercase tracking-[0.22em]">
          Falha operacional
        </p>
        <h1 className="mt-3 font-heading font-semibold text-3xl tracking-tight">
          Nao foi possivel carregar esta area.
        </h1>
        <p className="mt-3 text-muted-foreground text-sm">
          O erro foi interceptado pela shell protegida. Tente recarregar esta
          secao. Se persistir, revise o ultimo fluxo executado.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
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
