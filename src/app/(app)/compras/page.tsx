import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import {
  EmptyState,
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
    db
      .select()
      .from(products)
      .where(eq(products.status, "active"))
      .orderBy(desc(products.updatedAt)),
    db.select().from(purchases).orderBy(desc(purchases.createdAt)),
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

  return (
    <PageLayout
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
            href="/produtos"
          >
            Voltar para produtos
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
            href="/estoque"
          >
            Ir para estoque
          </Link>
        </div>
      }
      description="Compras reabrem o fluxo formal de entrada. Aqui voce registra custo composto e so integra ao saldo quando a mercadoria for recebida."
      eyebrow="Entradas"
      title="Compras"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <Surface className="h-fit">
          <div className="mb-5 space-y-2">
            <h2 className="font-semibold text-lg">Nova compra</h2>
            <p className="text-muted-foreground text-sm">
              Registre a entrada planejada primeiro. O estoque so aumenta quando
              a compra for marcada como recebida.
            </p>
          </div>

          {productRows.length > 0 ? (
            <form action={createPurchaseAction} className="space-y-4">
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
                    defaultValue="1"
                    id="quantity"
                    min="1"
                    name="quantity"
                    required
                    step="1"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="supplierAmount"
                  >
                    Valor do fornecedor
                  </label>
                  <input
                    className={inputClassName}
                    defaultValue="0"
                    id="supplierAmount"
                    min="0"
                    name="supplierAmount"
                    required
                    step="0.01"
                    type="number"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="shippingAmount"
                  >
                    Frete
                  </label>
                  <input
                    className={inputClassName}
                    defaultValue="0"
                    id="shippingAmount"
                    min="0"
                    name="shippingAmount"
                    step="0.01"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="cardFeeAmount"
                  >
                    Taxa financeira
                  </label>
                  <input
                    className={inputClassName}
                    defaultValue="0"
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
                    defaultValue="0"
                    id="otherCostsAmount"
                    min="0"
                    name="otherCostsAmount"
                    step="0.01"
                    type="number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="status">
                  Estado inicial
                </label>
                <select
                  className={inputClassName}
                  defaultValue="registered"
                  id="status"
                  name="status"
                >
                  <option value="registered">Registrada</option>
                  <option value="draft">Rascunho</option>
                </select>
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
                className="h-10 w-full rounded-xl bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/90 sm:w-auto"
                type="submit"
              >
                Salvar compra
              </button>
            </form>
          ) : (
            <EmptyState
              description="Cadastre ao menos um produto ativo antes de registrar a primeira compra."
              title="Sem produtos para comprar"
            />
          )}
        </Surface>

        <Surface>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-lg">Compras registradas</h2>
              <p className="text-muted-foreground text-sm">
                Recebimentos de compra recalculam custo medio e integram
                estoque.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 font-medium text-xs">
              {purchaseRows.length} compras
            </span>
          </div>

          <div className="space-y-3">
            {purchaseRows.length > 0 ? (
              purchaseRows.map((purchase) => {
                const product = productMap.get(purchase.productId);

                return (
                  <div
                    className="rounded-2xl border border-border/60 bg-background/70 p-4"
                    key={purchase.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">Compra #{purchase.id}</p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                            {purchase.status}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {product?.name || `Produto #${purchase.productId}`} ·{" "}
                          {formatDateTime(purchase.purchaseDate)}
                        </p>
                      </div>
                      {purchase.status === "received" ||
                      purchase.status === "canceled" ? null : (
                        <div className="flex flex-wrap gap-2">
                          <form action={receivePurchaseAction}>
                            <input
                              name="purchaseId"
                              type="hidden"
                              value={purchase.id}
                            />
                            <button
                              className="h-10 rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
                              type="submit"
                            >
                              Marcar como recebida
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
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">Quantidade</p>
                        <p className="font-semibold">{purchase.quantity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Custo total</p>
                        <p className="font-semibold">
                          {formatCurrency(purchase.totalCost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Custo unitario</p>
                        <p className="font-semibold">
                          {formatCurrency(purchase.unitCost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Recebida em</p>
                        <p className="font-semibold">
                          {formatDateTime(purchase.receivedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                      <p>
                        Fornecedor:{" "}
                        <span className="font-medium">
                          {formatCurrency(purchase.supplierAmount)}
                        </span>
                      </p>
                      <p>
                        Frete:{" "}
                        <span className="font-medium">
                          {formatCurrency(purchase.shippingAmount)}
                        </span>
                      </p>
                      <p>
                        Taxa:{" "}
                        <span className="font-medium">
                          {formatCurrency(purchase.cardFeeAmount)}
                        </span>
                      </p>
                      <p>
                        Outros:{" "}
                        <span className="font-medium">
                          {formatCurrency(purchase.otherCostsAmount)}
                        </span>
                      </p>
                    </div>

                    {purchase.notes ? (
                      <p className="mt-3 text-muted-foreground text-sm">
                        {purchase.notes}
                      </p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <EmptyState
                description="As entradas planejadas aparecem aqui e so impactam o estoque quando forem recebidas."
                title="Nenhuma compra registrada ainda"
              />
            )}
          </div>
        </Surface>
      </div>
    </PageLayout>
  );
}
