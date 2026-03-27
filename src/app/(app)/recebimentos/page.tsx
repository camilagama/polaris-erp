import { PageLayout, Surface } from "@/app/(app)/_components/page-layout";
import { db } from "@/db";
import { receipts } from "@/db/schema";

export default async function ReceiptsPage() {
  const receiptRows = await db.select().from(receipts).limit(5);

  return (
    <PageLayout
      description="Recebimentos continuam separados de vendas para que caixa e resultado operacional nao se confundam. A tela de lancamento entra na etapa seguinte."
      eyebrow="Financeiro"
      title="Recebimentos"
    >
      <Surface className="max-w-4xl">
        <h2 className="font-semibold text-lg">Fila da proxima iteracao</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          O modelo ja suporta recebimento parcial, liquido, chargeback e refund.
          Falta abrir a jornada de uso no app para completar os marcos C e D.
        </p>
        <div className="mt-5 rounded-2xl border border-border/60 bg-background/70 p-4">
          <p className="font-medium text-sm">Recebimentos registrados</p>
          <p className="mt-2 font-heading font-semibold text-3xl">
            {receiptRows.length}
          </p>
        </div>
      </Surface>
    </PageLayout>
  );
}
