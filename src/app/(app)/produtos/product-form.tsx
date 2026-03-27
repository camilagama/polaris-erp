"use client";

import { useState } from "react";
import { calculateSuggestedSalePrice } from "@/lib/domain/calculations";
import { formatCurrency } from "@/lib/format";

const inputClassName =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const textAreaClassName =
  "min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

interface ProductFormProps {
  action: (formData: FormData) => void | Promise<void>;
  estimatedFeePercent: number;
  minimumMarginPercent: number;
  targetMarginPercent: number;
}

export function ProductForm({
  action,
  estimatedFeePercent,
  minimumMarginPercent,
  targetMarginPercent,
}: ProductFormProps) {
  const [unitCost, setUnitCost] = useState("0");
  const [salePrice, setSalePrice] = useState("");
  const numericCost = Number(unitCost) || 0;
  const minimumSuggestedPrice = calculateSuggestedSalePrice({
    cost: numericCost,
    feePercent: estimatedFeePercent,
    marginPercent: minimumMarginPercent,
  });
  const targetSuggestedPrice = calculateSuggestedSalePrice({
    cost: numericCost,
    feePercent: estimatedFeePercent,
    marginPercent: targetMarginPercent,
  });

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="font-medium text-sm" htmlFor="name">
            Nome
          </label>
          <input className={inputClassName} id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="sku">
            SKU
          </label>
          <input className={inputClassName} id="sku" name="sku" />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="barcode">
            Codigo de barras
          </label>
          <input className={inputClassName} id="barcode" name="barcode" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="font-medium text-sm" htmlFor="category">
            Categoria
          </label>
          <input className={inputClassName} id="category" name="category" />
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 md:grid-cols-4">
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="unitCost">
            Custo unitario atual
          </label>
          <input
            className={inputClassName}
            defaultValue="0"
            id="unitCost"
            min="0"
            name="unitCost"
            onChange={(event) => setUnitCost(event.target.value)}
            required
            step="0.01"
            type="number"
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="salePrice">
            Preco de venda
          </label>
          <input
            className={inputClassName}
            id="salePrice"
            min="0"
            name="salePrice"
            onChange={(event) => setSalePrice(event.target.value)}
            required
            step="0.01"
            type="number"
            value={salePrice}
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="initialStock">
            Estoque inicial
          </label>
          <input
            className={inputClassName}
            defaultValue="0"
            id="initialStock"
            min="0"
            name="initialStock"
            step="1"
            type="number"
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="minimumStock">
            Estoque minimo
          </label>
          <input
            className={inputClassName}
            defaultValue="0"
            id="minimumStock"
            min="0"
            name="minimumStock"
            step="1"
            type="number"
          />
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 md:grid-cols-2">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
            Preco minimo
          </p>
          <p className="mt-1 font-semibold text-base">
            {formatCurrency(minimumSuggestedPrice)}
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Considera custo, {estimatedFeePercent}% de taxa e{" "}
            {minimumMarginPercent}% de margem minima.
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
            Preco alvo
          </p>
          <p className="mt-1 font-semibold text-base">
            {formatCurrency(targetSuggestedPrice)}
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Considera custo, {estimatedFeePercent}% de taxa e{" "}
            {targetMarginPercent}% de margem alvo.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:col-span-2">
          <button
            className="h-10 rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
            onClick={() => setSalePrice(minimumSuggestedPrice.toFixed(2))}
            type="button"
          >
            Usar preco minimo
          </button>
          <button
            className="h-10 rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted"
            onClick={() => setSalePrice(targetSuggestedPrice.toFixed(2))}
            type="button"
          >
            Usar preco alvo
          </button>
        </div>
      </div>

      <details className="rounded-2xl border border-border/60 bg-background/60 p-4">
        <summary className="cursor-pointer list-none font-medium text-sm">
          Detalhes opcionais
        </summary>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="description">
              Descricao curta
            </label>
            <input
              className={inputClassName}
              id="description"
              name="description"
            />
          </div>
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="notes">
              Observacoes
            </label>
            <textarea className={textAreaClassName} id="notes" name="notes" />
          </div>
        </div>
      </details>
      <button
        className="h-10 w-full rounded-xl bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/90 sm:w-auto"
        type="submit"
      >
        Salvar produto
      </button>
    </form>
  );
}
