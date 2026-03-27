import { desc } from "drizzle-orm";
import Link from "next/link";
import {
  EmptyState,
  FeedbackBanner,
  PageLayout,
  Surface,
} from "@/app/(app)/_components/page-layout";
import { db } from "@/db";
import { paymentEvents, sales } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import { toNumber } from "@/lib/domain/calculations";
import { summarizePaymentLedger } from "@/lib/domain/payment-ledger";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

const paymentMethodLabels = {
  bank_transfer: "Transferencia",
  card_credit: "Cartao credito",
  card_debit: "Cartao debito",
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
    .reduce((total, payment) => {
      const direction = payment.type === "payment" ? 1 : -1;
      return total + direction * toNumber(payment.netAmount);
    }, 0);
  const pixTotal = confirmedPayments
    .filter((payment) => payment.method === "pix")
    .reduce((total, payment) => {
      const direction = payment.type === "payment" ? 1 : -1;
      return total + direction * toNumber(payment.netAmount);
    }, 0);
  const cardTotal = confirmedPayments
    .filter(
      (payment) =>
        payment.method === "card_credit" || payment.method === "card_debit"
    )
    .reduce((total, payment) => {
      const direction = payment.type === "payment" ? 1 : -1;
      return total + direction * toNumber(payment.netAmount);
    }, 0);
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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
            href="/vendas"
          >
            Voltar para vendas
          </Link>
        </div>
      }
      description="Caixa e recebimentos agora ganham uma visao propria do ledger financeiro para consulta rapida de entradas, refunds, chargebacks e valores ainda em aberto."
      eyebrow="Caixa"
      title="Recebimentos"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Surface>
          <p className="text-muted-foreground text-sm">Dinheiro liquido</p>
          <p className="mt-3 font-semibold text-2xl">
            {formatCurrency(cashTotal)}
          </p>
        </Surface>
        <Surface>
          <p className="text-muted-foreground text-sm">PIX liquido</p>
          <p className="mt-3 font-semibold text-2xl">
            {formatCurrency(pixTotal)}
          </p>
        </Surface>
        <Surface>
          <p className="text-muted-foreground text-sm">Cartoes liquidos</p>
          <p className="mt-3 font-semibold text-2xl">
            {formatCurrency(cardTotal)}
          </p>
        </Surface>
        <Surface>
          <p className="text-muted-foreground text-sm">A receber</p>
          <p className="mt-3 font-semibold text-2xl">
            {formatCurrency(receivableTotal)}
          </p>
        </Surface>
      </div>

      <Surface>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-lg">Ledger recente</h2>
            <p className="text-muted-foreground text-sm">
              Todos os eventos financeiros confirmados, pendentes ou cancelados
              das vendas.
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 font-medium text-xs">
            {paymentRows.length} eventos
          </span>
        </div>

        <div className="space-y-3">
          {paymentRows.length > 0 ? (
            paymentRows.map((payment) => {
              const sale = saleMap.get(payment.saleId);

              return (
                <div
                  className="rounded-2xl border border-border/60 bg-background/70 p-4"
                  key={payment.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                          {paymentTypeLabels[payment.type]}
                        </p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                          {paymentMethodLabels[payment.method]}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                          {payment.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Venda #{payment.saleId} ·{" "}
                        {sale?.channel || "Canal nao informado"} ·{" "}
                        {formatDateTime(payment.createdAt)}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold">
                        {formatCurrency(payment.netAmount)}
                      </p>
                      <p className="text-muted-foreground">
                        bruto {formatCurrency(payment.grossAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-muted-foreground text-sm md:grid-cols-3">
                    <p>
                      Taxa:{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(payment.feeAmount)}
                      </span>
                    </p>
                    <p>
                      Vencimento:{" "}
                      <span className="font-medium text-foreground">
                        {formatDate(payment.dueDate)}
                      </span>
                    </p>
                    <p>
                      Data efetiva:{" "}
                      <span className="font-medium text-foreground">
                        {formatDate(payment.effectiveDate)}
                      </span>
                    </p>
                  </div>

                  {payment.notes ? (
                    <p className="mt-3 text-muted-foreground text-sm">
                      {payment.notes}
                    </p>
                  ) : null}
                </div>
              );
            })
          ) : (
            <EmptyState
              description="Os eventos financeiros criados nas vendas tambem ficam visiveis aqui para leitura de caixa."
              title="Nenhum evento financeiro registrado ainda"
            />
          )}
        </div>
      </Surface>
    </PageLayout>
  );
}
