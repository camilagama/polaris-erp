"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { SaleListItem } from "@/app/(app)/vendas/actions";
import {
  CreateSaleDialog,
  type SaleProductOption,
} from "@/components/sales/create-sale-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formatCurrency = (value: string | number | null) =>
  new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number(value) || 0);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));

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
  paymentMethod: SaleListItem["paymentMethod"]
) => {
  if (paymentMethod === "card") {
    return "Cartao";
  }

  return "Pix";
};

export function SalesPanel({
  saleProducts,
  sales,
}: {
  saleProducts: SaleProductOption[];
  sales: SaleListItem[];
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | SaleListItem["status"]
  >("all");

  const visibleSales = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return sales.filter((sale) => {
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
  }, [sales, searchTerm, statusFilter]);

  return (
    <div className="flex flex-col gap-6 p-4 pb-20 sm:p-6 sm:pb-6">
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Vendas</h1>
          <p className="text-muted-foreground text-xs">
            Registre vendas concluídas com baixa imediata de estoque.
          </p>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por cliente ou codigo da venda"
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

      <div className="rounded-lg border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4 sm:pl-6">Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead className="text-center">Itens</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleSales.length === 0 ? (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={6}>
                  Nenhuma venda encontrada.
                </TableCell>
              </TableRow>
            ) : (
              visibleSales.map((sale) => (
                <TableRow
                  className="cursor-pointer"
                  key={sale.id}
                  onClick={() => router.push(`/vendas/${sale.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/vendas/${sale.id}`);
                    }
                  }}
                  tabIndex={0}
                >
                  <TableCell className="pl-4 font-medium sm:pl-6">
                    {formatDate(sale.occurredOn)}
                  </TableCell>
                  <TableCell>{sale.customerName || "Sem cliente"}</TableCell>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
