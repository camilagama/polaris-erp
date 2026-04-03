import { Image01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DashboardDateRangeFilter } from "@/components/dashboard/dashboard-date-range-filter";
import { OperationalCostsChart } from "@/components/dashboard/operational-costs-chart";
import { ProfitMarginChart } from "@/components/dashboard/profit-margin-chart";
import { RevenueProfitChart } from "@/components/dashboard/revenue-profit-chart";
import { RevenueResultChart } from "@/components/dashboard/revenue-result-chart";
import { SalesCountChart } from "@/components/dashboard/sales-count-chart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  dashboardDatePresetOptions,
  resolveDashboardDateRange,
} from "@/features/dashboard/date-range";
import {
  getDashboardDateBounds,
  getDashboardGlobalStats,
  getDashboardMetrics,
} from "@/features/dashboard/server";
import { buildProductImageUrl } from "@/features/products/image-urls";
import { formatCurrency } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Dashboard | DG Imports",
  description: "Painel inicial da operacao protegida do DG Imports.",
};

export default async function DashboardPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const bounds = await getDashboardDateBounds();
  const selectedRange = resolveDashboardDateRange({
    bounds,
    searchParams,
  });
  const metrics = await getDashboardMetrics({
    from: selectedRange.from,
    to: selectedRange.to,
  });
  const globalStats = await getDashboardGlobalStats();
  const marginPercentage =
    globalStats.investment > 0
      ? (globalStats.profit / globalStats.investment) * 100
      : 0;

  const summaryCards: Array<{
    id: "revenue" | "costs" | "margin" | "count";
    label: string;
    value: string;
    note?: string;
    badge?: {
      label: string;
      variant: "destructive" | "outline" | "secondary";
    };
  }> = [
    {
      id: "revenue",
      label: "Receita / Lucro",
      value: formatCurrency(metrics.totalSold),
    },
    {
      id: "costs",
      label: "Custos operacionais",
      value: formatCurrency(
        metrics.totalProductCosts + metrics.totalShippingAndSellerFees
      ),
    },
    {
      id: "margin",
      label: "Retorno / Investimento",
      value: `${marginPercentage.toFixed(1)}%`,
    },
    {
      id: "count",
      label: "Vendas concluidas",
      note: "Quantidade no periodo",
      value: `${metrics.totalSalesCount}`,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="font-semibold text-[11px] text-primary uppercase tracking-[0.18em]">
            Dashboard
          </p>
          <h1 className="font-heading font-semibold text-2xl tracking-tight">
            Visao geral
          </h1>
        </div>

        <div className="flex flex-wrap gap-2 sm:min-w-72 sm:justify-end">
          <DashboardDateRangeFilter
            bounds={bounds}
            from={selectedRange.from}
            preset={selectedRange.preset}
            presets={dashboardDatePresetOptions}
            to={selectedRange.to}
            variant="dashboard"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.id}>
            {card.id !== "revenue" && (
              <CardHeader className="gap-1">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="font-medium text-[10px] text-muted-foreground uppercase leading-none tracking-[0.14em]">
                    {card.label}
                  </CardTitle>
                  {card.badge ? (
                    <Badge
                      variant={
                        card.badge.variant as
                          | "destructive"
                          | "outline"
                          | "secondary"
                      }
                    >
                      {card.badge.label}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
            )}
            <CardContent className="flex flex-col gap-1.5 pt-0">
              {card.id !== "revenue" && card.id !== "count" && (
                <strong className="font-mono text-2xl leading-none tracking-tight">
                  {card.value}
                </strong>
              )}
              {(() => {
                switch (card.id) {
                  case "revenue":
                    return (
                      <RevenueProfitChart
                        profit={metrics.totalResult}
                        revenue={metrics.totalSold}
                      />
                    );
                  case "costs":
                    return (
                      <OperationalCostsChart
                        totalProductCosts={metrics.totalProductCosts}
                        totalShippingAndSellerFees={
                          metrics.totalShippingAndSellerFees
                        }
                      />
                    );
                  case "margin":
                    return (
                      <ProfitMarginChart
                        cost={globalStats.investment}
                        profit={globalStats.profit}
                      />
                    );
                  case "count":
                    return (
                      <div className="flex items-end justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <strong className="font-mono text-2xl leading-none tracking-tight">
                            {card.value}
                          </strong>
                          {card.note && (
                            <span className="text-[11px] text-muted-foreground">
                              {card.note}
                            </span>
                          )}
                        </div>
                        <div className="flex h-14 max-w-[60%] flex-1 justify-end pb-1 pl-2">
                          <SalesCountChart data={metrics.periodComparison} />
                        </div>
                      </div>
                    );
                  default:
                    return null;
                }
              })()}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="text-base">Vendas x custos</CardTitle>
            <CardDescription>Fluxo financeiro no periodo</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <RevenueResultChart data={metrics.periodComparison} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Produtos mais vendidos
              </CardTitle>
              <CardDescription>
                Ranking de performance do catalogo
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {metrics.topProducts.length === 0 ? (
                <div className="flex h-48 items-center justify-center rounded-2xl border border-border/70 border-dashed bg-muted/10 px-4 text-center text-muted-foreground text-sm">
                  Sem vendas no periodo para montar o ranking.
                </div>
              ) : (
                <div className="rounded-xl border border-border/60">
                  <div className="divide-y divide-border/50">
                    {metrics.topProducts.slice(0, 5).map((product) => {
                      const hasImage =
                        product.imageVersion !== null &&
                        product.imageWidth !== null &&
                        product.imageHeight !== null;

                      const imageUrl = hasImage
                        ? buildProductImageUrl(
                            product.id,
                            product.imageVersion as number,
                            "table"
                          )
                        : null;

                      return (
                        <Link
                          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-1.5"
                          href={`/produtos/${product.id}`}
                          key={product.id}
                        >
                          <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg border border-border/40 bg-muted/10 text-muted-foreground/50">
                            {imageUrl ? (
                              <Image
                                alt={product.name}
                                className="object-cover"
                                fill
                                sizes="32px"
                                src={imageUrl}
                              />
                            ) : (
                              <HugeiconsIcon
                                icon={Image01Icon}
                                size={14}
                                strokeWidth={2}
                              />
                            )}
                          </div>
                          <span className="truncate font-medium text-sm hover:underline">
                            {product.name}
                          </span>
                          <span className="font-mono font-semibold text-sm tabular-nums">
                            {product.quantitySold}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
