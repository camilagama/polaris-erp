import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import {
  EmptyState,
  FeedbackBanner,
  PageLayout,
  Surface,
} from "@/app/(app)/_components/page-layout";
import {
  createProductAction,
  updateProductCommercialDataAction,
  updateProductStatusAction,
} from "@/app/(app)/produtos/actions";
import { ProductForm } from "@/app/(app)/produtos/product-form";
import { db } from "@/db";
import { inventoryMovements, products, systemSettings } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import {
  calculateSuggestedSalePrice,
  toNumber,
} from "@/lib/domain/calculations";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const movementTypeLabels = {
  adjustment_minus: "Correcao negativa",
  adjustment_plus: "Correcao positiva",
  cancel_restock: "Estorno de cancelamento",
  customer_return: "Devolucao de cliente",
  damage: "Avaria",
  initial_stock: "Estoque inicial",
  loss: "Perda",
  purchase_in: "Recebimento de compra",
  sale_out: "Venda",
} as const;

const subtractDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() - days);
  return nextDate;
};

const buildProductsHref = ({
  history,
  productId,
  query,
}: {
  history?: string;
  productId?: number;
  query?: string;
}) => {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("q", query);
  }

  if (productId) {
    searchParams.set("productId", String(productId));
  }

  if (history) {
    searchParams.set("history", history);
  }

  const search = searchParams.toString();
  return search ? `/produtos?${search}` : "/produtos";
};

const getProductsPageState = ({
  productRows,
  resolvedSearchParams,
  settings,
}: {
  productRows: (typeof products.$inferSelect)[];
  resolvedSearchParams: Record<string, string | string[] | undefined>;
  settings: typeof systemSettings.$inferSelect | undefined;
}) => {
  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);
  const historyMode = getSearchParamValue(resolvedSearchParams.history);
  const query = (getSearchParamValue(resolvedSearchParams.q) ?? "").trim();
  const requestedProductId = Number(
    getSearchParamValue(resolvedSearchParams.productId) ?? 0
  );
  const estimatedFeePercent = toNumber(settings?.estimatedFeePercent ?? 5);
  const minimumMarginPercent = toNumber(settings?.minimumMarginPercent ?? 15);
  const targetMarginPercent = toNumber(settings?.targetMarginPercent ?? 25);
  const lowStockThreshold = settings?.lowStockThreshold ?? 2;
  const staleProductDays = settings?.staleProductDays ?? 45;
  const staleCutoff = subtractDays(new Date(), staleProductDays);
  const normalizedQuery = query.toLocaleLowerCase("pt-BR");
  const filteredProducts = productRows.filter((product) => {
    if (!normalizedQuery) {
      return true;
    }

    const searchTarget = [
      product.name,
      product.sku ?? "",
      product.barcode ?? "",
      product.category ?? "",
      product.description ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR");

    return searchTarget.includes(normalizedQuery);
  });
  const selectedProduct =
    productRows.find((product) => product.id === requestedProductId) ?? null;

  return {
    error,
    estimatedFeePercent,
    filteredProducts,
    historyMode,
    lowStockThreshold,
    message,
    minimumMarginPercent,
    query,
    selectedProduct,
    staleCutoff,
    targetMarginPercent,
  };
};

const getSelectedMovements = async (
  historyMode: string | undefined,
  selectedProductId: number | null
) => {
  if (!selectedProductId) {
    return [];
  }

  return db
    .select()
    .from(inventoryMovements)
    .where(eq(inventoryMovements.productId, selectedProductId))
    .orderBy(desc(inventoryMovements.occurredAt))
    .limit(historyMode === "all" ? 50 : 8);
};

