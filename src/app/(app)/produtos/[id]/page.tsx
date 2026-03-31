import { ArrowDown01Icon, PackageIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { notFound } from "next/navigation";
import { ProductDetailActions } from "@/components/products/product-detail-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { listCategoriesWithUsage } from "@/features/catalog/server";
import { buildProductInventorySummary } from "@/features/products/history";
import {
  getProductByIdAction,
  getProductStockEntriesByProductIdAction,
  getProductStockWriteOffsByProductIdAction,
} from "../actions";

const formatCurrency = (value: string | number | null) =>
  new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number(value) || 0);

const formatDate = (value: string) =>
  format(parseISO(value), "dd/MM/yyyy", { locale: ptBR });

export default async function ProdutoDetalhePage(
  props: PageProps<"/produtos/[id]">
) {
  const { id } = await props.params;
  const [product, stockEntries, writeOffs, categories] = await Promise.all([
    getProductByIdAction(id),
    getProductStockEntriesByProductIdAction(id),
    getProductStockWriteOffsByProductIdAction(id),
    listCategoriesWithUsage(),
  ]);

  if (!product) {
    notFound();
  }

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
          product={product}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
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
              <p className="text-xs/relaxed">
                {product.description?.trim() || "Sem observacoes."}
              </p>
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
          <CardTitle>Historico</CardTitle>
        </CardHeader>
        <CardContent>
          <Collapsible className="rounded-md border border-border/50">
            <CollapsibleTrigger asChild>
              <Button
                className="w-full justify-between rounded-md px-3"
                type="button"
                variant="ghost"
              >
                Movimentacoes de estoque
                <HugeiconsIcon data-icon="inline-end" icon={ArrowDown01Icon} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-border/50 border-t px-3 py-3">
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
                        {item.variant === "writeOff" ? (
                          <p className="text-destructive">
                            Prej. {formatCurrency(item.totalValue)}
                          </p>
                        ) : (
                          <p>{formatCurrency(item.totalValue)}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}
