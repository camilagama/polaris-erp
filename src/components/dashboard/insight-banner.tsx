import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type { DashboardMetrics } from "@/features/dashboard/contracts";
import { formatCurrency } from "@/lib/formatters";

type InsightSeverity = "negative" | "neutral" | "positive";

interface Insight {
  action?: {
    label: string;
    href: string;
  };
  id: string;
  message: string;
  severity: InsightSeverity;
}

const containerClassBySeverity: Record<InsightSeverity, string> = {
  negative:
    "bg-destructive/8 text-destructive dark:bg-destructive/12 border border-destructive/20",
  neutral: "bg-muted/50 text-muted-foreground border border-border/50",
  positive:
    "bg-emerald-500/8 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-400 border border-emerald-500/20",
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
      action: {
        label: "Analisar custos",
        href: "/vendas",
      },
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
        action: {
          label: "Ajustar margens",
          href: "/produtos",
        },
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
          className={`flex items-start justify-between gap-4 rounded-lg px-4 py-3 text-sm leading-relaxed ${containerClassBySeverity[insight.severity]}`}
          key={insight.id}
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-1.5 block size-1.5 shrink-0 rounded-full ${dotClassBySeverity[insight.severity]}`}
            />
            <span>{insight.message}</span>
          </div>
          {insight.action && (
            <Link
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-background/50 px-2.5 py-1 font-medium text-xs transition-colors hover:bg-background"
              href={insight.action.href}
            >
              {insight.action.label}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={12}
                strokeWidth={2}
              />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
