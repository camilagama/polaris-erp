"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CreateSaleDialog,
  type SaleProductOption,
} from "@/components/sales/create-sale-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { SaleListItem } from "@/features/sales/contracts";
import { formatCurrency, formatDate } from "@/lib/formatters";

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

const getPaymentMethodLabel = (paymentMethod: SaleListItem["paymentMethod"]) =>
  paymentMethod === "card" ? "Cartao" : "Pix";

export function SalesPanel({
  saleProducts,
  sales,
}: {
  saleProducts: SaleProductOption[];
  sales: SaleListItem[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | SaleListItem["status"]
  >("all");

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleSales = sales.filter((sale) => {
    const matchesStatus =
      statusFilter === "all" || sale.status === statusFilter;

    if (!matchesStatus) {
      return false;
    }

    if (normalizedSearch.length === 0) {
      return true;
    }

    const customerName = sale.customerName?.toLowerCase() || "";

    return (
      customerName.includes(normalizedSearch) ||
      sale.id.includes(normalizedSearch)
    );
  });

  return (
    <div className="flex flex-col gap-6 p-4 pb-20 sm:p-6 sm:pb-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading font-semibold text-2xl tracking-tight">
            Vendas
          </h1>
          <p className="max-w-2xl text-muted-foreground text-sm">
            Registre vendas concluidas com baixa imediata de estoque e abra o
            detalhe para revisar composicao financeira, itens e cancelamento.
          </p>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por cliente"
              value={searchTerm}
            />
            <Select
              onValueChange={(value: "all" | SaleListItem["status"]) =>
                setStatusFilter(value)
              }
              value={statusFilter}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="completed">Concluida</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CreateSaleDialog products={saleProducts} />
        </div>
      </div>

      {visibleSales.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-10 text-center">
          <p className="font-medium">Nenhuma venda encontrada.</p>
          <p className="mt-2 text-muted-foreground text-sm">
            Ajuste os filtros ou registre uma nova venda para continuar.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {visibleSales.map((sale) => (
              <article
                className="rounded-xl border border-border/60 bg-card p-4"
                key={sale.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      className="block truncate font-medium text-sm hover:underline"
                      href={`/vendas/${sale.id}`}
                      title={sale.customerName || "Sem cliente"}
                    >
                      {sale.customerName || "Sem cliente"}
                    </Link>
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
                    {getPaymentMethodLabel(sale.paymentMethod)}
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

          <div className="hidden rounded-lg border border-border/60 bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 sm:pl-6">Venda</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right sm:pr-6">
                    Acoes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="max-w-[200px] pl-4 sm:pl-6">
                      <Link
                        className="block truncate font-medium hover:underline"
                        href={`/vendas/${sale.id}`}
                        title={sale.customerName || "Sem cliente"}
                      >
                        {sale.customerName || "Sem cliente"}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(sale.occurredOn)}</TableCell>
                    <TableCell>
                      {getPaymentMethodLabel(sale.paymentMethod)}
                    </TableCell>
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
        </>
      )}
    </div>
  );
}
