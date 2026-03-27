import { desc, eq } from "drizzle-orm";
import {
  FeedbackBanner,
  PageLayout,
  Surface,
} from "@/app/(app)/_components/page-layout";
import { createReceiptAction } from "@/app/(app)/recebimentos/actions";
import { db } from "@/db";
import { receipts, sales } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import { formatCurrency, formatDate } from "@/lib/format";

const inputClassName =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [saleRows, receiptRows, resolvedSearchParams] = await Promise.all([
    db.select().from(sales).orderBy(desc(sales.createdAt)),
    db
      .select({
        id: receipts.id,
        saleId: receipts.saleId,
        dueDate: receipts.dueDate,
        effectiveDate: receipts.effectiveDate,
        feeAmount: receipts.feeAmount,
        grossAmount: receipts.grossAmount,
        method: receipts.method,
        netAmount: receipts.netAmount,
        notes: receipts.notes,
        saleStatus: sales.status,
        status: receipts.status,
      })
      .from(receipts)
      .innerJoin(sales, eq(sales.id, receipts.saleId))
      .orderBy(desc(receipts.createdAt)),
    searchParams,
  ]);
  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);

  return (
    <PageLayout
      description="Recebimentos alimentam caixa e status financeiro da venda sem recalcular CMV nem alterar o snapshot de custo."
      eyebrow="Financeiro"
      title="Recebimentos"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Surface className="h-fit">
          <div className="mb-5 space-y-2">
            <h2 className="font-semibold text-lg">Novo recebimento</h2>
            <p className="text-muted-foreground text-sm">
              Use para receber, lançar pendencia, refund ou chargeback conforme
              o evento real.
            </p>
          </div>
          <form action={createReceiptAction} className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="saleId">
                Venda
              </label>
              <select
                className={inputClassName}
                id="saleId"
                name="saleId"
                required
              >
                <option value="">Selecione uma venda</option>
                {saleRows.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    Venda #{sale.id} · {sale.channel} ·{" "}
                    {formatCurrency(sale.orderTotal)} · {sale.status}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="grossAmount">
                  Valor bruto
                </label>
                <input
                  className={inputClassName}
                  id="grossAmount"
                  min="0"
                  name="grossAmount"
                  required
                  step="0.01"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="feeAmount">
                  Taxa
                </label>
                <input
                  className={inputClassName}
                  defaultValue="0"
                  id="feeAmount"
                  min="0"
                  name="feeAmount"
                  step="0.01"
                  type="number"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="status">
                  Status do evento
                </label>
                <select
                  className={inputClassName}
                  id="status"
                  name="status"
                  required
                >
                  <option value="received">Received</option>
                  <option value="partial">Partial</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                  <option value="chargeback">Chargeback</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="method">
                  Metodo
                </label>
                <select
                  className={inputClassName}
                  id="method"
                  name="method"
                  required
                >
                  <option value="pix">PIX</option>
                  <option value="cash">Dinheiro</option>
                  <option value="card">Cartao</option>
                  <option value="payment_link">Link de pagamento</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="dueDate">
                  Vencimento
                </label>
                <input
                  className={inputClassName}
                  id="dueDate"
                  name="dueDate"
                  type="date"
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="effectiveDate">
                  Data efetiva
                </label>
                <input
                  className={inputClassName}
                  id="effectiveDate"
                  name="effectiveDate"
                  type="date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="notes">
                Observacoes
              </label>
              <textarea
                className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="notes"
                name="notes"
              />
            </div>
            <button
              className="h-10 rounded-xl bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/90"
              type="submit"
            >
              Registrar recebimento
            </button>
          </form>
        </Surface>

        <Surface>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Eventos financeiros</h2>
              <p className="text-muted-foreground text-sm">
                Cada evento afeta caixa e recalcula o status agregado da venda.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 font-medium text-xs">
              {receiptRows.length} eventos
            </span>
          </div>
          <div className="space-y-3">
            {receiptRows.length > 0 ? (
              receiptRows.map((receipt) => (
                <div
                  className="rounded-2xl border border-border/60 bg-background/70 p-4"
                  key={receipt.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">Venda #{receipt.saleId}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                      {receipt.status}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                      venda {receipt.saleStatus}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                    <p>
                      Bruto:{" "}
                      <span className="font-semibold">
                        {formatCurrency(receipt.grossAmount)}
                      </span>
                    </p>
                    <p>
                      Liquido:{" "}
                      <span className="font-semibold">
                        {formatCurrency(receipt.netAmount)}
                      </span>
                    </p>
                    <p>
                      Taxa:{" "}
                      <span className="font-semibold">
                        {formatCurrency(receipt.feeAmount)}
                      </span>
                    </p>
                    <p>
                      Metodo:{" "}
                      <span className="font-semibold">{receipt.method}</span>
                    </p>
                    <p>
                      Vencimento:{" "}
                      <span className="font-semibold">
                        {formatDate(receipt.dueDate)}
                      </span>
                    </p>
                    <p>
                      Efetivo:{" "}
                      <span className="font-semibold">
                        {formatDate(receipt.effectiveDate)}
                      </span>
                    </p>
                  </div>
                  {receipt.notes ? (
                    <p className="mt-3 text-muted-foreground text-sm">
                      {receipt.notes}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
                Nenhum recebimento registrado ainda.
              </div>
            )}
          </div>
        </Surface>
      </div>
    </PageLayout>
  );
}
