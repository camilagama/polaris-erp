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
import type { SaleDetail } from "@/features/sales/contracts";
import { getSaleByIdQuery } from "@/features/sales/queries";
import {
  formatSaleDetailPaymentMethodLabel,
  getOperationalSaleStatusLabel,
} from "@/features/sales/sale-display-labels";
import { requirePageAppContext } from "@/lib/app-session";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";

const getStatusLabel = (status: SaleDetail["status"]) =>
  getOperationalSaleStatusLabel(status);

const getStatusVariant = (status: SaleDetail["status"]) => {
  if (status === "cancelled") {
    return "destructive" as const;
  }

  return "secondary" as const;
};

const getPaymentMethodLabel = (sale: SaleDetail) =>
  formatSaleDetailPaymentMethodLabel(sale);

export default async function VendaDetalhePage(
  props: PageProps<"/vendas/[id]">
) {
  const context = await requirePageAppContext();
  const { id } = await props.params;
  const sale = await getSaleByIdQuery(context.organizationId, id);

  if (!sale) {
    notFound();
  }

  const itemSubtotal = sale.items.reduce(
    (acc, item) => acc + Number(item.lineTotal),
    0
  );
  const productCostAmount = sale.items.reduce(
    (acc, item) => acc + Number(item.unitCostSnapshot) * item.quantity,
    0
  );
  const customerChargedFeeAmount = Math.max(
    Number(sale.chargedAmount) - Number(sale.totalAmount),
    0
  );
  const totalFeeAmount = Number(sale.feeAmount) + customerChargedFeeAmount;
  const receivedAmount = calculateSaleReceivedAmount({
    feeAmount: totalFeeAmount,
    freightAmount: Number(sale.freightAmount),
    saleAmount: Number(sale.chargedAmount),
  });
  const profitAmount = receivedAmount - productCostAmount;
  const isCancelled = sale.status === "cancelled";
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
          {isCancelled ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3">
              <p className="font-medium text-destructive text-sm">
                Venda cancelada com estoque estornado.
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                Os valores abaixo representam o registro historico da venda
                original. Eles nao contam mais como operacao vigente.
              </p>
            </div>
          ) : null}

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
                Custo do produto
              </p>
              <p className="font-medium text-sm">
                {formatCurrency(productCostAmount)}
              </p>
            </div>
            {!isCancelled && (
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                  Lucro
                </p>
                <p
                  className={`font-medium text-sm ${
                    profitAmount < 0 ? "text-red-400" : "text-chart-6"
                  }`}
                >
                  {formatCurrency(profitAmount)}
                </p>
              </div>
            )}
            {isCancelled ? (
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                  Cancelada em
                </p>
                <p className="font-medium text-destructive text-sm">
                  {formatDateTime(sale.cancelledAt)}
                </p>
              </div>
            ) : null}
            {sale.notes ? (
              <div className="col-span-2 sm:col-span-3">
                <p className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                  Observacoes
                </p>
                <p className="text-foreground/80 text-sm">{sale.notes}</p>
              </div>
            ) : null}
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
              {isCancelled ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-muted-foreground text-xs">
                  Resumo historico da venda original. O efeito operacional atual
                  apos o cancelamento e estoque devolvido e receita operacional
                  zerada.
                </div>
              ) : null}

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
              {Number(sale.discountAmount) > 0 ? (
                <div className="flex items-center justify-between text-primary">
                  <span>Desconto</span>
                  <span>-{formatCurrency(sale.discountAmount)}</span>
                </div>
              ) : null}
              {customerChargedFeeAmount > 0 ? (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Taxa do cartao (cliente)</span>
                  <span>{formatCurrency(customerChargedFeeAmount)}</span>
                </div>
              ) : null}

              <div className="my-4 border-border/40 border-t border-dashed" />

              <div className="flex items-center justify-between font-semibold text-lg">
                <span>
                  {isCancelled ? "Valor total original:" : "Valor total:"}
                </span>
                <span>{formatCurrency(sale.chargedAmount)}</span>
              </div>

              {Number(sale.feeAmount) > 0 ? (
                <div className="flex items-center justify-between text-red-400">
                  <span>Taxa do cartao (vendedor)</span>
                  <span>-{formatCurrency(sale.feeAmount)}</span>
                </div>
              ) : null}

              {Number(sale.freightAmount) > 0 ? (
                <div className="flex items-center justify-between text-red-400">
                  <span>Frete</span>
                  <span>-{formatCurrency(sale.freightAmount)}</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between font-medium text-chart-6">
                <span>
                  {isCancelled ? "Valor recebido original" : "Valor recebido"}
                </span>
                <span>{formatCurrency(receivedAmount)}</span>
              </div>

              {isCancelled ? (
                <div className="flex items-center justify-between font-medium text-foreground">
                  <span>Impacto operacional atual</span>
                  <span>R$ 0,00</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
