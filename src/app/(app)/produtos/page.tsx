import { desc } from "drizzle-orm";
import Link from "next/link";
import {
  FeedbackBanner,
  PageLayout,
} from "@/app/(app)/_components/page-layout";
import {
  cancelPurchaseAction,
  createPurchaseAction,
  receivePurchaseAction,
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
  adjustment_minus: "Correção negativa",
  adjustment_plus: "Correção positiva",
  cancel_restock: "Estorno",
  customer_return: "Devolução",
  damage: "Avaria",
  initial_stock: "Estoque inicial",
  loss: "Perda",
  purchase_in: "Entrada",
  sale_out: "Venda",
} as const;

const getProductRowState = ({
  lowStockThreshold,
  product,
}: {
  lowStockThreshold: number;
  product: typeof products.$inferSelect;
}) => {
  const isLowStock =
    product.status === "active" && product.currentStock <= lowStockThreshold;

  return {
    isLowStock,
    minimum: lowStockThreshold,
  };
};

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
      description="Produtos virou o centro da operação. Você cadastra o item, registra entrada e faz ajustes no mesmo lugar."
      eyebrow="Catálogo"
      title="Produtos"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Produtos ativos</CardDescription>
            <CardTitle>{activeProducts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Estoque baixo</CardDescription>
            <CardTitle>{lowStockProducts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Capital em estoque</CardDescription>
            <CardTitle>{formatCurrency(stockValue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Entradas recentes</CardDescription>
            <CardTitle>{purchaseRows.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de produtos</CardTitle>
          <CardDescription>
            Menos telas e menos ruído: status, estoque, custo e preço em uma
            tabela só.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productRows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Atualizado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productRows.map((product) => {
                  const { isLowStock } = getProductRowState({
                    lowStockThreshold,
                    product,
                  });

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{product.category || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{product.currentStock}</span>
                          {isLowStock ? (
                            <Badge variant="destructive">Baixo</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(product.averageCost)}
                      </TableCell>
                      <TableCell>{formatCurrency(product.salePrice)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.status === "active"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {product.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(product.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
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
                            <Button size="sm" type="submit" variant="outline">
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
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Entradas recentes</CardTitle>
            <CardDescription>
              “Compra” agora é só entrada de mercadoria, sem campos financeiros
              desnecessários.
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
                    <TableHead>Custo total</TableHead>
                    <TableHead>Custo unitário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseRows.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        {formatDateTime(purchase.purchaseDate)}
                      </TableCell>
                      <TableCell>
                        {productMap.get(purchase.productId)?.name ||
                          `Produto #${purchase.productId}`}
                      </TableCell>
                      <TableCell>{purchase.quantity}</TableCell>
                      <TableCell>
                        {formatCurrency(purchase.totalCost)}
                      </TableCell>
                      <TableCell>{formatCurrency(purchase.unitCost)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            purchase.status === "received"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {purchase.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {purchase.status === "received" ||
                          purchase.status === "canceled" ? null : (
                            <>
                              <form action={receivePurchaseAction}>
                                <input
                                  name="purchaseId"
                                  type="hidden"
                                  value={purchase.id}
                                />
                                <Button
                                  size="sm"
                                  type="submit"
                                  variant="outline"
                                >
                                  Receber
                                </Button>
                              </form>
                              <form action={cancelPurchaseAction}>
                                <input
                                  name="purchaseId"
                                  type="hidden"
                                  value={purchase.id}
                                />
                                <Button size="sm" type="submit" variant="ghost">
                                  Cancelar
                                </Button>
                              </form>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhuma entrada registrada ainda.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimentações recentes</CardTitle>
            <CardDescription>
              Trilho operacional para conferência rápida de perdas, devoluções,
              ajustes e vendas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movementRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Qtd.</TableHead>
                    <TableHead>Obs.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementRows.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {formatDateTime(movement.occurredAt)}
                      </TableCell>
                      <TableCell>
                        {productMap.get(movement.productId)?.name ||
                          `Produto #${movement.productId}`}
                      </TableCell>
                      <TableCell>{movementTypeLabels[movement.type]}</TableCell>
                      <TableCell>{movement.quantityDelta}</TableCell>
                      <TableCell>{movement.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhuma movimentação registrada ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/vendas">Ir para vendas</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/recebimentos">Ir para caixa</Link>
        </Button>
      </div>
    </PageLayout>
  );
}
