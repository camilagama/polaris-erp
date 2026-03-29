import { desc } from "drizzle-orm";
import {
  FeedbackBanner,
  PageLayout,
} from "@/app/(app)/_components/page-layout";
import {
  createProductAction,
  updateProductCommercialDataAction,
} from "@/app/(app)/produtos/actions";
import {
  ProductDialogs,
  UpdatePriceDialog,
} from "@/app/(app)/produtos/product-dialogs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import { formatCurrency } from "@/lib/format";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [productRows, resolvedSearchParams] = await Promise.all([
    db.select().from(products).orderBy(desc(products.updatedAt)),
    searchParams,
  ]);

  const categories = Array.from(
    new Set(
      productRows
        .map((p) => p.category)
        .filter((c): c is string => !!c && c.trim() !== "")
    )
  ).sort();

  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);

  return (
    <PageLayout
      actions={
        <ProductDialogs
          categories={categories}
          createProductAction={createProductAction}
        />
      }
      description="Gerencie o catálogo de produtos: cadastre, edite preços e acompanhe o estoque."
      eyebrow="Catálogo"
      title="Produtos"
    >
      <FeedbackBanner error={error} message={message} />

      {productRows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Em estoque</TableHead>
              <TableHead>Custo médio</TableHead>
              <TableHead>Preço venda</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productRows.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <span className="font-semibold">{product.name}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {product.category || "-"}
                </TableCell>
                <TableCell>{product.currentStock}</TableCell>
                <TableCell>{formatCurrency(product.averageCost)}</TableCell>
                <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(product.salePrice)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <UpdatePriceDialog
                      action={updateProductCommercialDataAction}
                      productId={product.id}
                      productName={product.name}
                      salePrice={Number(product.salePrice ?? 0)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded-2xl border border-border border-dashed bg-muted/20 py-16 text-center">
          <p className="font-semibold text-base">Nenhum produto cadastrado</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Use o botão acima para adicionar o primeiro produto.
          </p>
        </div>
      )}
    </PageLayout>
  );
}
