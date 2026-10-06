import { Button } from "@polaris/ui/components/ui/button";
import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-16 text-center">
      <h1 className="font-semibold text-2xl">Produto não encontrado</h1>
      <p className="text-muted-foreground text-sm">
        Esse produto não existe ou foi removido. Volte ao catálogo para
        continuar.
      </p>
      <Button asChild className="self-center">
        <Link href="/produtos">Ir para produtos</Link>
      </Button>
    </div>
  );
}