const getProductListCardState = (input: {
  estimatedFeePercent: number;
  lowStockThreshold: number;
  minimumMarginPercent: number;
  product: typeof products.$inferSelect;
  selectedProductId: number | null;
  staleCutoff: Date;
}) => {
  const minimumSuggestedPrice = calculateSuggestedSalePrice({
    cost: toNumber(input.product.averageCost),
    feePercent: input.estimatedFeePercent,
    marginPercent: input.minimumMarginPercent,
  });
  const productLowStockThreshold =
    input.product.minimumStock > 0
      ? input.product.minimumStock
      : input.lowStockThreshold;
  const isLowStock =
    input.product.status === "active" &&
    input.product.currentStock <= productLowStockThreshold;
  const isStale =
    input.product.status === "active" &&
    (!input.product.lastSoldAt || input.product.lastSoldAt < input.staleCutoff);
  const isMarginRisk =
    toNumber(input.product.salePrice) < minimumSuggestedPrice;

  return {
    isLowStock,
    isMarginRisk,
    isSelected: input.selectedProductId === input.product.id,
    isStale,
    productLowStockThreshold,
  };
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this page coordinates catalog, details, and history in one server-rendered view.
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [productRows, settingsRows, resolvedSearchParams] = await Promise.all([
    db.select().from(products).orderBy(desc(products.updatedAt)),
    db.select().from(systemSettings).limit(1),
    searchParams,
  ]);

  const {
    error,
    estimatedFeePercent,
    filteredProducts,
    historyMode,
    lowStockThreshold,
    message,
    minimumMarginPercent,
    query,
    selectedProduct,
    staleCutoff,
    targetMarginPercent,
  } = getProductsPageState({
    productRows,
    resolvedSearchParams,
    settings: settingsRows[0],
  });
  const selectedMovements = await getSelectedMovements(
    historyMode,
    selectedProduct?.id ?? null
  );

  return (
    <PageLayout
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
            href="/compras"
          >
            Nova compra
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
            href="/estoque"
          >
            Ajustar estoque
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
            href="/vendas"
          >
            Ir para vendas
          </Link>
        </div>
      }
      description="Produtos agora ficam focados em catalogo, dados comerciais e leitura do item. Entradas e ajustes operacionais foram separados em Compras e Estoque."
      eyebrow="Catalogo"
      title="Produtos"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
        <Surface className="h-fit">
          <div className="mb-5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg">Catalogo</h2>
                <p className="text-muted-foreground text-sm">
                  Selecione um item para consultar seu resumo comercial e o
                  historico de movimentacoes.
                </p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 font-medium text-xs">
                {filteredProducts.length} itens
              </span>
            </div>
            <form action="/produtos" className="space-y-2">
              <label className="font-medium text-sm" htmlFor="q">
                Buscar produto
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className={inputClassName}
                  defaultValue={query}
                  id="q"
                  name="q"
                  placeholder="Nome, SKU, codigo de barras ou categoria"
                />
                <button
                  className="h-10 rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
                  type="submit"
                >
                  Buscar
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            {filteredProducts.length > 0 ? (
              // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: product cards derive multiple operational badges inline for scanability.
              filteredProducts.map((product) => {
                const {
                  isLowStock,
                  isMarginRisk,
                  isSelected,
                  isStale,
                  productLowStockThreshold,
                } = getProductListCardState({
                  estimatedFeePercent,
                  lowStockThreshold,
                  minimumMarginPercent,
                  product,
                  selectedProductId: selectedProduct?.id ?? null,
                  staleCutoff,
                });

                return (
                  <Link
                    className={cn(
                      "block rounded-2xl border border-border/60 bg-background/70 p-4 transition hover:border-primary/40 hover:bg-muted/20",
                      isSelected && "border-primary/50 bg-primary/5"
                    )}
                    href={buildProductsHref({
                      productId: product.id,
                      query,
                    })}
                    key={product.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {product.category || "Sem categoria"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {product.sku ? `SKU ${product.sku}` : "Sem SKU"} ·{" "}
                          {product.barcode
                            ? "Com codigo de barras"
                            : "Sem codigo"}
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                        {product.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-muted-foreground">Estoque</p>
                        <p className="font-semibold">{product.currentStock}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Preco</p>
                        <p className="font-semibold">
                          {formatCurrency(product.salePrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Minimo</p>
                        <p className="font-semibold">
                          {productLowStockThreshold}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {isLowStock ? (
                        <span className="rounded-full bg-amber-500/12 px-2.5 py-1 font-medium text-[11px] text-amber-700 uppercase tracking-[0.08em]">
                          Baixo estoque
                        </span>
                      ) : null}
                      {isStale ? (
                        <span className="rounded-full bg-sky-500/12 px-2.5 py-1 font-medium text-[11px] text-sky-700 uppercase tracking-[0.08em]">
                          Parado
                        </span>
                      ) : null}
                      {isMarginRisk ? (
                        <span className="rounded-full bg-destructive/10 px-2.5 py-1 font-medium text-[11px] text-destructive uppercase tracking-[0.08em]">
                          Margem apertada
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })
            ) : (
              <EmptyState
                description="Tente outro termo de busca ou limpe o filtro para ver o catalogo completo."
                title="Nenhum produto encontrado"
              />
            )}
          </div>
        </Surface>

        <Surface className="min-h-[36rem]">
          {selectedProduct ? (
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-lg">
                      {selectedProduct.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {selectedProduct.category || "Sem categoria"} ·{" "}
                      {selectedProduct.status === "active"
                        ? "Produto ativo"
                        : "Produto inativo"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
                      href={`/compras?productId=${selectedProduct.id}`}
                    >
                      Comprar item
                    </Link>
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
                      href={`/estoque?productId=${selectedProduct.id}`}
                    >
                      Ajustar estoque
                    </Link>
                    <form action={updateProductStatusAction}>
                      <input
                        name="productId"
                        type="hidden"
                        value={selectedProduct.id}
                      />
                      <input
                        name="status"
                        type="hidden"
                        value={
                          selectedProduct.status === "active"
                            ? "inactive"
                            : "active"
                        }
                      />
                      <button
                        className="h-10 w-full rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted sm:w-auto"
                        type="submit"
                      >
                        {selectedProduct.status === "active"
                          ? "Inativar"
                          : "Reativar"}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                      Estoque atual
                    </p>
                    <p className="mt-2 font-semibold text-2xl">
                      {selectedProduct.currentStock}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                      Estoque minimo
                    </p>
                    <p className="mt-2 font-semibold text-2xl">
                      {selectedProduct.minimumStock}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                      Preco atual
                    </p>
                    <p className="mt-2 font-semibold text-2xl">
                      {formatCurrency(selectedProduct.salePrice)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                      Custo medio
                    </p>
                    <p className="mt-2 font-semibold text-2xl">
                      {formatCurrency(selectedProduct.averageCost)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                      Preco minimo
                    </p>
                    <p className="mt-2 font-semibold text-2xl">
                      {formatCurrency(
                        calculateSuggestedSalePrice({
                          cost: toNumber(selectedProduct.averageCost),
                          feePercent: estimatedFeePercent,
                          marginPercent: minimumMarginPercent,
                        })
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                      Preco sugerido
                    </p>
                    <p className="mt-2 font-semibold text-2xl">
                      {formatCurrency(
                        calculateSuggestedSalePrice({
                          cost: toNumber(selectedProduct.averageCost),
                          feePercent: estimatedFeePercent,
                          marginPercent: targetMarginPercent,
                        })
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold">Identificacao do item</h3>
                      <p className="text-muted-foreground text-sm">
                        Dados de referencia para compra, venda e conferencia
                        fisica.
                      </p>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-muted-foreground">SKU</p>
                        <p className="font-medium">
                          {selectedProduct.sku || "Nao informado"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Codigo de barras
                        </p>
                        <p className="font-medium">
                          {selectedProduct.barcode || "Nao informado"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ultima venda</p>
                        <p className="font-medium">
                          {formatDate(selectedProduct.lastSoldAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Descricao</p>
                        <p className="font-medium">
                          {selectedProduct.description || "Sem descricao curta"}
                        </p>
                      </div>
                    </div>
                    {selectedProduct.notes ? (
                      <p className="mt-4 text-muted-foreground text-sm">
                        {selectedProduct.notes}
                      </p>
                    ) : null}
                  </div>

                  <form
                    action={updateProductCommercialDataAction}
                    className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4"
                  >
                    <div className="space-y-1">
                      <h3 className="font-semibold">Atualizar preco</h3>
                      <p className="text-muted-foreground text-sm">
                        O custo medio agora so pode ser alterado por compra
                        recebida. Aqui voce atualiza apenas o preco de venda.
                      </p>
                    </div>
                    <input
                      name="productId"
                      type="hidden"
                      value={selectedProduct.id}
                    />
                    <div className="space-y-2">
                      <label
                        className="font-medium text-sm"
                        htmlFor="salePrice"
                      >
                        Preco de venda
                      </label>
                      <input
                        className={inputClassName}
                        defaultValue={toNumber(selectedProduct.salePrice)}
                        id="salePrice"
                        min="0"
                        name="salePrice"
                        required
                        step="0.01"
                        type="number"
                      />
                    </div>
                    <button
                      className="h-10 w-full rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted sm:w-auto"
                      type="submit"
                    >
                      Salvar preco
                    </button>
                  </form>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h2 className="font-semibold text-lg">Historico do item</h2>
                    <p className="text-muted-foreground text-sm">
                      {historyMode === "all"
                        ? "Mostrando um historico ampliado deste produto."
                        : "Mostrando os 8 movimentos mais recentes deste produto."}
                    </p>
                  </div>
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
                    href={buildProductsHref({
                      history: historyMode === "all" ? undefined : "all",
                      productId: selectedProduct.id,
                      query,
                    })}
                  >
                    {historyMode === "all"
                      ? "Mostrar menos"
                      : "Ver historico completo"}
                  </Link>
                </div>
                <div className="space-y-3">
                  {selectedMovements.length > 0 ? (
                    selectedMovements.map((movement) => (
                      <div
                        className="grid gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 md:grid-cols-[1fr_auto]"
                        key={movement.id}
                      >
                        <div className="space-y-1">
                          <p className="font-semibold">
                            {movementTypeLabels[movement.type]}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {formatDate(movement.occurredAt)}
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
                            custo ref.{" "}
                            {formatCurrency(movement.unitCostSnapshot)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      description="Assim que houver estoque inicial, compra recebida, venda ou ajuste, o historico deste produto aparece aqui."
                      title="Nenhum movimento encontrado"
                    />
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <h2 className="font-semibold text-lg">Novo produto</h2>
                <p className="text-muted-foreground text-sm">
                  Cadastre identificacao, custo, preco e estoque inicial. Depois
                  disso, entradas e ajustes passam a viver em Compras e Estoque.
                </p>
              </div>
              <ProductForm
                action={createProductAction}
                estimatedFeePercent={estimatedFeePercent}
                minimumMarginPercent={minimumMarginPercent}
                targetMarginPercent={targetMarginPercent}
              />
            </div>
          )}
        </Surface>
      </div>
    </PageLayout>
  );
}
