import {
  AlertBanner,
  type AlertBannerMessage,
} from "@polaris/ui/components/shared/alert-banner";
import type { DashboardMetrics } from "@/features/dashboard/contracts";
import { formatCurrency } from "@/lib/formatters";

function deriveInsights(metrics: DashboardMetrics): AlertBannerMessage[] {
  const insights: AlertBannerMessage[] = [];

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
  return <AlertBanner alerts={insights} />;
}
