import { Image01Icon, ShoppingBag02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { DashboardDateRangeFilter } from "@/components/dashboard/dashboard-date-range-filter";
import { GoalDashboardCompactCard } from "@/components/dashboard/goal-dashboard-compact-card";
import { InsightBanner } from "@/components/dashboard/insight-banner";
import { OperationalCostsChart } from "@/components/dashboard/operational-costs-chart";
import { ProfitMarginChart } from "@/components/dashboard/profit-margin-chart";
import { RevenueProfitChart } from "@/components/dashboard/revenue-profit-chart";
import { RevenueResultChart } from "@/components/dashboard/revenue-result-chart";
import { SalesContributionGraphCard } from "@/components/dashboard/sales-contribution-graph-card";
import { SalesCountChart } from "@/components/dashboard/sales-count-chart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import {
  dashboardDatePresetOptions,
  resolveDashboardDateRange,
} from "@/features/dashboard/date-range";
import {
  getDashboardContributionGraph,
  getDashboardDateBounds,
  getDashboardGlobalStats,
  getDashboardMetrics,
} from "@/features/dashboard/server";
import { getGoalsDashboardData } from "@/features/goals/server";
import { buildProductImageUrl } from "@/features/products/image-urls";
import { requirePageAppContext } from "@/lib/app-session";
import { formatCurrency } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Dashboard | Polaris",
  description: "Painel inicial da operacao protegida do Polaris.",
};

const layoutContainmentStyle = {
  contain: "layout",
} as const satisfies CSSProperties;

const deferredAnalyticsSectionStyle = {
  containIntrinsicSize: "960px 640px",
  contentVisibility: "auto",
} as const satisfies CSSProperties;

export default async function DashboardPage(props: PageProps<"/">) {
  const context = await requirePageAppContext();
  const searchParams = await props.searchParams;
  const bounds = await getDashboardDateBounds(context.organizationId);
  const selectedRange = resolveDashboardDateRange({
    bounds,
    searchParams,
  });
  const [metrics, globalStats, contributionGraph, goalsPayload] =
    await Promise.all([
      getDashboardMetrics(context.organizationId, {
        from: selectedRange.from,
        to: selectedRange.to,
      }),
      getDashboardGlobalStats(context.organizationId),
      getDashboardContributionGraph(context.organizationId),
      getGoalsDashboardData(context.organizationId),
    ]);
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
      id: "count",
      label: "Vendas concluidas",
      note: "Quantidade no periodo",
      value: `${metrics.totalSalesCount}`,
    },
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
  ];

  let bottomGridCols = "lg:grid-cols-1";
  if (summaryCards.length === 4) {
    bottomGridCols = "lg:grid-cols-4";
  } else if (summaryCards.length === 3) {
    bottomGridCols = "lg:grid-cols-3";
  } else if (summaryCards.length === 2) {
    bottomGridCols = "lg:grid-cols-2";
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-balance font-heading font-semibold text-xl tracking-tight">
            Dashboard
          </h1>
        </div>
      </div>

      <InsightBanner metrics={metrics} />

      <div
        className={`fade-in-0 slide-in-from-bottom-2 grid animate-in gap-4 duration-300 ease-out md:grid-cols-2 ${goalsPayload.active.length > 0 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
      >
        <div className="flex h-full flex-col" style={layoutContainmentStyle}>
          <SalesContributionGraphCard
            className="h-full"
            graph={contributionGraph}
          />
        </div>

        {goalsPayload.active.length > 0 && (
          <div
            className="flex h-full flex-col gap-3"
            style={layoutContainmentStyle}
          >
            {goalsPayload.active.map((goal) => (
              <GoalDashboardCompactCard
                className="h-full"
                goal={goal}
                key={goal.id}
              />
            ))}
          </div>
        )}

        <div className="flex h-full flex-col" style={layoutContainmentStyle}>
          <Card className="flex h-full flex-col justify-center">
            <CardHeader className="gap-1">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="font-medium text-[10px] text-muted-foreground uppercase leading-none tracking-[0.14em]">
                  Retorno / Investimento
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              <strong className="font-mono text-2xl tabular-nums leading-none tracking-tight">
                {marginPercentage.toFixed(1)}%
              </strong>
              <ProfitMarginChart
                cost={globalStats.investment}
                profit={globalStats.profit}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-balance font-heading font-medium text-foreground/80 text-lg tracking-tight">
          Visão por período
        </h2>
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

      <div
        className={`fade-in-0 slide-in-from-bottom-2 grid animate-in gap-4 fill-mode-both duration-300 ease-out [animation-delay:150ms] md:grid-cols-2 ${bottomGridCols}`}
      >
        {summaryCards.map((card) => (
          <Card
            className="flex h-full flex-col justify-center"
            key={card.id}
            style={layoutContainmentStyle}
          >
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
            <CardContent className="flex flex-col gap-1.5">
              {card.id !== "revenue" && card.id !== "count" && (
                <strong className="font-mono text-2xl tabular-nums leading-none tracking-tight">
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
                  case "count":
                    return (
                      <div className="flex items-end justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <strong className="font-mono text-2xl tabular-nums leading-none tracking-tight">
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

      <div
        className="fade-in-0 slide-in-from-bottom-2 grid animate-in gap-4 fill-mode-both duration-300 ease-out [animation-delay:300ms] xl:grid-cols-[1.35fr_0.95fr]"
        style={deferredAnalyticsSectionStyle}
      >
        <Card
          className="flex h-full flex-col justify-center"
          style={layoutContainmentStyle}
        >
          <CardHeader className="gap-1">
            <CardTitle className="text-base">Vendas x custos</CardTitle>
            <CardDescription>Fluxo financeiro no periodo</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            <RevenueResultChart data={metrics.periodComparison} />
          </CardContent>
        </Card>

        <div className="grid gap-4" style={layoutContainmentStyle}>
          <Card className="flex h-full flex-col" style={layoutContainmentStyle}>
            <CardHeader>
              <CardTitle className="text-base">
                Produtos mais vendidos
              </CardTitle>
              <CardDescription>
                Ranking de performance do catalogo
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col">
              {metrics.topProducts.length === 0 ? (
                <Empty
                  className="h-48 border-dashed shadow-none"
                  description="Nao ha vendas suficientes neste periodo."
                  icon={ShoppingBag02Icon}
                  title="Sem vendas no periodo"
                />
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
                            context.organizationId,
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
                          <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg border border-border/40 bg-muted/10 text-muted-foreground/50 ring-1 ring-foreground/[0.06] dark:ring-white/[0.08]">
                            {imageUrl ? (
                              <Image
                                alt={product.name}
                                blurDataURL={
                                  product.imageBlurDataUrl ?? undefined
                                }
                                className="object-cover"
                                fill
                                placeholder={
                                  product.imageBlurDataUrl ? "blur" : "empty"
                                }
                                sizes="32px"
                                src={imageUrl}
                                unoptimized
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
