"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@polaris/ui/components/ui/button";
import { captureException } from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { createSafeOperationalError } from "@/lib/observability";

export default function GlobalError({
  error,
  reset: _reset,
  unstable_retry: unstableRetry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      captureException(createSafeOperationalError("global_error"), {
        tags: error.digest ? { digest: error.digest } : undefined,
      });
    }
  }, [error]);

  const handleRetry = () => {
    unstableRetry();
  };
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
        <div className="w-full max-w-2xl rounded-xl border border-border/60 bg-card p-8">
          <div className="mb-6 inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <HugeiconsIcon icon={Alert02Icon} size={24} strokeWidth={2} />
          </div>
          <p className="font-medium text-destructive text-xs uppercase tracking-[0.22em]">
            Falha global
          </p>
          <h1 className="mt-3 font-heading font-semibold text-3xl tracking-tight">
            A aplicacao interceptou um erro fora do fluxo protegido.
          </h1>
          <p className="mt-3 text-muted-foreground text-sm">
            Tente reiniciar a renderizacao. Se o erro persistir, revise a ultima
            alteracao estrutural ou a configuracao de ambiente.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={handleRetry} type="button">
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
