import { desc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import {
  products,
  receipts,
  saleItems,
  sales,
  systemSettings,
} from "@/db/schema";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const metricCardClassName =
  "rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm";

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

  const [productRows, saleRows, saleItemRows, receiptRows, settingsRows] =
    await Promise.all([
      db.select().from(products).orderBy(desc(products.updatedAt)),
      db.select().from(sales).orderBy(desc(sales.saleDate)),
      db.select().from(saleItems),
      db.select().from(receipts).orderBy(desc(receipts.createdAt)),
      db.select().from(systemSettings).limit(1),
    ]);

  const activeProducts = productRows.filter(
    (product) => product.status === "active"
  );
  const lowStockThreshold = settingsRows[0]?.lowStockThreshold ?? 2;
  const staleProductDays = settingsRows[0]?.staleProductDays ?? 45;
  const staleCutoff = subtractDays(now, staleProductDays);
  const lowStockProducts = activeProducts.filter(
    (product) => product.currentStock <= lowStockThreshold
  );
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
  const filteredReceipts = receiptRows.filter(
    (receipt) =>
      filteredSaleIds.has(receipt.saleId) &&
      receipt.status !== "pending" &&
      receipt.status !== "canceled"
  );

  const grossRevenue = filteredSales.reduce(
    (total, sale) => total + Number(sale.orderTotal ?? 0),
    0
  );
  const receivedGross = filteredSales.reduce(
    (total, sale) => total + Number(sale.receivedGrossTotal ?? 0),
    0
  );
  const receivedNet = filteredSales.reduce(
    (total, sale) => total + Number(sale.receivedNetTotal ?? 0),
    0
  );
  const costOfGoodsSold = filteredSaleItems.reduce(
    (total, item) => total + Number(item.costSnapshotTotal ?? 0),
    0
  );
  const totalFees = filteredReceipts.reduce(
    (total, receipt) => total + Number(receipt.feeAmount ?? 0),
    0
  );
  const grossProfit = grossRevenue - costOfGoodsSold;
  const netProfit = receivedNet - costOfGoodsSold;
  const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
  const averageTicket =
    filteredSales.length > 0 ? grossRevenue / filteredSales.length : 0;
  const recentSales = filteredSales.slice(0, 5).map((sale) => ({
    ...sale,
    itemCount: filteredSaleItems.filter((item) => item.saleId === sale.id)
      .length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="font-semibold text-primary text-xs uppercase tracking-[0.18em]">
            Visao geral
          </p>
          <h1 className="font-heading font-semibold text-3xl tracking-tight">
            Dashboard operacional
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Indicadores reais da V1: faturamento, lucro, caixa recebido, capital
            em estoque e sinais de produtos parados ou com saldo critico.
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Faturamento bruto</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {formatCurrency(grossRevenue)}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Lucro bruto</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {formatCurrency(grossProfit)}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Lucro liquido</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {formatCurrency(netProfit)}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Margem bruta</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {grossMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Recebido bruto</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {formatCurrency(receivedGross)}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Recebido liquido</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {formatCurrency(receivedNet)}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Ticket medio</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {formatCurrency(averageTicket)}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Taxas no periodo</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {formatCurrency(totalFees)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Capital em estoque</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {formatCurrency(stockValue)}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Produtos ativos</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {activeProducts.length}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Estoque critico</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {lowStockProducts.length}
          </p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-muted-foreground text-sm">Produtos parados</p>
          <p className="mt-3 font-heading font-semibold text-3xl">
            {staleProducts.length}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-lg">
              Vendas recentes no periodo
            </h2>
            <p className="text-muted-foreground text-sm">
              Leituras de pedido, recebimento e status financeiro no corte
              atual.
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
                        {sale.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {sale.channel} · {sale.itemCount} itens ·{" "}
                      {formatDateTime(sale.saleDate)}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">
                      {formatCurrency(sale.orderTotal)}
                    </p>
                    <p className="text-muted-foreground">
                      liq. {formatCurrency(sale.receivedNetTotal)}
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
          <h2 className="font-semibold text-lg">Alertas do periodo</h2>
          <div className="mt-4 space-y-3 text-sm">
            {[
              `${lowStockProducts.length} produtos em estoque critico com limite de ${lowStockThreshold}.`,
              `${staleProducts.length} produtos sem giro dentro da janela de ${staleProductDays} dias.`,
              `${filteredSales.length} vendas consideradas no recorte atual.`,
            ].map((item) => (
              <div
                className="rounded-xl border border-border/50 bg-background/60 px-4 py-3"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
