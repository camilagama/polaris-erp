import { desc } from "drizzle-orm";
import {
  FeedbackBanner,
  PageLayout,
} from "@/app/(app)/_components/page-layout";
import {
  createProductAction,
  updateProductCommercialDataAction,
  updateProductStatusAction,
} from "@/app/(app)/produtos/actions";
import {
  ProductDialogs,
  UpdatePriceDialog,
} from "@/app/(app)/produtos/product-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { products, systemSettings } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import { formatCurrency } from "@/lib/format";

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

  const categories = Array.from(
    new Set(
      productRows
        .map((p) => p.category)
        .filter((c): c is string => !!c && c.trim() !== "")
    )
  ).sort();

  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);
  const lowStockThreshold = settingsRows[0]?.lowStockThreshold ?? 2;

  return (
    <PageLayout
      actions={
        <ProductDialogs
          categories={categories}
          createProductAction={createProductAction}
        />
      }
      description="Gerencie o catálogo de produtos: cadastre, edite preços e controle o status."
      eyebrow="Catálogo"
      title="Produtos"
    >
      <FeedbackBanner error={error} message={message} />

      <Card>
        <CardHeader>
          <CardTitle>Catálogo</CardTitle>
        </CardHeader>
        <CardContent>
          {productRows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Em estoque</TableHead>
                  <TableHead>Custo médio</TableHead>
                  <TableHead>Preço venda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productRows.map((product) => {
                  const isLowStock =
                    product.status === "active" &&
                    product.currentStock <= lowStockThreshold;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <span className="font-semibold">{product.name}</span>
                      </TableCell>
                      <TableCell>{product.category || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              isLowStock ? "font-bold text-destructive" : ""
                            }
                          >
                            {product.currentStock}
                          </span>
                          {isLowStock && (
                            <Badge
                              className="h-5 px-1.5 text-[10px] uppercase"
                              variant="destructive"
                            >
                              Baixo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(product.averageCost)}
                      </TableCell>
                      <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(product.salePrice)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="font-normal"
                          variant={
                            product.status === "active"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {product.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <UpdatePriceDialog
                            action={updateProductCommercialDataAction}
                            productId={product.id}
                            productName={product.name}
                            salePrice={Number(product.salePrice ?? 0)}
                          />
                          <form action={updateProductStatusAction}>
                            <input
                              name="productId"
                              type="hidden"
                              value={product.id}
                            />
                            <input
                              name="status"
                              type="hidden"
                              value={
                                product.status === "active"
                                  ? "inactive"
                                  : "active"
                              }
                            />
                            <Button size="sm" type="submit" variant="ghost">
                              {product.status === "active"
                                ? "Inativar"
                                : "Ativar"}
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Nenhum produto cadastrado. Use o botão acima para começar.
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
