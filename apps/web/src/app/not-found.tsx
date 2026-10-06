import { Search02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@polaris/ui/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-16">
      <div className="w-full rounded-xl border border-border/60 bg-card p-8">
        <div className="mb-6 inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HugeiconsIcon icon={Search02Icon} size={24} strokeWidth={2} />
        </div>
        <p className="font-medium text-primary text-xs uppercase tracking-[0.22em]">
          Rota nao encontrada
        </p>
        <h1 className="mt-3 font-heading font-semibold text-3xl tracking-tight">
          Esta pagina nao existe no fluxo atual.
        </h1>
        <p className="mt-3 text-muted-foreground text-sm">
          Revise o endereco acessado ou volte para um dos modulos operacionais
          disponiveis.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild type="button">
            <Link href="/">Ir para o dashboard</Link>
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/produtos">Abrir produtos</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
