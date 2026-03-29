import { desc } from "drizzle-orm";
import Link from "next/link";
import {
  FeedbackBanner,
  PageLayout,
} from "@/app/(app)/_components/page-layout";
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
import { paymentEvents, sales } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import { toNumber } from "@/lib/domain/calculations";
import { summarizePaymentLedger } from "@/lib/domain/payment-ledger";
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

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [saleRows, paymentRows, resolvedSearchParams] = await Promise.all([
    db.select().from(sales).orderBy(desc(sales.saleDate)),
    db.select().from(paymentEvents).orderBy(desc(paymentEvents.createdAt)),
    searchParams,
  ]);

  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);
  const saleMap = new Map(saleRows.map((sale) => [sale.id, sale]));
  const confirmedPayments = paymentRows.filter(
    (payment) => payment.status === "confirmed"
  );
  const cashTotal = confirmedPayments
    .filter((payment) => payment.method === "cash")
    .reduce(
      (total, payment) =>
        total +
        (payment.type === "payment" ? 1 : -1) * toNumber(payment.netAmount),
      0
    );
  const pixTotal = confirmedPayments
    .filter((payment) => payment.method === "pix")
    .reduce(
      (total, payment) =>
        total +
        (payment.type === "payment" ? 1 : -1) * toNumber(payment.netAmount),
      0
    );
  const cardTotal = confirmedPayments
    .filter(
      (payment) =>
        payment.method === "card_credit" || payment.method === "card_debit"
    )
    .reduce(
      (total, payment) =>
        total +
        (payment.type === "payment" ? 1 : -1) * toNumber(payment.netAmount),
      0
    );
  const receivableTotal = saleRows.reduce((total, sale) => {
    const ledger = summarizePaymentLedger(
      toNumber(sale.orderTotal),
      paymentRows.filter((payment) => payment.saleId === sale.id)
    );

    return total + ledger.amountDue;
  }, 0);

  return (
    <PageLayout
      actions={
        <Button asChild variant="outline">
          <Link href="/vendas">Voltar para vendas</Link>
        </Button>
      }
      description="Caixa ficou padronizado com a mesma leitura de tabela usada em produtos e vendas."
      eyebrow="Caixa"
      title="Recebimentos"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Dinheiro líquido</CardDescription>
            <CardTitle>{formatCurrency(cashTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>PIX líquido</CardDescription>
            <CardTitle>{formatCurrency(pixTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Cartões líquidos</CardDescription>
            <CardTitle>{formatCurrency(cardTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>A receber</CardDescription>
            <CardTitle>{formatCurrency(receivableTotal)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eventos financeiros</CardTitle>
          <CardDescription>
            Todos os pagamentos e reversões em ordem cronológica.
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
                {paymentRows.map((payment) => {
                  const sale = saleMap.get(payment.saleId);

                  return (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDateTime(payment.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>#{payment.saleId}</span>
                          <span className="text-muted-foreground">
                            {sale?.channel || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{paymentTypeLabels[payment.type]}</TableCell>
                      <TableCell>
                        {paymentMethodLabels[payment.method]}
                      </TableCell>
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
                      <TableCell>
                        {formatCurrency(payment.grossAmount)}
                      </TableCell>
                      <TableCell>{formatCurrency(payment.netAmount)}</TableCell>
                      <TableCell>{formatDate(payment.effectiveDate)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nenhum evento financeiro registrado ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
