import { notFound } from "next/navigation";
import { ProductDetailActions } from "@/components/products/product-detail-actions";
import { ProductHistoryPanel } from "@/components/products/product-history-panel";
import { ProductImageFrame } from "@/components/products/product-image-frame";
import { ProductUnitsSoldChart } from "@/components/products/product-sales-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCatalogSettings,
  listCategoriesWithUsage,
} from "@/features/catalog/server";
import { buildProductInventorySummary } from "@/features/products/history";
import {
  getProductByIdQuery,
  getProductPriceChangesByProductIdQuery,
  getProductSalesByProductIdQuery,
  getProductStockEntriesByProductIdQuery,
  getProductStockWriteOffsByProductIdQuery,
} from "@/features/products/queries";
import { getProductSalesHistoryMetrics } from "@/features/products/server";
import { requirePageAppContext } from "@/lib/app-session";
import { formatCurrency } from "@/lib/formatters";

export default async function ProdutoDetalhePage(
  props: PageProps<"/produtos/[id]">
) {
  const context = await requirePageAppContext();
  const { id } = await props.params;
  const product = await getProductByIdQuery(context.organizationId, id);

  if (!product) {
    notFound();
  }

  const [
    stockEntries,
    writeOffs,
    sales,
    categories,
    settings,
    salesMetrics,
    priceChanges,
  ] = await Promise.all([
    getProductStockEntriesByProductIdQuery(context.organizationId, id),
    getProductStockWriteOffsByProductIdQuery(context.organizationId, id),
    getProductSalesByProductIdQuery(context.organizationId, id),
    listCategoriesWithUsage(context.organizationId),
    getCatalogSettings(context.organizationId),
    getProductSalesHistoryMetrics(context.organizationId, id),
    getProductPriceChangesByProductIdQuery(context.organizationId, id),
  ]);

  const averageCost = Number(product.costPrice);
  const initialEntryId =
    stockEntries
      .filter(
        (entry) =>
          entry.stockedOn === product.purchasedOn &&
          Math.abs(entry.createdAt.getTime() - product.createdAt.getTime()) <=
            60_000
      )
      .sort(
        (left, right) =>
          Math.abs(left.createdAt.getTime() - product.createdAt.getTime()) -
          Math.abs(right.createdAt.getTime() - product.createdAt.getTime())
      )[0]?.id ?? null;
  const inventorySummary = buildProductInventorySummary({
    averageCost,
    currentStock: product.stock,
    entries: stockEntries.map((entry) => ({
      createdAt: entry.createdAt.toISOString(),
      date: entry.stockedOn,
      id: entry.id,
      isInitial: entry.id === initialEntryId,
      quantity: entry.quantity,
      unitCost: Number(entry.unitCost),
    })),
    sales: sales.map((saleItem) => ({
      cancelledAt: saleItem.cancelledAt
        ? saleItem.cancelledAt.toISOString()
        : null,
      createdAt: saleItem.createdAt.toISOString(),
      date: saleItem.occurredOn,
      id: saleItem.id,
      quantity: saleItem.quantity,
      saleId: saleItem.saleId,
      status: saleItem.status,
      unitCost: Number(saleItem.unitCostSnapshot),
    })),
    writeOffs: writeOffs.map((writeOff) => ({
      createdAt: writeOff.createdAt.toISOString(),
      date: writeOff.happenedOn,
      id: writeOff.id,
      notes: writeOff.notes,
      quantity: writeOff.quantity,
      reason: writeOff.reason,
      unitCost: Number(writeOff.unitCostSnapshot),
    })),
  });

  return (
    <div className="flex flex-col gap-6 p-4 pb-20 sm:p-6 sm:pb-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-6 sm:flex-row">
                <div className="size-24 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted/30 sm:size-32">
                  <ProductImageFrame
                    alt={`Imagem do produto ${product.name}`}
                    image={product.image}
                    priority
                    sizes="128px"
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <h1 className="font-semibold text-2xl tracking-tight">
                      {product.name}
                    </h1>
                    <ProductDetailActions
                      categories={categories.map((category) => ({
                        id: category.id,
                        name: category.name,
                      }))}
                      product={product}
                      settings={settings}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                        Categoria
                      </p>
                      <p className="font-medium text-sm">
                        {product.categoryName}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                        Status
                      </p>
                      <p className="font-medium text-sm">
                        {product.archivedAt ? "Arquivado" : "Ativo"}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                        Estoque
                      </p>
                      <p className="font-medium text-sm">{product.stock} un.</p>
                    </div>
                    {product.description ? (
                      <div className="col-span-2 mt-2 sm:col-span-3">
                        <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                          Observacoes
                        </p>
                        <p className="text-foreground/80 text-sm">
                          {product.description.trim()}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-col justify-between gap-2 pb-4 sm:flex-row sm:items-center">
              <CardTitle className="text-base">Vendas do Produto</CardTitle>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="mr-1.5 text-muted-foreground">
                    Unidades:
                  </span>
                  <span className="font-medium">
                    {salesMetrics.totalQuantitySold}
                  </span>
                </div>
                <div>
                  <span className="mr-1.5 text-muted-foreground">Total:</span>
                  <span className="font-medium">
                    {formatCurrency(salesMetrics.totalSoldAmount)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ProductUnitsSoldChart
                data={salesMetrics.trend}
                emptyLabel="Nenhuma venda concluida."
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 bg-muted/10 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                Indicadores Financeiros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between border-border/40 border-b pb-3">
                <span className="text-muted-foreground text-sm">
                  Preco de Venda
                </span>
                <span className="font-medium text-sm">
                  {formatCurrency(product.price)}
                </span>
              </div>
              <div className="flex items-center justify-between border-border/40 border-b pb-3">
                <span className="text-muted-foreground text-sm">
                  Custo Medio
                </span>
                <span className="font-medium text-sm">
                  {formatCurrency(averageCost)}
                </span>
              </div>
              <div className="flex items-center justify-between border-border/40 border-b pb-3">
                <span className="text-muted-foreground text-sm">
                  Valor do estoque atual
                </span>
                <span className="font-medium text-sm">
                  {formatCurrency(inventorySummary.totalCost)}
                </span>
              </div>
              <div className="flex items-center justify-between border-border/40 border-b pb-3">
                <span className="text-muted-foreground text-sm">Baixas</span>
                <span className="font-medium text-sm">
                  {inventorySummary.totalWriteOffs} un.
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Prejuizo</span>
                <span className="font-medium text-destructive text-sm">
                  {formatCurrency(inventorySummary.totalWriteOffLoss)}
                </span>
              </div>
            </CardContent>
          </Card>

          <ProductHistoryPanel
            inventoryItems={inventorySummary.historyItems}
            priceChanges={priceChanges}
          />
        </div>
      </div>
    </div>
  );
}
