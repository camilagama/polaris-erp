import { desc } from "drizzle-orm";
import Link from "next/link";
import {
  FeedbackBanner,
  PageLayout,
} from "@/app/(app)/_components/page-layout";
import {
  cancelPurchaseAction,
  createPurchaseAction,
} from "@/app/(app)/compras/actions";
import {
  createProductAction,
  createProductMovementAction,
  updateProductCommercialDataAction,
  updateProductStatusAction,
} from "@/app/(app)/produtos/actions";
import {
  ProductDialogs,
  UpdatePriceDialog,
} from "@/app/(app)/produtos/product-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import {
  inventoryMovements,
  products,
  purchases,
  systemSettings,
} from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import { toNumber } from "@/lib/domain/calculations";
import { formatCurrency, formatDateTime } from "@/lib/format";

const movementTypeLabels = {
  adjustment_minus: "Retirada",
  adjustment_plus: "Acréscimo",
  cancel_restock: "Estorno",
  customer_return: "Devolução",
  damage: "Avaria",
  initial_stock: "Estoque inicial",
  loss: "Perda",
  purchase_in: "Entrada",
  sale_out: "Venda",
} as const;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [
    productRows,
    purchaseRows,
    movementRows,
    settingsRows,
    resolvedSearchParams,
  ] = await Promise.all([
    db.select().from(products).orderBy(desc(products.updatedAt)),
    db.select().from(purchases).orderBy(desc(purchases.purchaseDate)).limit(12),
    db
      .select()
      .from(inventoryMovements)
      .orderBy(desc(inventoryMovements.occurredAt))
      .limit(16),
    db.select().from(systemSettings).limit(1),
    searchParams,
  ]);

  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);
  const productMap = new Map(
    productRows.map((product) => [product.id, product])
  );
  const activeProducts = productRows.filter(
    (product) => product.status === "active"
  );
  const lowStockThreshold = settingsRows[0]?.lowStockThreshold ?? 2;
  const lowStockProducts = activeProducts.filter((product) => {
    return product.currentStock <= lowStockThreshold;
  });
  const stockValue = activeProducts.reduce(
    (total, product) =>
      total + product.currentStock * toNumber(product.averageCost),
    0
  );

  return (
    <PageLayout
      actions={
        <ProductDialogs
          createProductAction={createProductAction}
          createProductMovementAction={createProductMovementAction}
          createPurchaseAction={createPurchaseAction}
          products={activeProducts.map((product) => ({
            currentStock: product.currentStock,
            id: product.id,
            name: product.name,
          }))}
        />
      }
      description="Gerencie seu catálogo, registre entradas e acompanhe o giro de estoque em tempo real."
      eyebrow="Operação"
      title="Produtos e Estoque"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Itens ativos</CardDescription>
            <CardTitle className="text-2xl">{activeProducts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estoque baixo</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {lowStockProducts.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Valor em mãos</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(stockValue)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Entradas (mês)</CardDescription>
            <CardTitle className="text-2xl">{purchaseRows.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo e Disponibilidade</CardTitle>
          <CardDescription>
            Preços de venda e custos médios atualizados automaticamente.
          </CardDescription>
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
                        <div className="flex justify-end gap-2 text-right">
                          <UpdatePriceDialog
                            action={updateProductCommercialDataAction}
                            productId={product.id}
                            productName={product.name}
                            salePrice={toNumber(product.salePrice)}
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
            <div className="py-12 text-center text-muted-foreground">
              Nenhum produto cadastrado. Comece criando um novo item.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Entradas</CardTitle>
            <CardDescription>
              Últimas reposições e aquisições de estoque.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {purchaseRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd.</TableHead>
                    <TableHead>Vlr. Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseRows.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="text-xs">
                        {formatDateTime(purchase.purchaseDate)}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate font-medium">
                        {productMap.get(purchase.productId)?.name ||
                          `Item #${purchase.productId}`}
                      </TableCell>
                      <TableCell>{purchase.quantity}</TableCell>
                      <TableCell>
                        {formatCurrency(purchase.totalCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          {purchase.status === "canceled" ? (
                            <Badge variant="outline">Cancelada</Badge>
                          ) : (
                            <form action={cancelPurchaseAction}>
                              <input
                                name="purchaseId"
                                type="hidden"
                                value={purchase.id}
                              />
                              <Button
                                className="h-8 w-8 text-destructive"
                                size="icon"
                                type="submit"
                                variant="ghost"
                              >
                                <span className="sr-only">Cancelar</span>✕
                              </Button>
                            </form>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">
                Sem registros de entrada.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimentação Recente</CardTitle>
            <CardDescription>
              Acompanhamento de saídas, ajustes e estornos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movementRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd.</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementRows.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <Badge className="font-normal" variant="outline">
                          {movementTypeLabels[movement.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {productMap.get(movement.productId)?.name ||
                          `Item #${movement.productId}`}
                      </TableCell>
                      <TableCell
                        className={
                          movement.quantityDelta < 0
                            ? "font-medium text-destructive"
                            : "font-medium text-emerald-600"
                        }
                      >
                        {movement.quantityDelta > 0
                          ? `+${movement.quantityDelta}`
                          : movement.quantityDelta}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-muted-foreground text-xs italic">
                        {movement.note || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">
                Sem histórico de movimentação.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 pt-4">
        <Button asChild className="min-w-[160px]" variant="outline">
          <Link href="/vendas">Gerenciar Vendas</Link>
        </Button>
        <Button asChild className="min-w-[160px]" variant="outline">
          <Link href="/recebimentos">Fluxo de Caixa</Link>
        </Button>
      </div>
    </PageLayout>
  );
}
