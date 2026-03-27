import { desc, eq } from "drizzle-orm";
import {
  FeedbackBanner,
  PageLayout,
  Surface,
} from "@/app/(app)/_components/page-layout";
import {
  cancelPurchaseAction,
  createPurchaseAction,
  receivePurchaseAction,
} from "@/app/(app)/compras/actions";
import { db } from "@/db";
import { products, purchases } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import { formatCurrency, formatDateTime } from "@/lib/format";

const inputClassName =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [productRows, purchaseRows, resolvedSearchParams] = await Promise.all([
    db.select().from(products).orderBy(desc(products.updatedAt)),
    db
      .select({
        id: purchases.id,
        notes: purchases.notes,
        productId: purchases.productId,
        productName: products.name,
        purchaseDate: purchases.purchaseDate,
        quantity: purchases.quantity,
        receivedAt: purchases.receivedAt,
        status: purchases.status,
        totalCost: purchases.totalCost,
        unitCost: purchases.unitCost,
      })
      .from(purchases)
      .innerJoin(products, eq(products.id, purchases.productId))
      .orderBy(desc(purchases.createdAt)),
    searchParams,
  ]);
  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);

  return (
    <PageLayout
      description="Uma compra recalcula custo medio e entra no estoque apenas quando vira recebida. Antes disso ela segue como planejamento ou registro."
      eyebrow="Compras"
      title="Entradas e custo medio"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <Surface className="h-fit">
          <div className="mb-5 space-y-2">
            <h2 className="font-semibold text-lg">Nova compra</h2>
            <p className="text-muted-foreground text-sm">
              Cadastre o custo completo agora e confirme o recebimento quando a
              mercadoria chegar.
            </p>
          </div>
          <form action={createPurchaseAction} className="space-y-4">
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
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="status">
                  Estado inicial
                </label>
                <select
                  className={inputClassName}
                  id="status"
                  name="status"
                  required
                >
                  <option value="registered">Registered</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="supplierAmount">
                  Custo fornecedor
                </label>
                <input
                  className={inputClassName}
                  id="supplierAmount"
                  min="0"
                  name="supplierAmount"
                  required
                  step="0.01"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="shippingAmount">
                  Frete
                </label>
                <input
                  className={inputClassName}
                  id="shippingAmount"
                  min="0"
                  name="shippingAmount"
                  step="0.01"
                  type="number"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="cardFeeAmount">
                  Taxa cartao
                </label>
                <input
                  className={inputClassName}
                  id="cardFeeAmount"
                  min="0"
                  name="cardFeeAmount"
                  step="0.01"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label
                  className="font-medium text-sm"
                  htmlFor="otherCostsAmount"
                >
                  Outros custos
                </label>
                <input
                  className={inputClassName}
                  id="otherCostsAmount"
                  min="0"
                  name="otherCostsAmount"
                  step="0.01"
                  type="number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="notes">
                Observacoes
              </label>
              <textarea
                className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="notes"
                name="notes"
              />
            </div>
            <button
              className="h-10 rounded-xl bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/90"
              type="submit"
            >
              Registrar compra
            </button>
          </form>
        </Surface>

        <Surface>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Compras lancadas</h2>
              <p className="text-muted-foreground text-sm">
                Receber uma compra e o ponto que altera estoque e custo medio.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 font-medium text-xs">
              {purchaseRows.length} registros
            </span>
          </div>
          <div className="space-y-3">
            {purchaseRows.length > 0 ? (
              purchaseRows.map((purchase) => (
                <div
                  className="grid gap-4 rounded-2xl border border-border/60 bg-background/70 p-4 md:grid-cols-[1fr_auto]"
                  key={purchase.id}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{purchase.productName}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                        {purchase.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {purchase.quantity} un · total{" "}
                      {formatCurrency(purchase.totalCost)} · unit{" "}
                      {formatCurrency(purchase.unitCost)}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      lancada em {formatDateTime(purchase.purchaseDate)}
                      {purchase.receivedAt
                        ? ` · recebida em ${formatDateTime(purchase.receivedAt)}`
                        : ""}
                    </p>
                    {purchase.notes ? (
                      <p className="text-muted-foreground text-sm">
                        {purchase.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-start justify-end gap-2">
                    {purchase.status !== "received" &&
                    purchase.status !== "canceled" ? (
                      <>
                        <form action={receivePurchaseAction}>
                          <input
                            name="purchaseId"
                            type="hidden"
                            value={purchase.id}
                          />
                          <button
                            className="h-10 rounded-xl bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/90"
                            type="submit"
                          >
                            Marcar recebida
                          </button>
                        </form>
                        <form action={cancelPurchaseAction}>
                          <input
                            name="purchaseId"
                            type="hidden"
                            value={purchase.id}
                          />
                          <button
                            className="h-10 rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
                            type="submit"
                          >
                            Cancelar
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
                Nenhuma compra registrada ainda.
              </div>
            )}
          </div>
        </Surface>
      </div>
    </PageLayout>
  );
}
