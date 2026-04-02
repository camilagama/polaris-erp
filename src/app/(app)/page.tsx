import type { Metadata } from "next";
import Link from "next/link";
import { InventoryCategoriesChart } from "@/components/dashboard/inventory-categories-chart";
import { RevenueResultChart } from "@/components/dashboard/revenue-result-chart";
import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardMetrics } from "@/features/dashboard/server";
import { formatCurrency } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Dashboard | DG Imports",
  description: "Painel inicial da operacao protegida do DG Imports.",
};

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  let resultBadge: {
    label: string;
    variant: "destructive" | "outline" | "secondary";
  };

  if (metrics.resultStatus === "profit") {
    resultBadge = {
      label: "Lucro",
      variant: "secondary",
    };
  } else if (metrics.resultStatus === "loss") {
    resultBadge = {
      label: "Prejuizo",
      variant: "destructive",
    };
  } else {
    resultBadge = {
      label: "Empate",
      variant: "outline",
    };
  }

  const summaryCards = [
    {
      label: "Faturamento do mes",
      note: metrics.referenceMonthLabel,
      value: formatCurrency(metrics.monthlyRevenue),
    },
    {
      badge: resultBadge,
      label: "Resultado das vendas",
      note: `Fechamento de ${metrics.referenceMonthLabel}`,
      value: formatCurrency(metrics.monthlyResult),
    },
    {
      label: "Investimento em reposicao",
      note: `Entradas de ${metrics.referenceMonthLabel}`,
      value: formatCurrency(metrics.monthlyRestockInvestment),
    },
    {
      label: "Estoque critico",
      note: "Produtos ativos sem estoque",
      value: `${metrics.criticalStockCount}`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-primary text-xs uppercase tracking-[0.18em]">
            Painel operacional
          </p>
          <h1 className="font-heading font-semibold text-2xl tracking-tight sm:text-3xl">
            Indicadores essenciais da operacao
          </h1>
          <p className="max-w-3xl text-muted-foreground text-sm leading-6">
            O dashboard concentra apenas o necessario para o cliente final:
            faturamento e resultado do mes, investimento em reposicao, estoque
            critico e a distribuicao atual dos produtos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/vendas">Registrar venda</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/produtos">Ver produtos</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/configuracoes">Ajustar regras</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  {card.label}
                </CardTitle>
                {card.badge ? (
                  <Badge variant={card.badge.variant}>{card.badge.label}</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <strong className="font-heading text-3xl tracking-tight">
                {card.value}
              </strong>
              <span className="font-mono text-muted-foreground text-xs">
                {card.note}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-lg">Faturamento x resultado</CardTitle>
            <CardDescription>
              Comparativo dos ultimos 6 meses para acompanhar receita e
              fechamento operacional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueResultChart data={metrics.monthlyComparison} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="gap-2">
              <CardTitle className="text-lg">Produtos mais vendidos</CardTitle>
              <CardDescription>
                Ranking do mes atual por quantidade vendida.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TopProductsChart data={metrics.topProducts} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle className="text-lg">Categorias no estoque</CardTitle>
              <CardDescription>
                Participacao do valor imobilizado atual por categoria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryCategoriesChart data={metrics.inventoryByCategory} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">Reposicao prioritaria</CardTitle>
          <CardDescription>
            Produtos ativos com estoque zerado ou ate 2 unidades restantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {metrics.restockAlerts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum produto exige reposicao imediata neste momento.
            </p>
          ) : (
            metrics.restockAlerts.map((product) => (
              <Link
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/10 px-3 py-3 transition-colors hover:bg-muted/20"
                href={`/produtos/${product.id}`}
                key={product.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{product.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {product.stock === 0
                      ? "Sem estoque"
                      : `${product.stock} unidade(s) restantes`}
                  </p>
                </div>
                <Badge
                  variant={
                    product.severity === "critical" ? "destructive" : "outline"
                  }
                >
                  {product.severity === "critical"
                    ? "Reposicao imediata"
                    : "Estoque baixo"}
                </Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
