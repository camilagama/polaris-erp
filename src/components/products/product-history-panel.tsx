"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";

// Using any here temporarily because the types come from complex queries in parent component.
// We will destructure normally so structural typing handles it.
export function ProductHistoryPanel({
  inventoryItems,
  priceChanges,
}: {
  inventoryItems: {
    id: string;
    quantityLabel: string;
    label: string;
    date: string;
    notes?: string | null;
    unitCost: number;
    variant: "writeOff" | "sale" | "saleReversal" | string;
    totalValue: number;
  }[];
  priceChanges: {
    id: string;
    previousPrice: string;
    nextPrice: string;
    createdAt: Date;
  }[];
}) {
  const [itemsLimit, setItemsLimit] = useState(5);
  const [priceLimit, setPriceLimit] = useState(5);

  const visibleInventoryItems = useMemo(
    () => inventoryItems.slice(0, itemsLimit),
    [inventoryItems, itemsLimit]
  );
  const visiblePriceChanges = useMemo(
    () => priceChanges.slice(0, priceLimit),
    [priceChanges, priceLimit]
  );

  return (
    <Card className="border-border/50 bg-muted/10 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Históricos</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs className="w-full" defaultValue="movimentacoes">
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
            <TabsTrigger value="precos">Preços</TabsTrigger>
          </TabsList>

          <TabsContent className="space-y-4" value="movimentacoes">
            {inventoryItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Sem movimentações registradas.
              </p>
            ) : (
              <div className="relative ml-2 space-y-6 border-border/50 border-l pl-5 sm:ml-3">
                {visibleInventoryItems.map((item) => (
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

            {itemsLimit < inventoryItems.length && (
              <Button
                className="mt-4 w-full"
                onClick={() => setItemsLimit((prev) => prev + 5)}
                size="sm"
                variant="outline"
              >
                Ver mais movimentações
              </Button>
            )}
          </TabsContent>

          <TabsContent className="space-y-4" value="precos">
            {priceChanges.length > 0 ? (
              <div className="space-y-4">
                {visiblePriceChanges.map((change, index) => (
                  <div
                    className={
                      index === visiblePriceChanges.length - 1
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

            {priceLimit < priceChanges.length && (
              <Button
                className="mt-4 w-full"
                onClick={() => setPriceLimit((prev) => prev + 5)}
                size="sm"
                variant="outline"
              >
                Ver mais preços
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
