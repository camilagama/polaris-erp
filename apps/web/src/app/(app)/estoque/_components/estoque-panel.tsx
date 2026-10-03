"use client";
import { TimeValue } from "@polaris/ui/components/shared/time-value";

import { Button } from "@polaris/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@polaris/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polaris/ui/components/ui/table";
import { usePaginatedListState } from "@polaris/ui/hooks/use-paginated-list";
import { cn } from "@polaris/ui/lib/utils";
import Link from "next/link";
import { useCallback } from "react";
import { loadMoreInventoryMovementsAction } from "@/features/products/actions";
import type {
  InventoryMovementFilterProduct,
  InventoryMovementFilters,
  InventoryMovementItem,
  InventoryMovementType,
} from "@/features/products/contracts";
import { formatCurrency } from "@/lib/formatters";
import { EstoqueFilterBar } from "./estoque-filter-bar";

const movementTypeLabels: Record<InventoryMovementType, string> = {
  entry: "Entrada",
  sale: "Venda",
  sale_reversal: "Estorno",
  write_off: "Baixa",
};

const quantityLabel = (quantity: number): string =>
  `${quantity > 0 ? "+" : ""}${quantity} un.`;

interface EstoquePanelProps {
  filters: InventoryMovementFilters;
  initialCursor: string | null;
  initialItems: InventoryMovementItem[];
  products: InventoryMovementFilterProduct[];
}

export function EstoquePanel({
  initialItems,
  initialCursor,
  filters,
  products,
}: EstoquePanelProps) {
  const getMovementId = useCallback(
    (item: InventoryMovementItem) => item.id,
    []
  );

  const loadMore = useCallback(
    async (cursor: string) =>
      loadMoreInventoryMovementsAction({ cursor, filters }),
    [filters]
  );

  const { items, cursor, loadingMore, loadMoreItems } = usePaginatedListState({
    getItemId: getMovementId,
    initialCursor,
    initialItems,
    loadMore,
    onLoadError: (error) => {
      console.error("Erro ao carregar mais movimentações", error);
    },
    resetKey: JSON.stringify(filters),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl tracking-tight">
          Movimentacoes de estoque
        </h1>
        <p className="max-w-3xl text-muted-foreground text-sm">
          Audite entradas, vendas, estornos e baixas sem abrir cada produto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Combine produto, periodo e tipo para revisar uma trilha especifica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EstoqueFilterBar filters={filters} products={products} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trilha de movimentacoes</CardTitle>
          <CardDescription>
            Exibindo os ultimos {items.length} registros encontrados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed p-4">
              <p className="text-muted-foreground text-sm">
                Nenhuma movimentacao encontrada para os filtros atuais.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Data</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Custo un.</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="pr-4">Observacao</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow className="border-border/40" key={item.id}>
                        <TableCell className="whitespace-nowrap pl-4">
                          <TimeValue kind="civil-date" value={item.date} />
                        </TableCell>
                        <TableCell className="min-w-48">
                          <Link
                            className="font-medium hover:underline"
                            href={`/produtos/${item.productId}`}
                          >
                            {item.productName}
                          </Link>
                        </TableCell>
                        <TableCell>{movementTypeLabels[item.type]}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium tabular-nums",
                            item.quantity < 0
                              ? "text-destructive"
                              : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {quantityLabel(item.quantity)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">
                          {formatCurrency(item.unitCost)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(item.totalValue)}
                        </TableCell>
                        <TableCell className="max-w-64 truncate pr-4 text-muted-foreground">
                          {item.notes ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {cursor ? (
                <div className="flex justify-center pt-2 pb-4">
                  <Button
                    disabled={loadingMore}
                    onClick={loadMoreItems}
                    variant="outline"
                  >
                    {loadingMore ? "Carregando..." : "Carregar mais"}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
