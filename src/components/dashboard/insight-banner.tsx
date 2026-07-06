import type { DashboardMetrics } from "@/features/dashboard/contracts";
import { formatCurrency } from "@/lib/formatters";

type InsightSeverity = "negative" | "neutral" | "positive";

interface Insight {
  id: string;
  message: string;
  severity: InsightSeverity;
}

const containerClassBySeverity: Record<InsightSeverity, string> = {
  negative: "bg-destructive/8 text-destructive dark:bg-destructive/12",
  neutral: "bg-muted/50 text-muted-foreground",
  positive:
    "bg-emerald-500/8 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-400",
};

const dotClassBySeverity: Record<InsightSeverity, string> = {
  negative: "bg-destructive",
  neutral: "bg-muted-foreground/50",
  positive: "bg-emerald-500",
};

function deriveInsights(metrics: DashboardMetrics): Insight[] {
  const insights: Insight[] = [];

  if (metrics.resultStatus === "loss") {
    insights.push({
      id: "result-loss",
      message: `O resultado do periodo e negativo: ${formatCurrency(metrics.totalResult)}. As vendas nao cobriram os custos operacionais.`,
      severity: "negative",
    });
  }

  const totalCosts =
    metrics.totalProductCosts + metrics.totalShippingAndSellerFees;
  if (metrics.totalSold > 0 && totalCosts > 0) {
    const marginPercent =
      ((metrics.totalSold - totalCosts) / metrics.totalSold) * 100;
    if (marginPercent < 15) {
      insights.push({
        id: "low-margin",
        message: `Margem liquida do periodo em ${marginPercent.toFixed(1)}%, abaixo do recomendado (15%).`,
        severity: "negative",
      });
    }
  }

  if (metrics.totalSalesCount === 0) {
    insights.push({
      id: "no-sales",
      message: "Nenhuma venda registrada neste periodo.",
      severity: "neutral",
    });
  }

  return insights;
}

export function InsightBanner({ metrics }: { metrics: DashboardMetrics }) {
  const insights = deriveInsights(metrics);

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {insights.map((insight) => (
        <div
          className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm leading-relaxed ${containerClassBySeverity[insight.severity]}`}
          key={insight.id}
        >
          <span
            aria-hidden
            className={`mt-1.5 block size-1.5 shrink-0 rounded-full ${dotClassBySeverity[insight.severity]}`}
          />
          {insight.message}
        </div>
      ))}
    </div>
  );
}
