import { desc } from "drizzle-orm";
import Link from "next/link";
import {
  FeedbackBanner,
  PageLayout,
} from "@/app/(app)/_components/page-layout";
import { createReceiptAction } from "@/app/(app)/recebimentos/actions";
import { cancelSaleAction, createSaleAction } from "@/app/(app)/vendas/actions";
import {
  NewSaleDialog,
  PaymentEventDialog,
} from "@/app/(app)/vendas/sales-dialogs";
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
import { paymentEvents, products, saleItems, sales } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import { toNumber } from "@/lib/domain/calculations";
import {
  calculateSaleGrossProfit,
  calculateSaleNetProfit,
  summarizePaymentLedger,
} from "@/lib/domain/payment-ledger";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

const paymentMethodLabels = {
  bank_transfer: "Transferência",
  card_credit: "Cartão crédito",
  card_debit: "Cartão débito",
  cash: "Dinheiro",
  other: "Outro",
  payment_link: "Link",
  pix: "PIX",
} as const;

const paymentTypeLabels = {
  chargeback: "Chargeback",
  payment: "Pagamento",
  refund: "Refund",
} as const;

const salePaymentStatusLabels = {
  chargeback: "Chargeback",
  paid: "Paga",
  partially_paid: "Parcial",
  refunded: "Reembolsada",
  unpaid: "Em aberto",
} as const;

const saleStatusLabels = {
  canceled: "Cancelada",
  draft: "Rascunho",
  finalized: "Finalizada",
} as const;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [
    productRows,
    saleRows,
    saleItemRows,
    paymentRows,
    resolvedSearchParams,
  ] = await Promise.all([
    db.select().from(products).orderBy(desc(products.updatedAt)),
    db.select().from(sales).orderBy(desc(sales.saleDate)),
    db.select().from(saleItems),
    db.select().from(paymentEvents).orderBy(desc(paymentEvents.createdAt)),
    searchParams,
  ]);

  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);
  const itemsBySaleId = saleItemRows.reduce<Map<number, typeof saleItemRows>>(
    (map, item) => {
      const currentItems = map.get(item.saleId) ?? [];
      currentItems.push(item);
      map.set(item.saleId, currentItems);
      return map;
    },
    new Map()
  );

  const grossProfitTotal = saleRows.reduce((total, sale) => {
    const items = itemsBySaleId.get(sale.id) ?? [];
    const costOfGoodsSold = items.reduce(
      (lineTotal, item) => lineTotal + toNumber(item.costSnapshotTotal),
      0
    );

    return (
      total +
      calculateSaleGrossProfit(toNumber(sale.orderTotal), costOfGoodsSold)
    );
  }, 0);

  const netProfitTotal = saleRows.reduce((total, sale) => {
    const items = itemsBySaleId.get(sale.id) ?? [];
    const costOfGoodsSold = items.reduce(
      (lineTotal, item) => lineTotal + toNumber(item.costSnapshotTotal),
      0
    );
    const salePayments = paymentRows.filter(
      (payment) => payment.saleId === sale.id
    );
    const paymentSummary = summarizePaymentLedger(
      toNumber(sale.orderTotal),
      salePayments
    );

    return (
      total +
      calculateSaleNetProfit({
        confirmedChargebackGross: paymentSummary.confirmedChargebackGross,
        confirmedFeeTotal: paymentSummary.confirmedFeeTotal,
        confirmedRefundGross: paymentSummary.confirmedRefundGross,
        costOfGoodsSold,
        orderTotal: toNumber(sale.orderTotal),
      })
    );
  }, 0);

  return (
    <PageLayout
      actions={
        <NewSaleDialog action={createSaleAction} products={productRows} />
      }
      description="Vendas ficou mais direta: cadastro em modal, tabela padronizada e caixa separado do pedido."
      eyebrow="Vendas"
      title="Vendas"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Vendas registradas</CardDescription>
            <CardTitle>{saleRows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Faturado</CardDescription>
            <CardTitle>
              {formatCurrency(
                saleRows.reduce(
                  (total, sale) => total + toNumber(sale.orderTotal),
                  0
                )
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Lucro bruto</CardDescription>
            <CardTitle>{formatCurrency(grossProfitTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Lucro líquido</CardDescription>
            <CardTitle>{formatCurrency(netProfitTotal)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de vendas</CardTitle>
          <CardDescription>
            Pedido e caixa separados, sem card gigante nem formulário espalhado
            na página.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {saleRows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Bruto</TableHead>
                  <TableHead>Líquido</TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead>Em aberto</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saleRows.map((sale) => {
                  const items = itemsBySaleId.get(sale.id) ?? [];
                  const salePayments = paymentRows.filter(
                    (payment) => payment.saleId === sale.id
                  );
                  const paymentSummary = summarizePaymentLedger(
                    toNumber(sale.orderTotal),
                    salePayments
                  );
                  const costOfGoodsSold = items.reduce(
                    (lineTotal, item) =>
                      lineTotal + toNumber(item.costSnapshotTotal),
                    0
                  );
                  const grossProfit = calculateSaleGrossProfit(
                    toNumber(sale.orderTotal),
                    costOfGoodsSold
                  );
                  const netProfit = calculateSaleNetProfit({
                    confirmedChargebackGross:
                      paymentSummary.confirmedChargebackGross,
                    confirmedFeeTotal: paymentSummary.confirmedFeeTotal,
                    confirmedRefundGross: paymentSummary.confirmedRefundGross,
                    costOfGoodsSold,
                    orderTotal: toNumber(sale.orderTotal),
                  });

                  return (
                    <TableRow key={sale.id}>
                      <TableCell>{formatDateTime(sale.saleDate)}</TableCell>
                      <TableCell>#{sale.id}</TableCell>
                      <TableCell>{sale.channel}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {saleStatusLabels[sale.status]}
                          </Badge>
                          <Badge variant="secondary">
                            {salePaymentStatusLabels[sale.paymentStatus]}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(sale.orderTotal)}</TableCell>
                      <TableCell>{formatCurrency(grossProfit)}</TableCell>
                      <TableCell>{formatCurrency(netProfit)}</TableCell>
                      <TableCell>
                        {formatCurrency(sale.receivedNetTotal)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(paymentSummary.amountDue)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <PaymentEventDialog
                            action={createReceiptAction}
                            saleId={sale.id}
                          />
                          {sale.status === "canceled" ? null : (
                            <form action={cancelSaleAction}>
                              <input
                                name="saleId"
                                type="hidden"
                                value={sale.id}
                              />
                              <Button size="sm" type="submit" variant="ghost">
                                Cancelar
                              </Button>
                            </form>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nenhuma venda registrada ainda.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos financeiros recentes</CardTitle>
          <CardDescription>
            Registro financeiro padronizado para pagamento, refund e chargeback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentRows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bruto</TableHead>
                  <TableHead>Líquido</TableHead>
                  <TableHead>Efetiva</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentRows.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDateTime(payment.createdAt)}</TableCell>
                    <TableCell>#{payment.saleId}</TableCell>
                    <TableCell>{paymentTypeLabels[payment.type]}</TableCell>
                    <TableCell>{paymentMethodLabels[payment.method]}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === "confirmed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(payment.grossAmount)}</TableCell>
                    <TableCell>{formatCurrency(payment.netAmount)}</TableCell>
                    <TableCell>{formatDate(payment.effectiveDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nenhum evento financeiro registrado ainda.
            </p>
          )}
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href="/recebimentos">Abrir caixa</Link>
      </Button>
    </PageLayout>
  );
}
