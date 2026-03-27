import { desc } from "drizzle-orm";
import Link from "next/link";
import {
  EmptyState,
  FeedbackBanner,
  PageLayout,
  Surface,
} from "@/app/(app)/_components/page-layout";
import { createInventoryAdjustmentAction } from "@/app/(app)/estoque/actions";
import { db } from "@/db";
import { inventoryMovements, products, systemSettings } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const movementTypeLabels = {
  adjustment_minus: "Correcao negativa",
  adjustment_plus: "Correcao positiva",
  cancel_restock: "Estorno de cancelamento",
  customer_return: "Devolucao",
  damage: "Avaria",
  initial_stock: "Estoque inicial",
  loss: "Perda",
  purchase_in: "Recebimento de compra",
  sale_out: "Venda",
} as const;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [productRows, movementRows, settingsRows, resolvedSearchParams] =
    await Promise.all([
      db.select().from(products).orderBy(desc(products.updatedAt)),
      db
        .select()
        .from(inventoryMovements)
        .orderBy(desc(inventoryMovements.occurredAt))
        .limit(40),
      db.select().from(systemSettings).limit(1),
      searchParams,
    ]);
  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);
  const requestedProductId = Number(
    getSearchParamValue(resolvedSearchParams.productId) ?? 0
  );
  const selectedProductId = productRows.some(
    (product) => product.id === requestedProductId
  )
    ? requestedProductId
    : productRows[0]?.id;
  const productMap = new Map(
    productRows.map((product) => [product.id, product])
  );
  const lowStockThreshold = settingsRows[0]?.lowStockThreshold ?? 2;
  const activeProducts = productRows.filter(
    (product) => product.status === "active"
  );
  const lowStockProducts = activeProducts.filter((product) => {
    const productMinimum =
      product.minimumStock > 0 ? product.minimumStock : lowStockThreshold;
    return product.currentStock <= productMinimum;
  });

  return (
    <PageLayout
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
            href="/compras"
          >
            Receber compra
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
            href="/produtos"
          >
            Voltar para produtos
          </Link>
        </div>
      }
      description="Estoque agora concentra saldo, alertas e ajustes manuais. Entradas formais continuam em Compras para preservar custo medio e rastreabilidade."
      eyebrow="Estoque"
      title="Movimentacoes"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Surface className="h-fit">
          <div className="mb-5 space-y-2">
            <h2 className="font-semibold text-lg">Ajuste manual</h2>
            <p className="text-muted-foreground text-sm">
              Use apenas para divergencia fisica, perda, avaria ou devolucao.
              Para entrada planejada, use Compras.
            </p>
          </div>

          {productRows.length > 0 ? (
            <form
              action={createInventoryAdjustmentAction}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="productId">
                  Produto
                </label>
                <select
                  className={inputClassName}
                  defaultValue={selectedProductId}
                  id="productId"
                  name="productId"
                  required
                >
                  {productRows.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · estoque {product.currentStock}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="type">
                    Motivo
                  </label>
                  <select
                    className={inputClassName}
                    defaultValue="adjustment_plus"
                    id="type"
                    name="type"
                  >
                    <option value="adjustment_plus">Correcao positiva</option>
                    <option value="adjustment_minus">Correcao negativa</option>
                    <option value="loss">Perda</option>
                    <option value="damage">Avaria</option>
                    <option value="customer_return">Devolucao</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="quantity">
                    Quantidade
                  </label>
                  <input
                    className={inputClassName}
                    defaultValue="1"
                    id="quantity"
                    min="1"
                    name="quantity"
                    required
                    step="1"
                    type="number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="note">
                  Observacao
                </label>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="note"
                  name="note"
                />
              </div>

              <button
                className="h-10 w-full rounded-xl bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/90 sm:w-auto"
                type="submit"
              >
                Registrar ajuste
              </button>
            </form>
          ) : (
            <EmptyState
              description="Cadastre produtos antes de começar a ajustar o estoque."
              title="Sem itens para movimentar"
            />
          )}

          <div className="mt-6 space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4">
            <div>
              <h3 className="font-semibold">Alertas rapidos</h3>
              <p className="text-muted-foreground text-sm">
                Estoque baixo respeita o minimo do produto e, quando vazio, cai
                no padrao do sistema.
              </p>
            </div>
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((product) => {
                const productMinimum =
                  product.minimumStock > 0
                    ? product.minimumStock
                    : lowStockThreshold;

                return (
                  <div
                    className="rounded-xl border border-border/50 px-3 py-3 text-sm"
                    key={product.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{product.name}</p>
                      <span className="rounded-full bg-amber-500/12 px-2 py-0.5 font-medium text-[11px] text-amber-700 uppercase tracking-[0.08em]">
                        Baixo estoque
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Saldo atual {product.currentStock} · minimo{" "}
                      {productMinimum}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhum item esta abaixo do minimo agora.
              </p>
            )}
          </div>
        </Surface>

        <Surface>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-lg">Historico recente</h2>
              <p className="text-muted-foreground text-sm">
                As ultimas 40 movimentacoes de entrada, saida e ajuste aparecem
                aqui.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 font-medium text-xs">
              {movementRows.length} movimentos
            </span>
          </div>

          <div className="space-y-3">
            {movementRows.length > 0 ? (
              movementRows.map((movement) => {
                const product = productMap.get(movement.productId);

                return (
                  <div
                    className="grid gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 md:grid-cols-[1fr_auto]"
                    key={movement.id}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                          {movementTypeLabels[movement.type]}
                        </p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                          {product?.name || `Produto #${movement.productId}`}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {formatDateTime(movement.occurredAt)}
                      </p>
                      {movement.note ? (
                        <p className="text-muted-foreground text-sm">
                          {movement.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "font-semibold text-lg",
                          movement.quantityDelta >= 0
                            ? "text-emerald-600"
                            : "text-destructive"
                        )}
                      >
                        {movement.quantityDelta >= 0 ? "+" : ""}
                        {movement.quantityDelta}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        custo ref. {formatCurrency(movement.unitCostSnapshot)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                description="As entradas de compra, vendas e ajustes vao alimentar esta trilha."
                title="Nenhum movimento registrado ainda"
              />
            )}
          </div>
        </Surface>
      </div>
    </PageLayout>
  );
}
