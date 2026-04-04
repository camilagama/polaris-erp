import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SaleNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-16 text-center">
      <h1 className="font-semibold text-2xl">Venda não encontrada</h1>
      <p className="text-muted-foreground text-sm">
        Essa venda não existe ou você não tem permissão para vê-la. Volte à
        lista de vendas.
      </p>
      <Button asChild className="self-center">
        <Link href="/vendas">Ir para vendas</Link>
      </Button>
    </div>
  );
}
