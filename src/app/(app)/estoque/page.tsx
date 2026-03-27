import { desc } from "drizzle-orm";
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
import { toNumber } from "@/lib/domain/calculations";
import { formatCurrency, formatDateTime } from "@/lib/format";

const inputClassName =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

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
        .limit(12),
      db.select().from(systemSettings).limit(1),
      searchParams,
    ]);
  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);
  const lowStockThreshold = settingsRows[0]?.lowStockThreshold ?? 2;
  const criticalItems = productRows.filter(
    (product) =>
      product.status === "active" && product.currentStock <= lowStockThreshold
  );
  const stockValue = productRows.reduce(
    (total, product) =>
      total + product.currentStock * toNumber(product.averageCost),
    0
  );
  const productsById = new Map(
    productRows.map((product) => [product.id, product])
  );

  return (
    <PageLayout
      description="O estoque usa ledger e agregado ao mesmo tempo: cada movimento fica historico, e o saldo consolidado vive no produto."
      eyebrow="Estoque"
      title="Movimentos e ajustes"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-4 md:grid-cols-3">
        <Surface>
          <p className="text-muted-foreground text-sm">Produtos monitorados</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {productRows.length}
          </p>
        </Surface>
        <Surface>
          <p className="text-muted-foreground text-sm">Estoque critico</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {criticalItems.length}
          </p>
        </Surface>
        <Surface>
          <p className="text-muted-foreground text-sm">Capital em estoque</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {formatCurrency(stockValue)}
          </p>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Surface className="h-fit">
          <div className="mb-5 space-y-2">
            <h2 className="font-semibold text-lg">Registrar ajuste</h2>
            <p className="text-muted-foreground text-sm">
              Use para acerto manual, perda ou avaria. Estoque negativo continua
              bloqueado.
            </p>
          </div>
          <form action={createInventoryAdjustmentAction} className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="productId">
                Produto
              </label>
              <select
                className={inputClassName}
                id="productId"
                name="productId"
                required
              >
                <option value="">Selecione um produto</option>
                {productRows.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="type">
                  Tipo
                </label>
                <select
                  className={inputClassName}
                  id="type"
                  name="type"
                  required
                >
                  <option value="adjustment_plus">Ajuste positivo</option>
                  <option value="adjustment_minus">Ajuste negativo</option>
                  <option value="loss">Perda</option>
                  <option value="damage">Avaria</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="quantity">
                  Quantidade
                </label>
                <input
                  className={inputClassName}
                  id="quantity"
                  min="1"
                  name="quantity"
                  required
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
              Registrar movimento
            </button>
          </form>
        </Surface>

        <Surface>
          <div className="mb-5 space-y-1">
            <h2 className="font-semibold text-lg">Historico recente</h2>
            <p className="text-muted-foreground text-sm">
              Ultimos movimentos salvos no ledger de estoque.
            </p>
          </div>
          <div className="space-y-3">
            {movementRows.length > 0 ? (
              movementRows.map((movement) => {
                const product = productsById.get(movement.productId);

                return (
                  <div
                    className="grid gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 md:grid-cols-[1fr_auto]"
                    key={movement.id}
                  >
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {product?.name || `Produto #${movement.productId}`}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {movement.type} · {formatDateTime(movement.occurredAt)}
                      </p>
                      {movement.note ? (
                        <p className="text-muted-foreground text-sm">
                          {movement.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p
                        className={
                          movement.quantityDelta >= 0
                            ? "font-semibold text-emerald-500 text-lg"
                            : "font-semibold text-destructive text-lg"
                        }
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
                description="O historico aparece quando uma compra recebida, venda, ajuste, perda ou avaria gerar movimento no ledger. Use esta tela para conferencias rapidas."
                title="Nenhum movimento registrado ainda"
              />
            )}
          </div>
        </Surface>
      </div>
    </PageLayout>
  );
}
