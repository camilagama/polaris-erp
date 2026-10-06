import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@polaris/ui/components/ui/breadcrumb";
import { Button } from "@polaris/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@polaris/ui/components/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetailActions } from "@/components/products/product-detail-actions";
import { ProductHistoryPanel } from "@/components/products/product-history-panel";
import { ProductImageFrame } from "@/components/products/product-image-frame";
import { ProductUnitsSoldChart } from "@/components/products/product-sales-chart";
import { loadProductDetailPage } from "@/features/products/detail-page";
import { formatCurrency } from "@/lib/formatters";

export default async function ProdutoDetalhePage(
  props: PageProps<"/produtos/[id]">
) {
  const { id } = await props.params;
  const pageData = await loadProductDetailPage(id);

  if (!pageData) {
    notFound();
  }

  const {
    averageCost,
    categoriesForActions,
    inventorySummary,
    images,
    priceChanges,
    product,
    salesMetrics,
    settings,
  } = pageData;

  return (
    <div className="flex flex-col gap-6 p-4 pb-20 sm:p-6 sm:pb-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/produtos">Produtos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-6 sm:flex-row">
                <div className="size-24 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted/30 sm:size-32">
                  <ProductImageFrame
                    alt={`Imagem do produto ${product.name}`}
                    image={images[0] ?? product.image}
                    priority
                    sizes="128px"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h1 className="font-semibold text-2xl tracking-tight">
                      {product.name}
                    </h1>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/estoque?productId=${product.id}`}>
                          Movimentacoes
                        </Link>
                      </Button>
                      <ProductDetailActions
                        categories={categoriesForActions}
                        images={images}
                        product={product}
                        settings={settings}
                      />
                    </div>
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
              {images.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto">
                  {images.slice(1).map((image) => (
                    <div
                      className="size-14 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted/30"
                      key={image.version}
                    >
                      <ProductImageFrame
                        alt={`Imagem adicional de ${product.name}`}
                        image={image}
                        sizes="56px"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/50">
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

        <div className="flex flex-col gap-6">
          <Card className="border-border/50 bg-muted/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                Indicadores Financeiros
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
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
