import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InventoryMovementType } from "@/features/products/contracts";
import {
  getInventoryMovementsQuery,
  normalizeInventoryMovementFilters,
} from "@/features/products/queries";
import { requirePageAppContext } from "@/lib/app-session";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Movimentacoes de estoque | Polaris",
  description: "Entradas, vendas, estornos e baixas de estoque.",
};

const movementTypeLabels: Record<InventoryMovementType, string> = {
  entry: "Entrada",
  sale: "Venda",
  sale_reversal: "Estorno",
  write_off: "Baixa",
};

const movementTypeOptions = [
  { label: "Todos os tipos", value: "" },
  { label: "Entradas", value: "entry" },
  { label: "Vendas", value: "sale" },
  { label: "Estornos", value: "sale_reversal" },
  { label: "Baixas", value: "write_off" },
] as const;

const quantityLabel = (quantity: number): string =>
  `${quantity > 0 ? "+" : ""}${quantity} un.`;

interface EstoquePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EstoquePage(props: EstoquePageProps) {
  const context = await requirePageAppContext();
  const searchParams = await props.searchParams;
  const filters = normalizeInventoryMovementFilters(searchParams);
  const movements = await getInventoryMovementsQuery({
    filters,
    organizationId: context.organizationId,
  });

  return (
    <div className="flex flex-col gap-6 px-6 pb-6">
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
          <form className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
            <div className="flex flex-col gap-1">
              <Label htmlFor="productId">Produto</Label>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                defaultValue={movements.filters.productId ?? ""}
                id="productId"
                name="productId"
              >
                <option value="">Todos os produtos</option>
                {movements.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="from">De</Label>
              <Input
                defaultValue={movements.filters.from ?? ""}
                id="from"
                name="from"
                type="date"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="to">Ate</Label>
              <Input
                defaultValue={movements.filters.to ?? ""}
                id="to"
                name="to"
                type="date"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="type">Tipo</Label>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                defaultValue={movements.filters.type ?? ""}
                id="type"
                name="type"
              >
                {movementTypeOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button className="w-full md:w-auto" type="submit">
                Filtrar
              </Button>
              <Button asChild className="w-full md:w-auto" variant="outline">
                <Link href="/estoque">Limpar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trilha de movimentacoes</CardTitle>
          <CardDescription>
            Ultimos {movements.items.length} registros encontrados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movements.items.length === 0 ? (
            <div className="flex min-h-28 items-center rounded-lg border border-dashed p-4">
              <p className="text-muted-foreground text-sm">
                Nenhuma movimentacao encontrada para os filtros atuais.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Custo un.</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Observacao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(item.date)}
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
                          item.quantity < 0 && "text-destructive"
                        )}
                      >
                        {quantityLabel(item.quantity)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(item.unitCost)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(item.totalValue)}
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">
                        {item.notes ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
