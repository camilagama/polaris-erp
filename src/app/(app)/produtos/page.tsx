import { asc } from "drizzle-orm";
import {
  EmptyState,
  FeedbackBanner,
  PageLayout,
  Surface,
} from "@/app/(app)/_components/page-layout";
import {
  createProductAction,
  updateProductStatusAction,
} from "@/app/(app)/produtos/actions";
import { ProductForm } from "@/app/(app)/produtos/product-form";
import { db } from "@/db";
import { products, systemSettings } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import {
  calculateSuggestedSalePrice,
  toNumber,
} from "@/lib/domain/calculations";
import { formatCurrency } from "@/lib/format";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [productRows, settingsRows, resolvedSearchParams] = await Promise.all([
    db.select().from(products).orderBy(asc(products.name)),
    db.select().from(systemSettings).limit(1),
    searchParams,
  ]);
  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);
  const settings = settingsRows[0];
  const estimatedFeePercent = toNumber(settings?.estimatedFeePercent ?? 5);
  const minimumMarginPercent = toNumber(settings?.minimumMarginPercent ?? 15);
  const targetMarginPercent = toNumber(settings?.targetMarginPercent ?? 25);

  return (
    <PageLayout
      description="Produtos ficam simples na V1: sem variacao, com categoria textual opcional, status ativo ou inativo e indicadores operacionais visiveis."
      eyebrow="Catalogo"
      title="Produtos"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <Surface className="h-fit">
          <div className="mb-5 space-y-2">
            <h2 className="font-semibold text-lg">Novo produto</h2>
            <p className="text-muted-foreground text-sm">
              O cadastro ja concentra custo, preco e estoque inicial. Reposicao
              futura entra direto pelo modulo de estoque.
            </p>
          </div>
          <ProductForm
            action={createProductAction}
            estimatedFeePercent={estimatedFeePercent}
            minimumMarginPercent={minimumMarginPercent}
            targetMarginPercent={targetMarginPercent}
          />
        </Surface>

        <Surface>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Catalogo ativo</h2>
              <p className="text-muted-foreground text-sm">
                Estoque atual e custo medio ja refletem o ledger operacional.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 font-medium text-xs">
              {productRows.length} itens
            </span>
          </div>
          <div className="space-y-3">
            {productRows.length > 0 ? (
              productRows.map((product) => {
                const nextStatus =
                  product.status === "active" ? "inactive" : "active";

                return (
                  <div
                    className="grid gap-4 rounded-2xl border border-border/60 bg-background/70 p-4 md:grid-cols-[1.2fr_0.8fr_auto]"
                    key={product.id}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{product.name}</p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                          {product.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {product.category || "Sem categoria"} ·{" "}
                        {product.description || "Sem descricao curta"}
                      </p>
                      {product.notes ? (
                        <p className="text-muted-foreground text-sm">
                          {product.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-2 md:grid-cols-1">
                      <div>
                        <p className="text-muted-foreground">Estoque atual</p>
                        <p className="font-semibold">{product.currentStock}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Custo medio</p>
                        <p className="font-semibold">
                          {formatCurrency(product.averageCost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Preco atual</p>
                        <p className="font-semibold">
                          {formatCurrency(product.salePrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Preco minimo</p>
                        <p className="font-semibold">
                          {formatCurrency(
                            calculateSuggestedSalePrice({
                              cost: toNumber(product.averageCost),
                              feePercent: estimatedFeePercent,
                              marginPercent: minimumMarginPercent,
                            })
                          )}
                        </p>
                      </div>
                    </div>
                    <form
                      action={updateProductStatusAction}
                      className="self-start md:justify-self-end"
                    >
                      <input
                        name="productId"
                        type="hidden"
                        value={product.id}
                      />
                      <input name="status" type="hidden" value={nextStatus} />
                      <button
                        className="h-10 w-full rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted sm:w-auto"
                        type="submit"
                      >
                        {nextStatus === "inactive" ? "Inativar" : "Reativar"}
                      </button>
                    </form>
                  </div>
                );
              })
            ) : (
              <EmptyState
                description="Comece cadastrando o primeiro item no formulario ao lado. Sem produto ativo, compras, estoque e vendas nao conseguem operar."
                title="Nenhum produto cadastrado ainda"
              />
            )}
          </div>
        </Surface>
      </div>
    </PageLayout>
  );
}
