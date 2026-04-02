import { ArrowDown01Icon, PackageIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { notFound } from "next/navigation";
import { ProductDetailActions } from "@/components/products/product-detail-actions";
import { ProductImageFrame } from "@/components/products/product-image-frame";
import { ProductUnitsSoldChart } from "@/components/products/product-sales-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCategoriesWithUsage } from "@/features/catalog/server";
import { buildProductInventorySummary } from "@/features/products/history";
import { getProductSalesHistoryMetrics } from "@/features/products/server";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  getProductByIdQuery,
  getProductSalesByProductIdQuery,
  getProductStockEntriesByProductIdQuery,
  getProductStockWriteOffsByProductIdQuery,
} from "../queries";

export default async function ProdutoDetalhePage(
  props: PageProps<"/produtos/[id]">
) {
  const { id } = await props.params;
  const [product, stockEntries, writeOffs, sales, categories, salesMetrics] =
    await Promise.all([
      getProductByIdQuery(id),
      getProductStockEntriesByProductIdQuery(id),
      getProductStockWriteOffsByProductIdQuery(id),
      getProductSalesByProductIdQuery(id),
      listCategoriesWithUsage(),
      getProductSalesHistoryMetrics(id),
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
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <HugeiconsIcon icon={PackageIcon} strokeWidth={2} />
            Produto
          </div>
          <h1 className="font-semibold text-2xl tracking-tight">
            {product.name}
          </h1>
        </div>
        <ProductDetailActions
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
          linkedSalesCount={linkedSalesCount}
          product={product}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.9fr)_minmax(18rem,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-3 text-xs">
              <span className="text-muted-foreground">Categoria</span>
              <span>{product.categoryName}</span>
              <span className="text-muted-foreground">Compra</span>
              <span>{formatDate(product.purchasedOn)}</span>
              <span className="text-muted-foreground">Status</span>
              <span>{product.archivedAt ? "Arquivado" : "Ativo"}</span>
              <span className="text-muted-foreground">Estoque atual</span>
              <span>{product.stock} un.</span>
              <span className="text-muted-foreground">Preco de venda</span>
              <span>{formatCurrency(product.price)}</span>
              <span className="text-muted-foreground">Observacoes</span>
              <div className="text-xs/relaxed">
                {product.description?.trim() || "Sem observacoes."}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Imagem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center xl:justify-start">
              <div className="w-full max-w-80">
                <div className="relative aspect-[4/3]">
                  <ProductImageFrame
                    alt={`Imagem do produto ${product.name}`}
                    image={product.image}
                    priority
                    shape="wide"
                    sizes="(max-width: 1280px) 50vw, 320px"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-xs">
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Custo medio</p>
                <p className="font-medium text-sm">
                  {formatCurrency(averageCost)}
                </p>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Custo total em estoque</p>
                <p className="font-medium text-sm">
                  {formatCurrency(inventorySummary.totalCost)}
                </p>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Total abastecido</p>
                <p className="font-medium text-sm">
                  {inventorySummary.totalEntries} un.
                </p>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Total baixado</p>
                <p className="font-medium text-sm">
                  {inventorySummary.totalWriteOffs} un.
                </p>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Prejuizo acumulado</p>
                <p className="font-medium text-sm">
                  {formatCurrency(inventorySummary.totalWriteOffLoss)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendas do produto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <ProductUnitsSoldChart
              data={salesMetrics.trend}
              emptyLabel="Esse produto ainda nao tem vendas concluidas."
            />
            <div className="grid gap-3 text-xs">
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Unidades vendidas</p>
                <p className="font-medium text-sm">
                  {salesMetrics.totalQuantitySold} un.
                </p>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Valor vendido</p>
                <p className="font-medium text-sm">
                  {formatCurrency(salesMetrics.totalSoldAmount)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historico</CardTitle>
        </CardHeader>
        <CardContent>
          <details className="group rounded-md border border-border/50">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 font-medium text-xs/relaxed transition-colors hover:bg-muted hover:text-foreground">
              Movimentacoes de estoque
              <HugeiconsIcon
                className="transition-transform group-open:rotate-180"
                data-icon="inline-end"
                icon={ArrowDown01Icon}
              />
            </summary>
            <div className="border-border/50 border-t px-3 py-3">
              <div className="flex flex-col gap-3">
                {inventorySummary.historyItems.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Sem movimentacoes registradas.
                  </p>
                ) : (
                  inventorySummary.historyItems.map((item) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-md border border-border/40 px-3 py-2 text-xs"
                      key={item.id}
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{item.quantityLabel}</p>
                        <p className="text-muted-foreground">
                          {item.label} em {formatDate(item.date)}
                        </p>
                        {item.notes ? (
                          <p className="mt-1 text-muted-foreground">
                            {item.notes}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right text-muted-foreground">
                        <p>{formatCurrency(item.unitCost)}</p>
                        {(() => {
                          if (item.variant === "writeOff") {
                            return (
                              <p className="text-destructive">
                                Prej. {formatCurrency(item.totalValue)}
                              </p>
                            );
                          }

                          if (item.variant === "sale") {
                            return (
                              <p>Saida {formatCurrency(item.totalValue)}</p>
                            );
                          }

                          if (item.variant === "saleReversal") {
                            return (
                              <p className="text-primary">
                                Estorno {formatCurrency(item.totalValue)}
                              </p>
                            );
                          }

                          return <p>{formatCurrency(item.totalValue)}</p>;
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
