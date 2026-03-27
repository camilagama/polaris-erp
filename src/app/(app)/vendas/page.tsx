import { desc, eq } from "drizzle-orm";
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
import { products, receipts, saleItems, sales } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

const inputClassName =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [
    productRows,
    saleRows,
    saleItemRows,
    receiptRows,
    resolvedSearchParams,
  ] = await Promise.all([
    db.select().from(products).orderBy(desc(products.updatedAt)),
    db.select().from(sales).orderBy(desc(sales.createdAt)),
    db.select().from(saleItems),
    db
      .select({
        dueDate: receipts.dueDate,
        effectiveDate: receipts.effectiveDate,
        feeAmount: receipts.feeAmount,
        grossAmount: receipts.grossAmount,
        id: receipts.id,
        method: receipts.method,
        netAmount: receipts.netAmount,
        notes: receipts.notes,
        saleId: receipts.saleId,
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
  const receiptsBySaleId = receiptRows.reduce<Map<number, typeof receiptRows>>(
    (map, receipt) => {
      const currentReceipts = map.get(receipt.saleId) ?? [];
      currentReceipts.push(receipt);
      map.set(receipt.saleId, currentReceipts);
      return map;
    },
    new Map()
  );

  return (
    <PageLayout
      description="Vendas concentram estoque e financeiro: criam o pedido, baixam saldo e registram recebimentos, taxas, refund e chargeback no mesmo lugar."
      eyebrow="Vendas"
      title="Fluxo comercial"
    >
      <FeedbackBanner error={error} message={message} />

      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <Surface className="h-fit">
          <div className="mb-5 space-y-2">
            <h2 className="font-semibold text-lg">Nova venda</h2>
            <p className="text-muted-foreground text-sm">
              Comece com um item e adicione outros so quando precisar. Frete e
              desconto continuam no nivel do pedido.
            </p>
          </div>
          <SalesForm action={createSaleAction} products={productRows} />
        </Surface>

        <Surface>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Vendas registradas</h2>
              <p className="text-muted-foreground text-sm">
                O financeiro agora fica dentro da propria venda, sem modulo
                separado.
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
                const saleReceipts = receiptsBySaleId.get(sale.id) ?? [];

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
                            {sale.status}
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

                    <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                      <p>
                        Pedido:{" "}
                        <span className="font-semibold">
                          {formatCurrency(sale.orderTotal)}
                        </span>
                      </p>
                      <p>
                        Recebido bruto:{" "}
                        <span className="font-semibold">
                          {formatCurrency(sale.receivedGrossTotal)}
                        </span>
                      </p>
                      <p>
                        Recebido liquido:{" "}
                        <span className="font-semibold">
                          {formatCurrency(sale.receivedNetTotal)}
                        </span>
                      </p>
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

                    <div className="mt-4 grid gap-4 rounded-2xl border border-border/50 bg-card/70 p-4 xl:grid-cols-[1fr_0.9fr]">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-sm">
                            Financeiro da venda
                          </h3>
                          <p className="text-muted-foreground text-xs">
                            Registre aqui pagamento, parcial, pendencia, refund
                            ou chargeback.
                          </p>
                        </div>
                        {saleReceipts.length > 0 ? (
                          saleReceipts.map((receipt) => (
                            <div
                              className="rounded-xl border border-border/50 bg-background/70 px-3 py-3 text-sm"
                              key={receipt.id}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                                  {receipt.status}
                                </span>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                                  {receipt.method}
                                </span>
                              </div>
                              <div className="mt-2 grid gap-1 text-muted-foreground text-xs sm:grid-cols-2">
                                <p>
                                  Bruto:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(receipt.grossAmount)}
                                  </span>
                                </p>
                                <p>
                                  Liquido:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(receipt.netAmount)}
                                  </span>
                                </p>
                                <p>
                                  Taxa:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(receipt.feeAmount)}
                                  </span>
                                </p>
                                <p>
                                  Efetivo:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatDate(receipt.effectiveDate)}
                                  </span>
                                </p>
                              </div>
                              {receipt.notes ? (
                                <p className="mt-2 text-muted-foreground text-xs">
                                  {receipt.notes}
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
                              Tipo do evento
                            </label>
                            <select
                              className={inputClassName}
                              defaultValue="received"
                              id={`status-${sale.id}`}
                              name="status"
                              required
                            >
                              <option value="received">Recebido</option>
                              <option value="partial">Parcial</option>
                              <option value="pending">Pendente</option>
                              <option value="refunded">Refund</option>
                              <option value="chargeback">Chargeback</option>
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
                              <option value="card">Cartao</option>
                              <option value="payment_link">Link</option>
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
                description="Assim que houver estoque recebido, registre a primeira venda. O sistema baixa saldo, grava snapshot de custo e agora tambem concentra o financeiro no mesmo fluxo."
                title="Nenhuma venda registrada ainda"
              />
            )}
          </div>
        </Surface>
      </div>
    </PageLayout>
  );
}
