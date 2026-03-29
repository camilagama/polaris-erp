import {
  Archive02Icon,
  Coins01Icon,
  Database01Icon,
  PercentIcon,
  Search01Icon,
  ShoppingBasket01Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [productRows, resolvedSearchParams, settings] = await Promise.all([
    db.select().from(products).orderBy(desc(products.updatedAt)),
    searchParams,
    db.query.systemSettings.findFirst(),
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

      <div className="mb-6 flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <HugeiconsIcon
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            icon={Search01Icon}
          />
          <Input className="pl-9" placeholder="Procurar produtos..." />
        </div>
        <div className="flex gap-2">
          <Badge className="px-2 py-1" variant="outline">
            Total: {productRows.length}
          </Badge>
          <Badge className="px-2 py-1" variant="outline">
            Categorias: {categories.length}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[300px]">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      className="size-4"
                      icon={ShoppingBasket01Icon}
                    />
                    <span>Produto</span>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon className="size-4" icon={Tag01Icon} />
                    <span>Categoria</span>
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <HugeiconsIcon className="size-4" icon={Database01Icon} />
                    <span>Custo</span>
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <HugeiconsIcon className="size-4" icon={Coins01Icon} />
                    <span>Venda</span>
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <HugeiconsIcon className="size-4" icon={PercentIcon} />
                    <span>Margem</span>
                  </div>
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {productRows.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center" colSpan={6}>
                    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                      <HugeiconsIcon className="size-8" icon={Archive02Icon} />
                      <p>Nenhum produto cadastrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                productRows.map((product) => {
                  const salePrice = Number(product.salePrice ?? 0);
                  const averageCost = Number(product.averageCost ?? 0);
                  const margin =
                    salePrice > 0
                      ? ((salePrice - averageCost) / salePrice) * 100
                      : 0;

                  const minMargin = Number(settings?.minimumMarginPercent ?? 0);
                  const targetMargin = Number(
                    settings?.targetMarginPercent ?? 0
                  );

                  let marginVariant: "destructive" | "success" | "outline" =
                    "outline";
                  if (margin < minMargin) {
                    marginVariant = "destructive";
                  } else if (margin >= targetMargin) {
                    marginVariant = "success";
                  }

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{product.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            ID: {product.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.category ? (
                          <Badge variant="secondary">{product.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">
                            Sem categoria
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(averageCost)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(salePrice)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Badge className="font-mono" variant={marginVariant}>
                          {margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <UpdatePriceDialog
                          action={updateProductCommercialDataAction}
                          productId={product.id}
                          productName={product.name}
                          salePrice={salePrice}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
