"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { loadMoreSalesAction } from "@/app/(app)/vendas/pagination";
import type { SaleStatusFilter } from "@/app/(app)/vendas/queries";
import { DashboardDateRangeFilter } from "@/components/dashboard/dashboard-date-range-filter";
import { CreateSaleDialog } from "@/components/sales/create-sale-dialog";
import { PaymentMethodChart } from "@/components/sales/payment-method-chart";
import { SalesPerformanceChart } from "@/components/sales/sales-performance-chart";
import { SalesStatusChart } from "@/components/sales/sales-status-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CardInstallmentRule } from "@/features/catalog/payment-rules";
import type {
  SaleListItem,
  SaleProductOption,
  SalesAnalytics,
} from "@/features/sales/contracts";
import {
  type SalesDateRange,
  salesDatePresetOptions,
} from "@/features/sales/date-range";
import { formatCurrency, formatDate, formatPercent } from "@/lib/formatters";

const getStatusLabel = (status: SaleListItem["status"]) => {
  if (status === "cancelled") {
    return "Cancelada";
  }

  return "Concluida";
};

const getStatusVariant = (status: SaleListItem["status"]) => {
  if (status === "cancelled") {
    return "destructive" as const;
  }

  return "secondary" as const;
};

const getPaymentMethodLabel = (
  sale: Pick<SaleListItem, "paymentInstallments" | "paymentMethod">
) => {
  if (sale.paymentMethod === "pix") {
    return "Pix";
  }

  return `Cartao ${sale.paymentInstallments}x`;
};

const getSalesEmptyStateTitle = ({
  appliedQuery,
  status,
}: {
  appliedQuery: string;
  status: SaleStatusFilter;
}) => {
  if (appliedQuery) {
    return "Nenhuma venda corresponde aos filtros atuais.";
  }

  if (status === "cancelled") {
    return "Nenhuma venda cancelada encontrada.";
  }

  if (status === "completed") {
    return "Nenhuma venda concluida encontrada.";
  }

  return "Nenhuma venda encontrada.";
};

const getSalesSummarySuffix = (status: SaleStatusFilter) => {
  if (status === "all") {
    return ".";
  }

  return ` em vendas ${status === "completed" ? "concluidas" : "canceladas"}.`;
};

