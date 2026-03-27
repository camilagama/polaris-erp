import { PageLayout, Surface } from "@/app/(app)/_components/page-layout";
import { db } from "@/db";
import { sales } from "@/db/schema";

export default async function SalesPage() {
  const saleRows = await db.select().from(sales).limit(5);

  return (
    <PageLayout
      description="O schema ja suporta venda com multiplos itens, snapshot de custo e estados financeiros. A interface transacional completa entra na proxima iteracao."
      eyebrow="Vendas"
      title="Fluxo comercial"
    >
      <Surface className="max-w-4xl">
        <h2 className="font-semibold text-lg">Proxima fase do core</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Esta entrega deixou pronta a fundacao de auth, schema, produtos,
          compras, estoque e configuracoes. O proximo bloco abre venda, baixa de
          estoque, snapshot de custo e fechamento por recebimentos.
        </p>
        <div className="mt-5 rounded-2xl border border-border/60 bg-background/70 p-4">
          <p className="font-medium text-sm">Registros atuais em vendas</p>
          <p className="mt-2 font-heading font-semibold text-3xl">
            {saleRows.length}
          </p>
        </div>
      </Surface>
    </PageLayout>
  );
}
