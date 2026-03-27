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
  createProductMovementAction,
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
const textAreaClassName =
  "min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const movementTypeLabels = {
  adjustment_minus: "Correcao negativa",
  adjustment_plus: "Correcao positiva",
  cancel_restock: "Estorno de cancelamento",
  customer_return: "Devolucao",
  damage: "Avaria",
  loss: "Perda",
  purchase_in: "Reposicao",
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
    .limit(historyMode === "all" ? 50 : 5);
};

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
            href="/produtos"
          >
            Novo produto
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
            href="/vendas"
          >
            Ir para vendas
          </Link>
        </div>
      }
      description="Produtos agora concentram cadastro, estoque, preco e historico. A ideia e operar o item inteiro em um unico lugar."
      eyebrow="Catalogo"
      title="Produtos"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Surface className="h-fit">
          <div className="mb-5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg">Catalogo</h2>
                <p className="text-muted-foreground text-sm">
                  Clique em um item para ver resumo, movimentar estoque e
                  consultar o historico sem sair desta tela.
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
                  placeholder="Nome, categoria ou descricao"
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
              filteredProducts.map((product) => {
                const minimumSuggestedPrice = calculateSuggestedSalePrice({
                  cost: toNumber(product.averageCost),
                  feePercent: estimatedFeePercent,
                  marginPercent: minimumMarginPercent,
                });
                const isLowStock =
                  product.status === "active" &&
                  product.currentStock <= lowStockThreshold;
                const isStale =
                  product.status === "active" &&
                  (!product.lastSoldAt || product.lastSoldAt < staleCutoff);
                const isMarginRisk =
                  toNumber(product.salePrice) < minimumSuggestedPrice;
                const productHref = buildProductsHref({
                  productId: product.id,
                  query,
                });

                return (
                  <Link
                    className={cn(
                      "block rounded-2xl border border-border/60 bg-background/70 p-4 transition hover:border-primary/40 hover:bg-muted/20",
                      selectedProduct?.id === product.id &&
                        "border-primary/50 bg-primary/5"
                    )}
                    href={productHref}
                    key={product.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {product.category || "Sem categoria"}
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
                        <p className="text-muted-foreground">Custo atual</p>
                        <p className="font-semibold">
                          {formatCurrency(product.averageCost)}
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
                      {selectedProduct.category || "Sem categoria"} -{" "}
                      {selectedProduct.status === "active"
                        ? "Produto ativo"
                        : "Produto inativo"}
                    </p>
                  </div>
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
                      Custo atual
                    </p>
                    <p className="mt-2 font-semibold text-2xl">
                      {formatCurrency(selectedProduct.averageCost)}
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
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                      Ultima venda
                    </p>
                    <p className="mt-2 font-semibold text-lg">
                      {formatDate(selectedProduct.lastSoldAt)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <form
                    action={updateProductCommercialDataAction}
                    className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4"
                  >
                    <div className="space-y-1">
                      <h3 className="font-semibold">Editar preco</h3>
                      <p className="text-muted-foreground text-sm">
                        Atualize o preco de venda sem sair do contexto do
                        produto.
                      </p>
                    </div>
                    <input
                      name="productId"
                      type="hidden"
                      value={selectedProduct.id}
                    />
                    <input
                      className={inputClassName}
                      defaultValue={toNumber(selectedProduct.salePrice)}
                      min="0"
                      name="salePrice"
                      required
                      step="0.01"
                      type="number"
                    />
                    <button
                      className="h-10 w-full rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted sm:w-auto"
                      type="submit"
                    >
                      Salvar preco
                    </button>
                  </form>

                  <form
                    action={updateProductCommercialDataAction}
                    className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4"
                  >
                    <div className="space-y-1">
                      <h3 className="font-semibold">Editar custo atual</h3>
                      <p className="text-muted-foreground text-sm">
                        Use apenas quando precisar corrigir o custo base do
                        produto.
                      </p>
                    </div>
                    <input
                      name="productId"
                      type="hidden"
                      value={selectedProduct.id}
                    />
                    <input
                      className={inputClassName}
                      defaultValue={toNumber(selectedProduct.averageCost)}
                      min="0"
                      name="averageCost"
                      required
                      step="0.01"
                      type="number"
                    />
                    <button
                      className="h-10 w-full rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted sm:w-auto"
                      type="submit"
                    >
                      Salvar custo
                    </button>
                  </form>
                </div>
              </section>

              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="font-semibold text-lg">Operacoes do item</h2>
                  <p className="text-muted-foreground text-sm">
                    Reposicao e correcao ficam visiveis o tempo todo. Excecoes
                    ficam em acoes avancadas.
                  </p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <form
                    action={createProductMovementAction}
                    className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4"
                  >
                    <div className="space-y-1">
                      <h3 className="font-semibold">Repor estoque</h3>
                      <p className="text-muted-foreground text-sm">
                        Recalcula o custo medio com base na nova entrada.
                      </p>
                    </div>
                    <input
                      name="productId"
                      type="hidden"
                      value={selectedProduct.id}
                    />
                    <input name="type" type="hidden" value="purchase_in" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          className="font-medium text-sm"
                          htmlFor="restock-quantity"
                        >
                          Quantidade
                        </label>
                        <input
                          className={inputClassName}
                          id="restock-quantity"
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
                          htmlFor="restock-cost"
                        >
                          Custo unitario
                        </label>
                        <input
                          className={inputClassName}
                          id="restock-cost"
                          min="0"
                          name="unitCost"
                          required
                          step="0.01"
                          type="number"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label
                        className="font-medium text-sm"
                        htmlFor="restock-note"
                      >
                        Observacao
                      </label>
                      <textarea
                        className={textAreaClassName}
                        id="restock-note"
                        name="note"
                      />
                    </div>
                    <button
                      className="h-10 w-full rounded-xl bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/90 sm:w-auto"
                      type="submit"
                    >
                      Registrar reposicao
                    </button>
                  </form>

                  <form
                    action={createProductMovementAction}
                    className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4"
                  >
                    <div className="space-y-1">
                      <h3 className="font-semibold">Corrigir estoque</h3>
                      <p className="text-muted-foreground text-sm">
                        Ajusta o saldo sem recalcular custo medio.
                      </p>
                    </div>
                    <input
                      name="productId"
                      type="hidden"
                      value={selectedProduct.id}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          className="font-medium text-sm"
                          htmlFor="adjustment-type"
                        >
                          Tipo
                        </label>
                        <select
                          className={inputClassName}
                          defaultValue="adjustment_plus"
                          id="adjustment-type"
                          name="type"
                        >
                          <option value="adjustment_plus">
                            Correcao positiva
                          </option>
                          <option value="adjustment_minus">
                            Correcao negativa
                          </option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label
                          className="font-medium text-sm"
                          htmlFor="adjustment-quantity"
                        >
                          Quantidade
                        </label>
                        <input
                          className={inputClassName}
                          id="adjustment-quantity"
                          min="1"
                          name="quantity"
                          required
                          step="1"
                          type="number"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label
                        className="font-medium text-sm"
                        htmlFor="adjustment-note"
                      >
                        Observacao
                      </label>
                      <textarea
                        className={textAreaClassName}
                        id="adjustment-note"
                        name="note"
                      />
                    </div>
                    <button
                      className="h-10 w-full rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted sm:w-auto"
                      type="submit"
                    >
                      Registrar correcao
                    </button>
                  </form>
                </div>

                <details className="rounded-2xl border border-border/60 bg-background/60 p-4">
                  <summary className="cursor-pointer list-none font-semibold">
                    Acoes avancadas
                  </summary>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Use apenas para excecoes como perda, avaria ou devolucao.
                  </p>
                  <form
                    action={createProductMovementAction}
                    className="mt-4 space-y-3"
                  >
                    <input
                      name="productId"
                      type="hidden"
                      value={selectedProduct.id}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          className="font-medium text-sm"
                          htmlFor="advanced-type"
                        >
                          Acao
                        </label>
                        <select
                          className={inputClassName}
                          defaultValue="loss"
                          id="advanced-type"
                          name="type"
                        >
                          <option value="loss">Perda</option>
                          <option value="damage">Avaria</option>
                          <option value="customer_return">Devolucao</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label
                          className="font-medium text-sm"
                          htmlFor="advanced-quantity"
                        >
                          Quantidade
                        </label>
                        <input
                          className={inputClassName}
                          id="advanced-quantity"
                          min="1"
                          name="quantity"
                          required
                          step="1"
                          type="number"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label
                        className="font-medium text-sm"
                        htmlFor="advanced-note"
                      >
                        Observacao
                      </label>
                      <textarea
                        className={textAreaClassName}
                        id="advanced-note"
                        name="note"
                      />
                    </div>
                    <button
                      className="h-10 w-full rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted sm:w-auto"
                      type="submit"
                    >
                      Salvar acao avancada
                    </button>
                  </form>
                </details>
              </section>

              <section className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h2 className="font-semibold text-lg">Historico do item</h2>
                    <p className="text-muted-foreground text-sm">
                      {historyMode === "all"
                        ? "Mostrando um historico ampliado deste produto."
                        : "Mostrando os 5 movimentos mais recentes deste produto."}
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
                      description="Assim que houver reposicao, correcao, perda, venda ou cancelamento, o historico deste produto aparece aqui."
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
                  Cadastre nome, custo, preco e estoque inicial. Depois disso,
                  toda a manutencao do item acontece aqui mesmo.
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
