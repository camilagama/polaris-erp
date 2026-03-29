import { desc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import {
  paymentEvents,
  products,
  saleItems,
  sales,
  systemSettings,
} from "@/db/schema";
import { toNumber } from "@/lib/domain/calculations";
import {
  calculateSaleGrossProfit,
  calculateSaleNetProfit,
  summarizePaymentLedger,
} from "@/lib/domain/payment-ledger";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const metricCardClassName =
  "rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm sm:p-5";

const periodOptions = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
  { label: "365 dias", value: 365 },
] as const;

const subtractDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() - days);
  return nextDate;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const requestedPeriod = Number(resolvedSearchParams.period ?? 30);
  const selectedPeriod = periodOptions.some(
    (option) => option.value === requestedPeriod
  )
    ? requestedPeriod
    : 30;
  const now = new Date();
  const periodStart = subtractDays(now, selectedPeriod);

  const [productRows, saleRows, saleItemRows, paymentRows, settingsRows] =
    await Promise.all([
      db.select().from(products).orderBy(desc(products.updatedAt)),
      db.select().from(sales).orderBy(desc(sales.saleDate)),
      db.select().from(saleItems),
      db.select().from(paymentEvents).orderBy(desc(paymentEvents.createdAt)),
      db.select().from(systemSettings).limit(1),
    ]);

  const activeProducts = productRows.filter(
    (product) => product.status === "active"
  );
  const lowStockThreshold = settingsRows[0]?.lowStockThreshold ?? 2;
  const staleProductDays = settingsRows[0]?.staleProductDays ?? 45;
  const staleCutoff = subtractDays(now, staleProductDays);
  const lowStockProducts = activeProducts.filter((product) => {
    return product.currentStock <= lowStockThreshold;
  });
  const staleProducts = activeProducts.filter((product) => {
    if (!product.lastSoldAt) {
      return true;
    }

    return product.lastSoldAt < staleCutoff;
  });
  const stockValue = activeProducts.reduce(
    (total, product) =>
      total + product.currentStock * Number(product.averageCost ?? 0),
    0
  );

  const filteredSales = saleRows.filter(
    (sale) => sale.saleDate >= periodStart && sale.status !== "canceled"
  );
  const filteredSaleIds = new Set(filteredSales.map((sale) => sale.id));
  const filteredSaleItems = saleItemRows.filter((item) =>
    filteredSaleIds.has(item.saleId)
  );
  const filteredPayments = paymentRows.filter((payment) =>
    filteredSaleIds.has(payment.saleId)
  );

  const soldAmount = filteredSales.reduce(
    (total, sale) => total + Number(sale.orderTotal ?? 0),
    0
  );
  const ticketAverage =
    filteredSales.length > 0 ? soldAmount / filteredSales.length : 0;
  const grossProfit = filteredSales.reduce((total, sale) => {
    const items = filteredSaleItems.filter((item) => item.saleId === sale.id);
    const costOfGoodsSold = items.reduce(
      (costTotal, item) => costTotal + toNumber(item.costSnapshotTotal),
      0
    );

    return (
      total +
      calculateSaleGrossProfit(toNumber(sale.orderTotal), costOfGoodsSold)
    );
  }, 0);
  const netProfit = filteredSales.reduce((total, sale) => {
    const items = filteredSaleItems.filter((item) => item.saleId === sale.id);
    const salePayments = filteredPayments.filter(
      (payment) => payment.saleId === sale.id
    );
    const costOfGoodsSold = items.reduce(
      (costTotal, item) => costTotal + toNumber(item.costSnapshotTotal),
      0
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
  const receivedNet = filteredSales.reduce(
    (total, sale) => total + Number(sale.receivedNetTotal ?? 0),
    0
  );
  const receivableTotal = filteredSales.reduce((total, sale) => {
    const salePayments = filteredPayments.filter(
      (payment) => payment.saleId === sale.id
    );
    const paymentSummary = summarizePaymentLedger(
      toNumber(sale.orderTotal),
      salePayments
    );

    return total + paymentSummary.amountDue;
  }, 0);
  const paymentCosts = filteredPayments
    .filter((payment) => payment.status === "confirmed")
    .reduce((total, payment) => total + Number(payment.feeAmount ?? 0), 0);
  const recentSales = filteredSales.slice(0, 5).map((sale) => {
    const itemCount = filteredSaleItems.filter(
      (item) => item.saleId === sale.id
    ).length;
    const paymentSummary = summarizePaymentLedger(
      toNumber(sale.orderTotal),
      filteredPayments.filter((payment) => payment.saleId === sale.id)
    );

    return {
      ...sale,
      amountDue: paymentSummary.amountDue,
      itemCount,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="font-semibold text-primary text-xs uppercase tracking-[0.18em]">
            Visao geral
          </p>
          <h1 className="font-heading font-semibold text-2xl tracking-tight sm:text-3xl">
            Dashboard operacional
          </h1>
          <p className="max-w-3xl text-muted-foreground text-sm sm:text-base">
            O foco agora e separar operacao e caixa com mais clareza: quanto foi
            vendido, quanto gerou de margem, quanto entrou e quanto ainda falta
            receber.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <Link
              className={cn(
                "rounded-full border px-3 py-1.5 font-medium text-sm transition",
                selectedPeriod === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted"
              )}
              href={`/?period=${option.value}`}
              key={option.value}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Vendido no periodo</p>
          <p className="mt-3 font-heading font-semibold text-2xl sm:text-3xl">
            {formatCurrency(soldAmount)}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Lucro bruto</p>
          <p className="mt-3 font-heading font-semibold text-2xl sm:text-3xl">
            {formatCurrency(grossProfit)}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Lucro liquido</p>
          <p className="mt-3 font-heading font-semibold text-2xl sm:text-3xl">
            {formatCurrency(netProfit)}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Recebido liquido</p>
          <p className="mt-3 font-heading font-semibold text-2xl sm:text-3xl">
            {formatCurrency(receivedNet)}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">A receber</p>
          <p className="mt-3 font-heading font-semibold text-2xl sm:text-3xl">
            {formatCurrency(receivableTotal)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Ticket medio</p>
          <p className="mt-3 font-heading font-semibold text-2xl sm:text-3xl">
            {formatCurrency(ticketAverage)}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Estoque baixo</p>
          <p className="mt-3 font-heading font-semibold text-2xl sm:text-3xl">
            {lowStockProducts.length}
          </p>
          <Link
            className="mt-4 inline-flex text-primary text-sm transition hover:opacity-80"
            href="/estoque"
          >
            Resolver em Estoque
          </Link>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Produtos parados</p>
          <p className="mt-3 font-heading font-semibold text-2xl sm:text-3xl">
            {staleProducts.length}
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Sem giro dentro da janela de {staleProductDays} dias.
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Capital em estoque</p>
          <p className="mt-3 font-heading font-semibold text-2xl sm:text-3xl">
            {formatCurrency(stockValue)}
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Taxas financeiras no periodo: {formatCurrency(paymentCosts)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-lg">Vendas recentes</h2>
            <p className="text-muted-foreground text-sm">
              Resumo rapido das vendas do recorte atual.
            </p>
          </div>
          <div className="space-y-3">
            {recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div
                  className="grid gap-3 rounded-xl border border-border/50 bg-background/60 px-4 py-3 md:grid-cols-[1fr_auto]"
                  key={sale.id}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm">Venda #{sale.id}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]">
                        {sale.paymentStatus}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {sale.channel} · {sale.itemCount} itens ·{" "}
                      {formatDateTime(sale.saleDate)}
                    </p>
                  </div>
                  <div className="text-sm md:text-right">
                    <p className="font-semibold">
                      {formatCurrency(sale.orderTotal)}
                    </p>
                    <p className="text-muted-foreground">
                      falta receber {formatCurrency(sale.amountDue)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-border/60 border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
                Ainda nao ha vendas no periodo selecionado.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-lg">Atalhos da operacao</h2>
          <div className="mt-4 space-y-3">
            <Link
              className="block rounded-xl border border-border/50 bg-background/60 px-4 py-3 transition hover:bg-muted/40"
              href="/produtos"
            >
              <p className="font-medium text-sm">Produtos e Estoque</p>
              <p className="text-muted-foreground text-sm">
                Hub central: gerencie catálogo, registre entradas e faça
                ajustes.
              </p>
            </Link>
            <Link
              className="block rounded-xl border border-border/50 bg-background/60 px-4 py-3 transition hover:bg-muted/40"
              href="/vendas"
            >
              <p className="font-medium text-sm">Vendas</p>
              <p className="text-muted-foreground text-sm">
                Lance novas vendas e registre faturamento com baixa automática.
              </p>
            </Link>
            <Link
              className="block rounded-xl border border-border/50 bg-background/60 px-4 py-3 transition hover:bg-muted/40"
              href="/recebimentos"
            >
              <p className="font-medium text-sm">Fluxo de Caixa</p>
              <p className="text-muted-foreground text-sm">
                Acompanhe o dinheiro: recebimentos, pendências e taxas.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
