"use client";

import { useState } from "react";

const inputClassName =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const lineButtonClassName =
  "inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-medium text-sm transition hover:bg-muted";

interface ProductOption {
  currentStock: number;
  id: number;
  name: string;
  salePrice: string | null;
  status: "active" | "inactive";
}

interface SaleLine {
  id: number;
  productId: string;
  quantity: string;
  unitSalePrice: string;
}

interface SalesFormProps {
  action: (formData: FormData) => void | Promise<void>;
  products: ProductOption[];
}

export function SalesForm({ action, products }: SalesFormProps) {
  const [lines, setLines] = useState<SaleLine[]>([
    {
      id: 1,
      productId: "",
      quantity: "1",
      unitSalePrice: "",
    },
  ]);

  const activeProducts = products.filter(
    (product) => product.status === "active"
  );

  const updateLine = (lineId: number, nextLine: Partial<SaleLine>) => {
    setLines((currentLines) =>
      currentLines.map((line) =>
        line.id === lineId ? { ...line, ...nextLine } : line
      )
    );
  };

  const addLine = () => {
    setLines((currentLines) => [
      ...currentLines,
      {
        id: (currentLines.at(-1)?.id ?? 0) + 1,
        productId: "",
        quantity: "1",
        unitSalePrice: "",
      },
    ]);
  };

  const removeLine = (lineId: number) => {
    setLines((currentLines) =>
      currentLines.length === 1
        ? currentLines
        : currentLines.filter((line) => line.id !== lineId)
    );
  };

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="channel">
            Canal
          </label>
          <input
            className={inputClassName}
            defaultValue="WhatsApp"
            id="channel"
            name="channel"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="discountAmount">
            Desconto do pedido
          </label>
          <input
            className={inputClassName}
            defaultValue="0"
            id="discountAmount"
            min="0"
            name="discountAmount"
            step="0.01"
            type="number"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="font-medium text-sm" htmlFor="shippingChargedAmount">
          Frete cobrado
        </label>
        <input
          className={inputClassName}
          defaultValue="0"
          id="shippingChargedAmount"
          min="0"
          name="shippingChargedAmount"
          step="0.01"
          type="number"
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium text-sm">Itens</p>
          <button
            className={lineButtonClassName}
            onClick={addLine}
            type="button"
          >
            Adicionar item
          </button>
        </div>
        {lines.map((line, index) => (
          <div
            className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-3"
            key={line.id}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-sm">Item {index + 1}</p>
              {lines.length > 1 ? (
                <button
                  className="text-muted-foreground text-sm transition hover:text-foreground"
                  onClick={() => removeLine(line.id)}
                  type="button"
                >
                  Remover
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-[1.3fr_0.6fr_0.7fr]">
              <select
                className={inputClassName}
                name="itemProductId"
                onChange={(event) => {
                  const selectedProduct = activeProducts.find(
                    (product) => String(product.id) === event.target.value
                  );

                  updateLine(line.id, {
                    productId: event.target.value,
                    unitSalePrice: selectedProduct?.salePrice ?? "",
                  });
                }}
                required
                value={line.productId}
              >
                <option value="">Selecione um produto</option>
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · estoque {product.currentStock}
                  </option>
                ))}
              </select>
              <input
                className={inputClassName}
                min="1"
                name="itemQuantity"
                onChange={(event) =>
                  updateLine(line.id, { quantity: event.target.value })
                }
                placeholder="Qtd"
                required
                type="number"
                value={line.quantity}
              />
              <input
                className={inputClassName}
                min="0"
                name="itemPrice"
                onChange={(event) =>
                  updateLine(line.id, { unitSalePrice: event.target.value })
                }
                placeholder="Preco"
                required
                step="0.01"
                type="number"
                value={line.unitSalePrice}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <label className="font-medium text-sm" htmlFor="notes">
          Observacoes
        </label>
        <textarea
          className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          id="notes"
          name="notes"
        />
      </div>
      <button
        className="h-10 w-full rounded-xl bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/90 sm:w-auto"
        type="submit"
      >
        Confirmar venda
      </button>
    </form>
  );
}
