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
import { db } from "@/db";
import { products } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import { formatCurrency } from "@/lib/format";

const inputClassName =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const textAreaClassName =
  "min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [productRows, resolvedSearchParams] = await Promise.all([
    db.select().from(products).orderBy(asc(products.name)),
    searchParams,
  ]);
  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);

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
              Cadastre apenas o necessario para operar compras, estoque e
              vendas.
            </p>
          </div>
          <form action={createProductAction} className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="name">
                Nome
              </label>
              <input
                className={inputClassName}
                id="name"
                name="name"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="category">
                  Categoria
                </label>
                <input
                  className={inputClassName}
                  id="category"
                  name="category"
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="description">
                  Descricao curta
                </label>
                <input
                  className={inputClassName}
                  id="description"
                  name="description"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="notes">
                Observacoes
              </label>
              <textarea className={textAreaClassName} id="notes" name="notes" />
            </div>
            <button
              className="h-10 rounded-xl bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/90"
              type="submit"
            >
              Salvar produto
            </button>
          </form>
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
                    </div>
                    <form
                      action={updateProductStatusAction}
                      className="self-start"
                    >
                      <input
                        name="productId"
                        type="hidden"
                        value={product.id}
                      />
                      <input name="status" type="hidden" value={nextStatus} />
                      <button
                        className="h-10 rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
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
