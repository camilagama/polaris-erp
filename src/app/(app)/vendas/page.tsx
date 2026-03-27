import { desc } from "drizzle-orm";
import {
  EmptyState,
  FeedbackBanner,
  PageLayout,
  Surface,
} from "@/app/(app)/_components/page-layout";
import { cancelSaleAction, createSaleAction } from "@/app/(app)/vendas/actions";
import { SalesForm } from "@/app/(app)/vendas/sales-form";
import { db } from "@/db";
import { products, saleItems, sales } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [productRows, saleRows, saleItemRows, resolvedSearchParams] =
    await Promise.all([
      db.select().from(products).orderBy(desc(products.updatedAt)),
      db.select().from(sales).orderBy(desc(sales.createdAt)),
      db.select().from(saleItems),
      searchParams,
    ]);
  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);
  const productMap = new Map(
    productRows.map((product) => [product.id, product])
  );
  const itemsBySaleId = saleItemRows.reduce<Map<number, typeof saleItemRows>>(
    (map, item) => {
      const currentItems = map.get(item.saleId) ?? [];
      currentItems.push(item);
      map.set(item.saleId, currentItems);
      return map;
    },
    new Map()
  );

  return (
    <PageLayout
      description="Vendas baixam estoque, usam o preco atual do produto como base e deixam o financeiro separado para ser resolvido em recebimentos."
      eyebrow="Vendas"
      title="Fluxo comercial"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <Surface className="h-fit">
          <div className="mb-5 space-y-2">
            <h2 className="font-semibold text-lg">Nova venda</h2>
            <p className="text-muted-foreground text-sm">
              Comece com um item e adicione outros so quando precisar. Frete e
              desconto continuam no nivel do pedido.
            </p>
          </div>
          <SalesForm action={createSaleAction} products={productRows} />
        </Surface>

        <Surface>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Vendas registradas</h2>
              <p className="text-muted-foreground text-sm">
                Status operacional e financeiro ficam visiveis sem misturar
                caixa com estoque.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 font-medium text-xs">
              {saleRows.length} vendas
            </span>
          </div>
          <div className="space-y-3">
            {saleRows.length > 0 ? (
              saleRows.map((sale) => {
                const items = itemsBySaleId.get(sale.id) ?? [];

                return (
                  <div
                    className="rounded-2xl border border-border/60 bg-background/70 p-4"
                    key={sale.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">Venda #{sale.id}</p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                            {sale.status}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {sale.channel} · {formatDateTime(sale.saleDate)}
                        </p>
                      </div>
                      {sale.status === "canceled" ? null : (
                        <form
                          action={cancelSaleAction}
                          className="w-full sm:w-auto"
                        >
                          <input name="saleId" type="hidden" value={sale.id} />
                          <button
                            className="h-10 w-full rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted sm:w-auto"
                            type="submit"
                          >
                            Cancelar
                          </button>
                        </form>
                      )}
                    </div>
                    <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                      <p>
                        Pedido:{" "}
                        <span className="font-semibold">
                          {formatCurrency(sale.orderTotal)}
                        </span>
                      </p>
                      <p>
                        Recebido bruto:{" "}
                        <span className="font-semibold">
                          {formatCurrency(sale.receivedGrossTotal)}
                        </span>
                      </p>
                      <p>
                        Recebido liquido:{" "}
                        <span className="font-semibold">
                          {formatCurrency(sale.receivedNetTotal)}
                        </span>
                      </p>
                    </div>
                    <div className="mt-4 space-y-2">
                      {items.map((item) => {
                        const product = productMap.get(item.productId);

                        return (
                          <div
                            className="grid gap-2 rounded-xl border border-border/50 px-3 py-2 text-sm md:grid-cols-[1fr_auto_auto]"
                            key={item.id}
                          >
                            <p>
                              {product?.name || `Produto #${item.productId}`}
                            </p>
                            <p>{item.quantity} un</p>
                            <p className="font-medium md:text-right">
                              venda {formatCurrency(item.lineSubtotal)} · custo{" "}
                              {formatCurrency(item.costSnapshotTotal)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    {sale.notes ? (
                      <p className="mt-3 text-muted-foreground text-sm">
                        {sale.notes}
                      </p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <EmptyState
                description="Assim que houver estoque recebido, registre a primeira venda. O sistema baixa saldo, grava snapshot de custo e libera o financeiro em recebimentos."
                title="Nenhuma venda registrada ainda"
              />
            )}
          </div>
        </Surface>
      </div>
    </PageLayout>
  );
}
