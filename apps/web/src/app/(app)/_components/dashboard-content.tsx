import { Image01Icon, ShoppingBag02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { RevenueProfitChart } from "@polaris/ui/components/shared/revenue-profit-chart";
import { SalesCountChart } from "@polaris/ui/components/shared/sales-count-chart";
import { Badge } from "@polaris/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@polaris/ui/components/ui/card";
import { Empty } from "@polaris/ui/components/ui/empty";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { GoalDashboardCompactCard } from "@/components/dashboard/goal-dashboard-compact-card";
import { InsightBanner } from "@/components/dashboard/insight-banner";
import { OperationalCostsChart } from "@/components/dashboard/operational-costs-chart";
import { ProfitMarginChart } from "@/components/dashboard/profit-margin-chart";
import { RevenueResultChart } from "@/components/dashboard/revenue-result-chart";
import { SalesContributionGraphCard } from "@/components/dashboard/sales-contribution-graph-card";
import {
  getDashboardContributionGraph,
  getDashboardGlobalStats,
  getDashboardMetrics,
} from "@/features/dashboard/server";
import { getGoalsDashboardData } from "@/features/goals/server";
import { buildProductImageUrl } from "@/features/products/image-urls";
import { formatCurrency } from "@/lib/formatters";

const layoutContainmentStyle = {
  contain: "layout",
} as const satisfies CSSProperties;

const deferredAnalyticsSectionStyle = {
  containIntrinsicSize: "960px 640px",
  contentVisibility: "auto",
} as const satisfies CSSProperties;

export async function DashboardContent({
  organizationId,
  selectedRange,
}: {
  organizationId: string;
  selectedRange: { from: string; to: string };
}) {
  const [metrics, globalStats, contributionGraph, goalsPayload] =
    await Promise.all([
      getDashboardMetrics(organizationId, {
        from: selectedRange.from,
        to: selectedRange.to,
      }),
      getDashboardGlobalStats(organizationId),
      getDashboardContributionGraph(organizationId),
      getGoalsDashboardData(organizationId),
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
    <>
      <InsightBanner metrics={metrics} />

      <div
        className={`grid gap-4 md:grid-cols-2 ${goalsPayload.active.length > 0 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
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
            <CardHeader className="gap-1 pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="font-medium text-muted-foreground text-sm tracking-normal">
                  Retorno / Investimento
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 pt-0">
              <strong className="font-semibold text-3xl tabular-nums leading-none tracking-tight">
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

      <div className={`grid gap-4 md:grid-cols-2 ${bottomGridCols}`}>
        {summaryCards.map((card) => (
          <Card
            className="flex h-full flex-col justify-center"
            key={card.id}
            style={layoutContainmentStyle}
          >
            {card.id !== "revenue" && (
              <CardHeader className="gap-1 pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="font-medium text-muted-foreground text-sm tracking-normal">
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
                <strong className="font-semibold text-3xl tabular-nums leading-none tracking-tight">
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
                          <strong className="font-semibold text-3xl tabular-nums leading-none tracking-tight">
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
        className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]"
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
                            organizationId,
                            product.id,
                            product.imageVersion as number,
                            "table"
                          )
                        : null;

                      return (
                        <Link
                          className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-1.5 transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/50 active:scale-[0.98]"
                          href={`/produtos/${product.id}`}
                          key={product.id}
                        >
                          <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg border border-border/40 bg-muted/10 text-muted-foreground ring-1 ring-foreground/[0.06]">
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
                              />
                            ) : (
                              <HugeiconsIcon
                                icon={Image01Icon}
                                size={14}
                                strokeWidth={2}
                              />
                            )}
                          </div>
                          <span className="truncate font-medium text-sm group-hover:text-primary">
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
    </>
  );
}
