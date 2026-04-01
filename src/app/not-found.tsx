import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
      <div className="w-full rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
        <p className="font-semibold text-primary text-xs uppercase tracking-[0.22em]">
          Rota nao encontrada
        </p>
        <h1 className="mt-3 font-heading font-semibold text-3xl tracking-tight">
          Esta pagina nao existe no fluxo atual.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Revise o endereco acessado ou volte para um dos modulos operacionais
          disponiveis.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
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
