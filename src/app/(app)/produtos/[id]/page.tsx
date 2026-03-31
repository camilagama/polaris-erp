import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  PackageIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getProductByIdAction,
  getProductStockEntriesByProductIdAction,
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
  const [product, stockEntries] = await Promise.all([
    getProductByIdAction(id),
    getProductStockEntriesByProductIdAction(id),
  ]);

  if (!product) {
    notFound();
  }

  const averageCost = Number(product.costPrice);
  const totalCost = averageCost * Number(product.stock);
  const totalEntries = stockEntries.reduce(
    (sum, entry) => sum + Number(entry.quantity),
    0
  );

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
        <Button asChild size="xs" type="button" variant="ghost">
          <Link href="/produtos">
            <HugeiconsIcon data-icon="inline-start" icon={ArrowLeft01Icon} />
            Voltar
          </Link>
        </Button>
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
                  {formatCurrency(totalCost)}
                </p>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Total abastecido</p>
                <p className="font-medium text-sm">{totalEntries} un.</p>
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
                Movimentacoes de abastecimento
                <HugeiconsIcon data-icon="inline-end" icon={ArrowDown01Icon} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-border/50 border-t px-3 py-3">
              <div className="flex flex-col gap-3">
                {stockEntries.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Sem abastecimentos registrados.
                  </p>
                ) : (
                  stockEntries.map((entry) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-md border border-border/40 px-3 py-2 text-xs"
                      key={entry.id}
                    >
                      <div className="min-w-0">
                        <p className="font-medium">+{entry.quantity} un.</p>
                        <p className="text-muted-foreground">
                          {formatDate(entry.stockedOn)}
                        </p>
                      </div>
                      <p className="shrink-0 text-muted-foreground">
                        {formatCurrency(entry.unitCost)}
                      </p>
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
