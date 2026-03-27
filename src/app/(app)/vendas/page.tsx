import { desc } from "drizzle-orm";
import Link from "next/link";
import {
  EmptyState,
  FeedbackBanner,
  PageLayout,
  Surface,
} from "@/app/(app)/_components/page-layout";
import { createReceiptAction } from "@/app/(app)/recebimentos/actions";
import { cancelSaleAction, createSaleAction } from "@/app/(app)/vendas/actions";
import { SalesForm } from "@/app/(app)/vendas/sales-form";
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

const inputClassName =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const paymentTypeLabels = {
  chargeback: "Chargeback",
  payment: "Pagamento",
  refund: "Refund",
} as const;

const paymentStatusLabels = {
  canceled: "Cancelado",
  confirmed: "Confirmado",
  pending: "Pendente",
} as const;

const saleStatusLabels = {
  canceled: "Cancelada",
  draft: "Rascunho",
  finalized: "Finalizada",
} as const;

const salePaymentStatusLabels = {
  chargeback: "Chargeback",
  paid: "Paga",
  partially_paid: "Parcial",
  refunded: "Reembolsada",
  unpaid: "Em aberto",
} as const;

const paymentMethodLabels = {
  bank_transfer: "Transferencia",
  card_credit: "Cartao credito",
  card_debit: "Cartao debito",
  cash: "Dinheiro",
  other: "Outro",
  payment_link: "Link",
  pix: "PIX",
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
    db.select().from(sales).orderBy(desc(sales.createdAt)),
    db.select().from(saleItems),
    db.select().from(paymentEvents).orderBy(desc(paymentEvents.createdAt)),
    searchParams,
  ]);
  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);
  const productMap = new Map(
    productRows.map((product) => [product.id, product])
  );
  const itemsBySaleId = saleItemRows.reduce<Map<number, typeof saleItemRows>>(
    (map, item) => {
      const currentItems = map.get(item.saleId) ?? [];
      currentItems.push(item);
      map.set(item.saleId, currentItems);
      return map;
    },
    new Map()
  );
  const paymentsBySaleId = paymentRows.reduce<Map<number, typeof paymentRows>>(
    (map, payment) => {
      const currentPayments = map.get(payment.saleId) ?? [];
      currentPayments.push(payment);
      map.set(payment.saleId, currentPayments);
      return map;
    },
    new Map()
  );

  return (
    <PageLayout
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
            href="/recebimentos"
          >
            Ver caixa
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
            href="/compras"
          >
            Registrar compra
          </Link>
        </div>
      }
      description="Vendas agora separam melhor pedido e caixa: os itens baixam estoque na confirmacao, e o ledger financeiro acompanha pagamento, refund e chargeback com metodos mais granulares."
      eyebrow="Vendas"
      title="Fluxo comercial"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
        <Surface className="h-fit">
          <div className="mb-5 space-y-2">
            <h2 className="font-semibold text-lg">Nova venda</h2>
            <p className="text-muted-foreground text-sm">
              Comece pelos itens, confira o resumo e so depois distribua os
              pagamentos iniciais.
            </p>
          </div>
          <SalesForm action={createSaleAction} products={productRows} />
        </Surface>

        <Surface>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-lg">Vendas registradas</h2>
              <p className="text-muted-foreground text-sm">
                Cada venda exibe operacao e caixa lado a lado, sem misturar
                status comercial com status financeiro.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 font-medium text-xs">
              {saleRows.length} vendas
            </span>
          </div>

          <div className="space-y-3">
            {saleRows.length > 0 ? (
              saleRows.map((sale) => {
                const items = itemsBySaleId.get(sale.id) ?? [];
                const salePayments = paymentsBySaleId.get(sale.id) ?? [];
                const costOfGoodsSold = items.reduce(
                  (total, item) => total + toNumber(item.costSnapshotTotal),
                  0
                );
                const paymentSummary = summarizePaymentLedger(
                  toNumber(sale.orderTotal),
                  salePayments
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
                  <div
                    className="rounded-2xl border border-border/60 bg-background/70 p-4"
                    key={sale.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">Venda #{sale.id}</p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                            {saleStatusLabels[sale.status]}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                            {salePaymentStatusLabels[sale.paymentStatus]}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {sale.channel} · {formatDateTime(sale.saleDate)}
                        </p>
                      </div>
                      {sale.status === "canceled" ? null : (
                        <form
                          action={cancelSaleAction}
                          className="w-full sm:w-auto"
                        >
                          <input name="saleId" type="hidden" value={sale.id} />
                          <button
                            className="h-10 w-full rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted sm:w-auto"
                            type="submit"
                          >
                            Cancelar
                          </button>
                        </form>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">Pedido</p>
                        <p className="font-semibold">
                          {formatCurrency(sale.orderTotal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">A receber</p>
                        <p className="font-semibold">
                          {formatCurrency(paymentSummary.amountDue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Lucro bruto</p>
                        <p className="font-semibold">
                          {formatCurrency(grossProfit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Lucro liquido</p>
                        <p className="font-semibold">
                          {formatCurrency(netProfit)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {items.map((item) => {
                        const product = productMap.get(item.productId);

                        return (
                          <div
                            className="grid gap-2 rounded-xl border border-border/50 px-3 py-2 text-sm md:grid-cols-[1fr_auto_auto]"
                            key={item.id}
                          >
                            <p>
                              {product?.name || `Produto #${item.productId}`}
                            </p>
                            <p>{item.quantity} un</p>
                            <p className="font-medium md:text-right">
                              venda {formatCurrency(item.lineSubtotal)} · custo{" "}
                              {formatCurrency(item.costSnapshotTotal)}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 grid gap-4 rounded-2xl border border-border/50 bg-card/70 p-4 xl:grid-cols-[1fr_0.94fr]">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-sm">
                            Ledger financeiro
                          </h3>
                          <p className="text-muted-foreground text-xs">
                            Use o ledger para registrar pagamentos, refunds,
                            chargebacks e pendencias sem perder o historico.
                          </p>
                        </div>
                        {salePayments.length > 0 ? (
                          salePayments.map((payment) => (
                            <div
                              className="rounded-xl border border-border/50 bg-background/70 px-3 py-3 text-sm"
                              key={payment.id}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                                  {paymentTypeLabels[payment.type]}
                                </span>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                                  {paymentStatusLabels[payment.status]}
                                </span>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                                  {paymentMethodLabels[payment.method]}
                                </span>
                              </div>
                              <div className="mt-2 grid gap-1 text-muted-foreground text-xs sm:grid-cols-2">
                                <p>
                                  Bruto:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(payment.grossAmount)}
                                  </span>
                                </p>
                                <p>
                                  Efeito liquido:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(payment.netAmount)}
                                  </span>
                                </p>
                                <p>
                                  Taxa:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(payment.feeAmount)}
                                  </span>
                                </p>
                                <p>
                                  Efetivo:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatDate(payment.effectiveDate)}
                                  </span>
                                </p>
                              </div>
                              {payment.notes ? (
                                <p className="mt-2 text-muted-foreground text-xs">
                                  {payment.notes}
                                </p>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <EmptyState
                            description="Esta venda ainda nao tem nenhum evento financeiro registrado."
                            title="Sem eventos financeiros"
                          />
                        )}
                      </div>

                      <form action={createReceiptAction} className="space-y-3">
                        <input name="saleId" type="hidden" value={sale.id} />
                        <div className="space-y-2">
                          <label
                            className="font-medium text-sm"
                            htmlFor={`type-${sale.id}`}
                          >
                            Tipo do evento
                          </label>
                          <select
                            className={inputClassName}
                            defaultValue="payment"
                            id={`type-${sale.id}`}
                            name="type"
                          >
                            <option value="payment">Pagamento</option>
                            <option value="refund">Refund</option>
                            <option value="chargeback">Chargeback</option>
                          </select>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                          <div className="space-y-2">
                            <label
                              className="font-medium text-sm"
                              htmlFor={`grossAmount-${sale.id}`}
                            >
                              Valor bruto
                            </label>
                            <input
                              className={inputClassName}
                              id={`grossAmount-${sale.id}`}
                              min="0"
                              name="grossAmount"
                              required
                              step="0.01"
                              type="number"
                            />
                          </div>
                          <div className="space-y-2">
                            <label
                              className="font-medium text-sm"
                              htmlFor={`feeAmount-${sale.id}`}
                            >
                              Taxa
                            </label>
                            <input
                              className={inputClassName}
                              defaultValue="0"
                              id={`feeAmount-${sale.id}`}
                              min="0"
                              name="feeAmount"
                              step="0.01"
                              type="number"
                            />
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                          <div className="space-y-2">
                            <label
                              className="font-medium text-sm"
                              htmlFor={`status-${sale.id}`}
                            >
                              Estado
                            </label>
                            <select
                              className={inputClassName}
                              defaultValue="confirmed"
                              id={`status-${sale.id}`}
                              name="status"
                              required
                            >
                              <option value="confirmed">Confirmado</option>
                              <option value="pending">Pendente</option>
                              <option value="canceled">Cancelado</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label
                              className="font-medium text-sm"
                              htmlFor={`method-${sale.id}`}
                            >
                              Metodo
                            </label>
                            <select
                              className={inputClassName}
                              defaultValue="pix"
                              id={`method-${sale.id}`}
                              name="method"
                              required
                            >
                              <option value="pix">PIX</option>
                              <option value="cash">Dinheiro</option>
                              <option value="card_debit">Cartao debito</option>
                              <option value="card_credit">
                                Cartao credito
                              </option>
                              <option value="payment_link">Link</option>
                              <option value="bank_transfer">
                                Transferencia
                              </option>
                              <option value="other">Outro</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                          <div className="space-y-2">
                            <label
                              className="font-medium text-sm"
                              htmlFor={`dueDate-${sale.id}`}
                            >
                              Vencimento
                            </label>
                            <input
                              className={inputClassName}
                              id={`dueDate-${sale.id}`}
                              name="dueDate"
                              type="date"
                            />
                          </div>
                          <div className="space-y-2">
                            <label
                              className="font-medium text-sm"
                              htmlFor={`effectiveDate-${sale.id}`}
                            >
                              Data efetiva
                            </label>
                            <input
                              className={inputClassName}
                              id={`effectiveDate-${sale.id}`}
                              name="effectiveDate"
                              type="date"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label
                            className="font-medium text-sm"
                            htmlFor={`notes-${sale.id}`}
                          >
                            Observacoes
                          </label>
                          <textarea
                            className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                            id={`notes-${sale.id}`}
                            name="notes"
                          />
                        </div>
                        <button
                          className="h-10 w-full rounded-xl bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/90"
                          type="submit"
                        >
                          Registrar evento financeiro
                        </button>
                      </form>
                    </div>

                    {sale.notes ? (
                      <p className="mt-3 text-muted-foreground text-sm">
                        {sale.notes}
                      </p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <EmptyState
                description="Assim que houver estoque disponivel, registre a primeira venda. O checkout ja aceita pagamentos iniciais e o ledger cuida do restante."
                title="Nenhuma venda registrada ainda"
              />
            )}
          </div>
        </Surface>
      </div>
    </PageLayout>
  );
}