function MobileAnalyticsSection({
  analytics,
  dateBounds,
  selectedRange,
}: {
  analytics: SalesAnalytics;
  dateBounds: {
    from: string;
    to: string;
  };
  selectedRange: SalesDateRange;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading font-semibold text-xl tracking-tight">
              Analytics
            </h2>
            <p className="text-muted-foreground text-sm">
              Indicadores e distribuicoes do periodo selecionado.
            </p>
          </div>
          <Button
            className="lg:hidden"
            onClick={() => setExpanded((current) => !current)}
            size="sm"
            type="button"
            variant="outline"
          >
            {expanded ? "Ocultar" : "Mostrar"}
          </Button>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-80">
          <DashboardDateRangeFilter
            bounds={dateBounds}
            from={selectedRange.from}
            preset={selectedRange.preset}
            presets={salesDatePresetOptions}
            to={selectedRange.to}
            variant="sales"
          />
        </div>
      </div>

      <div className={expanded ? "grid gap-4" : "hidden lg:grid lg:gap-4"}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[0.85fr_0.95fr_0.95fr_1.8fr]">
          <div className="flex flex-col gap-4">
            <Card className="flex flex-1 flex-col justify-center">
              <CardHeader className="gap-1 pb-2">
                <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                  Total vendido
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <strong className="font-heading text-[1.8rem] leading-none tracking-tight">
                  {formatCurrency(analytics.totalSold)}
                </strong>
                <CardDescription className="mt-1 text-xs">
                  Total vendido no periodo selecionado.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="flex flex-1 flex-col justify-center">
              <CardHeader className="gap-1 pb-2">
                <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                  Lucro total
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <strong className="font-heading text-[1.8rem] leading-none tracking-tight">
                  {formatCurrency(analytics.totalProfit)}
                </strong>
                <CardDescription className="mt-1 text-xs">
                  Margem de {formatPercent(analytics.profitMarginPercent)}%.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <Card className="flex flex-col">
            <CardHeader className="gap-1 pb-2">
              <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                Status das vendas
              </CardTitle>
              <CardDescription className="text-xs">
                Ticket medio de {formatCurrency(analytics.averageTicket)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 items-center pt-0">
              <SalesStatusChart data={analytics.statusSummary} />
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="gap-1 pb-2">
              <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                Mix de pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 items-center pt-0">
              <PaymentMethodChart data={analytics.paymentMethods} />
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="gap-1 pb-2">
              <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                Vendas no periodo
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedRange.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 items-center pt-0">
              <SalesPerformanceChart data={analytics.performance} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function SalesPanel({
  analytics,
  appliedQuery,
  cardInstallmentRules,
  dateBounds,
  initialCursor,
  saleProducts,
  sales: initialSales,
  selectedRange,
  status,
}: {
  analytics: SalesAnalytics;
  appliedQuery: string;
  cardInstallmentRules: CardInstallmentRule[];
  dateBounds: {
    from: string;
    to: string;
  };
  initialCursor: string | null;
  saleProducts: SaleProductOption[];
  sales: SaleListItem[];
  selectedRange: SalesDateRange;
  status: SaleStatusFilter;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sales, setSales] = useState(initialSales);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, startLoadMore] = useTransition();
  const [pending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(appliedQuery);
  const emptyStateTitle = getSalesEmptyStateTitle({
    appliedQuery,
    status,
  });
  const summarySuffix = getSalesSummarySuffix(status);

  useEffect(() => {
    setSales(initialSales);
    setCursor(initialCursor);
  }, [initialCursor, initialSales]);

  useEffect(() => {
    setSearchTerm(appliedQuery);
  }, [appliedQuery]);

  const applyFilters = ({
    nextQuery = searchTerm,
    nextStatus = status,
  }: {
    nextQuery?: string;
    nextStatus?: SaleStatusFilter;
  }) => {
    const params = new URLSearchParams();
    const normalizedQuery = nextQuery.trim();

    if (normalizedQuery.length > 0) {
      params.set("q", normalizedQuery);
    }

    if (nextStatus !== "all") {
      params.set("status", nextStatus);
    }

    if (selectedRange.preset) {
      params.set("preset", selectedRange.preset);
    }

    if (selectedRange.from) {
      params.set("from", selectedRange.from);
    }

    if (selectedRange.to) {
      params.set("to", selectedRange.to);
    }

    const nextUrl = `${pathname}?${params.toString()}`;

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  };

  const handleLoadMore = () => {
    if (!cursor) {
      return;
    }

    startLoadMore(async () => {
      const result = await loadMoreSalesAction({
        cursor,
        query: appliedQuery,
        status,
      });

      setSales((current) => [...current, ...result.items]);
      setCursor(result.nextCursor);
    });
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-20 sm:p-6 sm:pb-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading font-semibold text-2xl tracking-tight">
              Vendas
            </h1>
            <p className="max-w-2xl text-muted-foreground text-sm">
              Registre vendas concluidas com baixa imediata de estoque e abra o
              detalhe para revisar composicao financeira, itens e cancelamento.
            </p>
          </div>

          <CreateSaleDialog
            cardInstallmentRules={cardInstallmentRules}
            products={saleProducts}
          />
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form
            className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters({});
            }}
          >
            <Input
              className="w-full sm:w-80"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por cliente ou ID da venda"
              value={searchTerm}
            />
            <Button
              disabled={pending}
              size="sm"
              type="submit"
              variant="outline"
            >
              Aplicar busca
            </Button>
          </form>

          <Select
            onValueChange={(value: SaleStatusFilter) =>
              applyFilters({ nextStatus: value })
            }
            value={status}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="completed">Concluidas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {appliedQuery ? (
          <p className="text-muted-foreground text-xs">
            Resultado para{" "}
            <span className="font-medium text-foreground">
              "{appliedQuery}"
            </span>
            {summarySuffix}
          </p>
        ) : null}
      </div>

      {sales.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-10 text-center">
          <p className="font-medium">{emptyStateTitle}</p>
          <p className="mt-2 text-muted-foreground text-sm">
            {appliedQuery
              ? "Ajuste a busca ou troque o status para ampliar a consulta."
              : "Ajuste os filtros ou registre uma nova venda para continuar."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {sales.map((sale) => (
              <article
                className="rounded-xl border border-border/60 bg-card p-4"
                key={sale.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      className="block truncate font-medium text-sm transition-colors hover:text-primary hover:underline"
                      href={`/vendas/${sale.id}`}
                      title={sale.customerName || "Sem cliente"}
                    >
                      {sale.customerName || "Sem cliente"}
                    </Link>
                    <p className="mt-1 text-muted-foreground text-xs">
                      #{sale.id.slice(0, 8)}
                    </p>
                  </div>
                  <Badge variant={getStatusVariant(sale.status)}>
                    {getStatusLabel(sale.status)}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/50 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                      Data
                    </p>
                    <p className="mt-1 font-medium text-sm">
                      {formatDate(sale.occurredOn)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                      Total
                    </p>
                    <p className="mt-1 font-medium text-sm">
                      {formatCurrency(sale.totalAmount)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {getPaymentMethodLabel(sale)}
                  </span>
                  <span className="font-medium">{sale.itemCount} item(ns)</span>
                </div>

                <Separator className="my-4" />

                <Button asChild size="xs" variant="outline">
                  <Link href={`/vendas/${sale.id}`}>Abrir detalhe</Link>
                </Button>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-border/50 md:block">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 sm:pl-6">Venda</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead>Total operacional</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right sm:pr-6">
                    Acoes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow className="border-border/40" key={sale.id}>
                    <TableCell className="max-w-[220px] pl-4 sm:pl-6">
                      <Link
                        className="block truncate font-medium text-sm transition-colors hover:text-primary hover:underline"
                        href={`/vendas/${sale.id}`}
                        title={sale.customerName || "Sem cliente"}
                      >
                        {sale.customerName || "Sem cliente"}
                      </Link>
                      <span className="block text-muted-foreground text-xs">
                        #{sale.id.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(sale.occurredOn)}</TableCell>
                    <TableCell>{getPaymentMethodLabel(sale)}</TableCell>
                    <TableCell className="text-center">
                      {sale.itemCount}
                    </TableCell>
                    <TableCell>{formatCurrency(sale.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(sale.status)}>
                        {getStatusLabel(sale.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right sm:pr-6">
                      <Button asChild size="xs" variant="outline">
                        <Link href={`/vendas/${sale.id}`}>Abrir</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {cursor ? (
            <div className="flex justify-center">
              <Button
                disabled={loadingMore}
                onClick={handleLoadMore}
                size="sm"
                type="button"
                variant="outline"
              >
                {loadingMore ? "Carregando..." : "Carregar mais vendas"}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Separator />

      <MobileAnalyticsSection
        analytics={analytics}
        dateBounds={dateBounds}
        selectedRange={selectedRange}
      />
    </div>
  );
}
