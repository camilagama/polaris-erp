import { notFound } from "next/navigation";
import { SaleDetailActions } from "@/components/sales/sale-detail-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import { getSaleByIdQuery } from "../queries";

const getStatusLabel = (status: "cancelled" | "completed") => {
  if (status === "cancelled") {
    return "Cancelada";
  }

  return "Concluida";
};

const getStatusVariant = (status: "cancelled" | "completed") => {
  if (status === "cancelled") {
    return "destructive" as const;
  }

  return "secondary" as const;
};

const getPaymentMethodLabel = (paymentMethod: "card" | "pix") =>
  paymentMethod === "card" ? "Cartao" : "Pix";

export default async function VendaDetalhePage(
  props: PageProps<"/vendas/[id]">
) {
  const { id } = await props.params;
  const sale = await getSaleByIdQuery(id);

  if (!sale) {
    notFound();
  }

  const itemSubtotal = sale.items.reduce(
    (acc, item) => acc + Number(item.lineTotal),
    0
  );
  const saleTitle = sale.customerName
    ? `Venda para ${sale.customerName}`
    : "Detalhes da venda";

  return (
    <div className="flex flex-col gap-6 p-4 pb-20 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
            Venda
          </p>
          <h1 className="font-semibold text-2xl tracking-tight">{saleTitle}</h1>
          <p className="text-muted-foreground text-sm">
            {formatDate(sale.occurredOn)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(sale.status)}>
            {getStatusLabel(sale.status)}
          </Badge>
          <SaleDetailActions sale={sale} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-3 text-xs">
              <span className="text-muted-foreground">Data da venda</span>
              <span>{formatDate(sale.occurredOn)}</span>
              <span className="text-muted-foreground">Cliente</span>
              <span>{sale.customerName || "Sem cliente"}</span>
              <span className="text-muted-foreground">Status</span>
              <span>{getStatusLabel(sale.status)}</span>
              <span className="text-muted-foreground">Pagamento</span>
              <span>{getPaymentMethodLabel(sale.paymentMethod)}</span>
              <span className="text-muted-foreground">Cancelada em</span>
              <span>{formatDateTime(sale.cancelledAt)}</span>
              <span className="text-muted-foreground">Observacoes</span>
              <p className="text-xs/relaxed">
                {sale.notes || "Sem observacoes."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-xs">
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Itens</p>
                <p className="font-medium text-sm">{sale.items.length}</p>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Subtotal dos itens</p>
                <p className="font-medium text-sm">
                  {formatCurrency(itemSubtotal)}
                </p>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Frete</p>
                <p className="font-medium text-sm">
                  {formatCurrency(sale.freightAmount)}
                </p>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Adicional</p>
                <p className="font-medium text-sm">
                  {formatCurrency(sale.additionalAmount)}
                </p>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Desconto</p>
                <p className="font-medium text-sm">
                  - {formatCurrency(sale.discountAmount)}
                </p>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-muted-foreground">Total da venda</p>
                <p className="font-medium text-sm">
                  {formatCurrency(sale.totalAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens da venda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Produto</TableHead>
                  <TableHead className="text-center">Qtd.</TableHead>
                  <TableHead>Preco</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead className="pr-4 text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[250px] pl-4 font-medium">
                      <span
                        className="block truncate"
                        title={item.productNameSnapshot}
                      >
                        {item.productNameSnapshot}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantity}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(item.unitPriceSnapshot)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(item.unitCostSnapshot)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {formatCurrency(item.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
