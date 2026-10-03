"use client";

import { Button } from "@polaris/ui/components/ui/button";
import { DateRangePicker } from "@polaris/ui/components/ui/date-range-picker";
import { Label } from "@polaris/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polaris/ui/components/ui/select";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  InventoryMovementFilterProduct,
  InventoryMovementFilters,
} from "@/features/products/contracts";

interface EstoqueFilterBarProps {
  filters: InventoryMovementFilters;
  products: InventoryMovementFilterProduct[];
}

export function EstoqueFilterBar({ filters, products }: EstoqueFilterBarProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [productId, setProductId] = useState(filters.productId ?? "");
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");
  const [type, setType] = useState(filters.type ?? "");

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (productId) {
      params.set("productId", productId);
    }
    if (from) {
      params.set("from", from);
    }
    if (to) {
      params.set("to", to);
    }
    if (type) {
      params.set("type", type);
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `/estoque?${query}` : "/estoque", {
        scroll: false,
      });
    });
  };

  const clearFilters = () => {
    setProductId("");
    setFrom("");
    setTo("");
    setType("");
    startTransition(() => {
      router.replace("/estoque", { scroll: false });
    });
  };

  return (
    <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
      <div className="flex flex-col gap-1">
        <Label htmlFor="estoque-product">Produto</Label>
        <Select onValueChange={setProductId} value={productId}>
          <SelectTrigger className="w-full" id="estoque-product">
            <SelectValue placeholder="Todos os produtos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os produtos</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1 sm:col-span-2">
        <Label>Periodo</Label>
        <DateRangePicker
          onChange={(val) => {
            setFrom(val.from);
            setTo(val.to);
          }}
          value={{ from, preset: null, to }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="estoque-type">Tipo</Label>
        <Select onValueChange={setType} value={type}>
          <SelectTrigger className="w-full" id="estoque-type">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os tipos</SelectItem>
            <SelectItem value="entry">Entradas</SelectItem>
            <SelectItem value="sale">Vendas</SelectItem>
            <SelectItem value="sale_reversal">Estornos</SelectItem>
            <SelectItem value="write_off">Baixas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end gap-2">
        <Button
          className="w-full md:w-auto"
          onClick={applyFilters}
          type="button"
        >
          Filtrar
        </Button>
        <Button
          className="w-full md:w-auto"
          onClick={clearFilters}
          type="button"
          variant="outline"
        >
          Limpar
        </Button>
      </div>
    </div>
  );
}
