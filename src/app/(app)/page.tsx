import type { Metadata } from "next";
import { DashboardDateRangeFilter } from "@/components/dashboard/dashboard-date-range-filter";
import { InventoryCategoriesChart } from "@/components/dashboard/inventory-categories-chart";
import { RevenueResultChart } from "@/components/dashboard/revenue-result-chart";
import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolveDashboardDateRange } from "@/features/dashboard/date-range";
import { getDashboardMetrics } from "@/features/dashboard/server";
import { formatCurrency } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Dashboard | DG Imports",
  description: "Painel inicial da operacao protegida do DG Imports.",
};

export default async function DashboardPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const selectedRange = resolveDashboardDateRange(searchParams);
  const metrics = await getDashboardMetrics({
    from: selectedRange.from,
    to: selectedRange.to,
  });
  let resultBadge: {
    label: string;
    variant: "destructive" | "outline" | "secondary";
  };
  let resultLabel = "Resultado no periodo";
  let resultSummary = "Vendas e custos ficaram equilibrados.";

  if (metrics.resultStatus === "profit") {
    resultBadge = {
      label: "Lucro",
      variant: "secondary",
    };
    resultLabel = "Lucro no periodo";
    resultSummary = "As vendas ficaram acima dos custos.";
  } else if (metrics.resultStatus === "loss") {
    resultBadge = {
      label: "Prejuizo",
      variant: "destructive",
    };
    resultLabel = "Prejuizo no periodo";
    resultSummary = "Os custos ficaram acima das vendas.";
  } else {
    resultBadge = {
      label: "Empatado",
      variant: "outline",
    };
  }

  const summaryCards = [
    {
      label: "Total vendido",
      note: "Valor cobrado no periodo",
      value: formatCurrency(metrics.totalSold),
    },
    {
      badge: resultBadge,
      label: resultLabel,
      note: "Lucro ou prejuizo",
      value: formatCurrency(metrics.totalResult),
    },
    {
      label: "Custos no periodo",
      note: "Custo de Produtos e frete",
      value: formatCurrency(metrics.totalCosts),
    },
    {
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
            from={selectedRange.from}
            preset={selectedRange.preset}
            to={selectedRange.to}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="gap-1 pb-1.5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                  {card.label}
                </CardTitle>
                {card.badge ? (
                  <Badge variant={card.badge.variant}>{card.badge.label}</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 pt-0">
              <strong className="font-heading text-[1.65rem] leading-none tracking-tight">
                {card.value}
              </strong>
              <span className="text-[11px] text-muted-foreground">
                {card.note}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader className="gap-1 pb-2">
            <CardTitle className="text-base">Vendas x custos</CardTitle>
            <CardDescription>{selectedRange.label}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <RevenueResultChart data={metrics.periodComparison} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="gap-1 pb-2">
              <CardTitle className="text-base">
                Produtos mais vendidos
              </CardTitle>
              <CardDescription>{selectedRange.label}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <TopProductsChart data={metrics.topProducts} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-1 pb-2">
              <CardTitle className="text-base">Categorias no estoque</CardTitle>
              <CardDescription>Estoque atual</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <InventoryCategoriesChart data={metrics.inventoryByCategory} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
            Situacao
          </p>
          <p className="mt-1 font-medium text-sm">{resultSummary}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
            Produto em destaque
          </p>
          <p className="mt-1 font-medium text-sm">
            {metrics.topProducts[0]?.name ?? "Sem destaque."}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
            Categoria principal
          </p>
          <p className="mt-1 font-medium text-sm">
            {metrics.inventoryByCategory[0]?.categoryName ??
              "Sem distribuicao."}
          </p>
        </div>
      </div>
    </div>
  );
}
