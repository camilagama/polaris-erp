import { PackageIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { notFound } from "next/navigation";
import { ProductDetailActions } from "@/components/products/product-detail-actions";
import { ProductImageFrame } from "@/components/products/product-image-frame";
import { ProductUnitsSoldChart } from "@/components/products/product-sales-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCatalogSettings,
  listCategoriesWithUsage,
} from "@/features/catalog/server";
import { buildProductInventorySummary } from "@/features/products/history";
import { getProductSalesHistoryMetrics } from "@/features/products/server";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import {
  getProductByIdQuery,
  getProductPriceChangesByProductIdQuery,
  getProductSalesByProductIdQuery,
  getProductStockEntriesByProductIdQuery,
  getProductStockWriteOffsByProductIdQuery,
} from "../queries";

export default async function ProdutoDetalhePage(
  props: PageProps<"/produtos/[id]">
) {
  const { id } = await props.params;
  const [
    product,
    stockEntries,
    writeOffs,
    sales,
    categories,
    settings,
    salesMetrics,
    priceChanges,
  ] = await Promise.all([
    getProductByIdQuery(id),
    getProductStockEntriesByProductIdQuery(id),
    getProductStockWriteOffsByProductIdQuery(id),
    getProductSalesByProductIdQuery(id),
    listCategoriesWithUsage(),
    getCatalogSettings(),
    getProductSalesHistoryMetrics(id),
    getProductPriceChangesByProductIdQuery(id),
  ]);

  if (!product) {
    notFound();
  }

  const linkedSalesCount = new Set(sales.map((saleItem) => saleItem.saleId))
    .size;
  const averageCost = Number(product.costPrice);
  const inventorySummary = buildProductInventorySummary({
    averageCost,
    currentStock: product.stock,
    entries: stockEntries.map((entry) => ({
      createdAt: entry.createdAt.toISOString(),
      date: entry.stockedOn,
      id: entry.id,
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <HugeiconsIcon icon={PackageIcon} size={16} strokeWidth={2} />
          Produto
        </div>
        <ProductDetailActions
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
          linkedSalesCount={linkedSalesCount}
          product={product}
          settings={settings}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Detalhes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6 sm:flex-row">
                <div className="size-24 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted/30 sm:size-32">
                  <ProductImageFrame
                    alt={`Imagem do produto ${product.name}`}
                    image={product.image}
                    priority
                    sizes="128px"
                  />
                </div>
                <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
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
                      Estoque Atual
                    </p>
                    <p className="font-medium text-sm">{product.stock} un.</p>
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
                      Data da Compra
                    </p>
                    <p className="font-medium text-sm">
                      {formatDate(product.purchasedOn)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                      Preço de Venda
                    </p>
                    <p className="font-medium text-sm">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                  {product.description && (
                    <div className="col-span-2 mt-2 sm:col-span-3">
                      <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                        Observações
                      </p>
                      <p className="text-foreground/80 text-sm">
                        {product.description.trim()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-col justify-between gap-2 pb-4 sm:flex-row sm:items-center">
              <CardTitle className="text-lg">Vendas do Produto</CardTitle>
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
                emptyLabel="Nenhuma venda concluída."
              />
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                Histórico de Movimentações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inventorySummary.historyItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Sem movimentações registradas.
                </p>
              ) : (
                <div className="relative ml-2 space-y-6 border-border/50 border-l pl-5 sm:ml-3">
                  {inventorySummary.historyItems.map((item) => (
                    <div className="relative" key={item.id}>
                      <div className="absolute top-1.5 -left-[1.60rem] size-2.5 rounded-full border border-border bg-muted sm:-left-[1.65rem]" />
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-medium text-sm">
                            {item.quantityLabel}
                          </p>
                          <p className="mt-0.5 text-muted-foreground text-xs">
                            {item.label} em {formatDate(item.date)}
                          </p>
                          {item.notes && (
                            <p className="mt-1.5 text-muted-foreground/80 text-xs italic">
                              "{item.notes}"
                            </p>
                          )}
                        </div>
                        <div className="text-sm sm:text-right">
                          <p>{formatCurrency(item.unitCost)} un.</p>
                          {(() => {
                            if (item.variant === "writeOff") {
                              return (
                                <p className="mt-0.5 font-medium text-destructive">
                                  Prej. {formatCurrency(item.totalValue)}
                                </p>
                              );
                            }
                            if (item.variant === "sale") {
                              return (
                                <p className="mt-0.5 text-muted-foreground">
                                  Saída {formatCurrency(item.totalValue)}
                                </p>
                              );
                            }
                            if (item.variant === "saleReversal") {
                              return (
                                <p className="mt-0.5 font-medium text-primary">
                                  Estorno {formatCurrency(item.totalValue)}
                                </p>
                              );
                            }
                            return (
                              <p className="mt-0.5 font-medium">
                                {formatCurrency(item.totalValue)}
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 bg-muted/10 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Indicadores Financeiros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border-border/40 border-b pb-3">
                <span className="text-muted-foreground text-sm">
                  Custo Médio
                </span>
                <span className="font-medium">
                  {formatCurrency(averageCost)}
                </span>
              </div>
              <div className="flex items-center justify-between border-border/40 border-b pb-3">
                <span className="text-muted-foreground text-sm">
                  Custo em Estoque
                </span>
                <span className="font-medium">
                  {formatCurrency(inventorySummary.totalCost)}
                </span>
              </div>
              <div className="flex items-center justify-between border-border/40 border-b pb-3">
                <span className="text-muted-foreground text-sm">
                  Abastecimentos
                </span>
                <span className="font-medium">
                  {inventorySummary.totalEntries} un.
                </span>
              </div>
              <div className="flex items-center justify-between border-border/40 border-b pb-3">
                <span className="text-muted-foreground text-sm">Baixas</span>
                <span className="font-medium">
                  {inventorySummary.totalWriteOffs} un.
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Prejuízo</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(inventorySummary.totalWriteOffLoss)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-muted/10 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Histórico de Preços</CardTitle>
            </CardHeader>
            <CardContent>
              {priceChanges.length > 0 ? (
                <div className="space-y-4">
                  {priceChanges.map((change, index) => (
                    <div
                      className={
                        index === priceChanges.length - 1
                          ? ""
                          : "border-border/40 border-b pb-3"
                      }
                      key={change.id}
                    >
                      <div className="flex justify-between">
                        <span className="flex gap-2 font-medium text-sm">
                          <span className="text-muted-foreground line-through">
                            {formatCurrency(change.previousPrice)}
                          </span>
                          <span>{formatCurrency(change.nextPrice)}</span>
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {change.changedByUserName ?? "Usuário"}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDateTime(change.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Nenhuma alteração registrada.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
