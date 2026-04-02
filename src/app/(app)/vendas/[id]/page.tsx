import { notFound } from "next/navigation";
import { SaleDetailActions } from "@/components/sales/sale-detail-actions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateSaleReceivedAmount } from "@/features/sales/calculations";
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

const getPaymentMethodLabel = ({
  paymentInstallments,
  paymentMethod,
}: {
  paymentInstallments: number;
  paymentMethod: "card" | "pix";
}) => {
  if (paymentMethod === "pix") {
    return "Pix";
  }

  return `Cartao ${paymentInstallments}x`;
};

const getPaymentFeePayerLabel = (
  paymentFeePayer: "customer" | "not_applicable" | "seller"
) => {
  if (paymentFeePayer === "seller") {
    return "Vendedor";
  }

  if (paymentFeePayer === "customer") {
    return "Cliente";
  }

  return "Nao se aplica";
};

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
  const receivedAmount = calculateSaleReceivedAmount({
    feeAmount: Number(sale.feeAmount),
    freightAmount: Number(sale.freightAmount),
    paymentFeePayer: sale.paymentFeePayer,
    totalAmount: Number(sale.totalAmount),
  });
  const saleTitle = sale.customerName
    ? `Venda para ${sale.customerName}`
    : "Detalhes da venda";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 pb-20 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between gap-3 border-border/40 border-b pb-6">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">{saleTitle}</h1>
        </div>
        <SaleDetailActions sale={sale} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                Cliente
              </p>
              <p className="font-medium text-sm">
                {sale.customerName || "Sem cliente"}
              </p>
            </div>
            <div className="flex flex-col items-start gap-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Status
              </p>
              <Badge
                className="px-2 font-normal shadow-none"
                variant={getStatusVariant(sale.status)}
              >
                {getStatusLabel(sale.status)}
              </Badge>
            </div>
            <div>
              <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                Data
              </p>
              <p className="font-medium text-sm">
                {formatDate(sale.occurredOn)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                Metodo de Pgto
              </p>
              <p className="font-medium text-sm">
                {getPaymentMethodLabel(sale)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                Taxa do cartao
              </p>
              <p className="font-medium text-sm">
                {getPaymentFeePayerLabel(sale.paymentFeePayer)}
              </p>
            </div>
            {sale.status === "cancelled" && (
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                  Cancelada em
                </p>
                <p className="font-medium text-destructive text-sm">
                  {formatDateTime(sale.cancelledAt)}
                </p>
              </div>
            )}
            {sale.notes && (
              <div className="col-span-2 sm:col-span-3">
                <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                  Observacoes
                </p>
                <p className="text-foreground/80 text-sm">{sale.notes}</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-4 font-medium text-lg">Itens da venda</h3>
            <div className="overflow-hidden rounded-lg border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">Produto</TableHead>
                    <TableHead className="w-[80px] text-center">Qtd</TableHead>
                    <TableHead className="text-right">Unitario</TableHead>
                    <TableHead className="pr-4 text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map((item) => (
                    <TableRow className="border-border/40" key={item.id}>
                      <TableCell className="pl-4">
                        <span className="block font-medium">
                          {item.productNameSnapshot}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          Custo: {formatCurrency(item.unitCostSnapshot)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        x{item.quantity}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(item.unitPriceSnapshot)}
                      </TableCell>
                      <TableCell className="pr-4 text-right font-medium">
                        {formatCurrency(item.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="lg:col-start-3">
          <div className="sticky top-6 rounded-xl border border-border/50 bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-medium text-base">Resumo financeiro</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal ({sale.items.length} itens)</span>
                <span>{formatCurrency(itemSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Frete</span>
                <span>{formatCurrency(sale.freightAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Adicional</span>
                <span>{formatCurrency(sale.additionalAmount)}</span>
              </div>
              {Number(sale.feeAmount) > 0 && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>
                    Taxa do cartao
                    {sale.paymentFeePayer === "seller"
                      ? " (vendedor)"
                      : " (cliente)"}
                  </span>
                  <span>{formatCurrency(sale.feeAmount)}</span>
                </div>
              )}
              {Number(sale.discountAmount) > 0 && (
                <div className="flex items-center justify-between text-primary">
                  <span>Desconto</span>
                  <span>-{formatCurrency(sale.discountAmount)}</span>
                </div>
              )}
              {Number(sale.chargedAmount) > Number(sale.totalAmount) && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Cobrado do cliente</span>
                  <span>{formatCurrency(sale.chargedAmount)}</span>
                </div>
              )}

              <div className="my-4 border-border/40 border-t border-dashed" />

              <div className="flex items-center justify-between font-medium">
                <span>Valor recebido</span>
                <span>{formatCurrency(receivedAmount)}</span>
              </div>

              <div className="flex items-center justify-between font-semibold text-lg">
                <span>Valor da venda</span>
                <span>{formatCurrency(sale.totalAmount)}</span>
              </div>

              <p className="text-muted-foreground text-xs">
                Valor recebido = valor da venda - frete
                {sale.paymentFeePayer === "seller"
                  ? " - taxa paga pelo vendedor."
                  : "."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
