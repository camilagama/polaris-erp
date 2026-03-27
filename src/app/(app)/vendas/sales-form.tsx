"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";

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

interface PaymentLine {
  dueDate: string;
  effectiveDate: string;
  feeAmount: string;
  grossAmount: string;
  id: number;
  method: string;
  status: string;
}

interface SalesFormProps {
  action: (formData: FormData) => void | Promise<void>;
  products: ProductOption[];
}

const createPaymentLine = (id: number): PaymentLine => ({
  dueDate: "",
  effectiveDate: "",
  feeAmount: "0",
  grossAmount: "",
  id,
  method: "pix",
  status: "confirmed",
});

export function SalesForm({ action, products }: SalesFormProps) {
  const [lines, setLines] = useState<SaleLine[]>([
    {
      id: 1,
      productId: "",
      quantity: "1",
      unitSalePrice: "",
    },
  ]);
  const [payments, setPayments] = useState<PaymentLine[]>([
    createPaymentLine(1),
  ]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [shippingChargedAmount, setShippingChargedAmount] = useState("0");

  const activeProducts = products.filter(
    (product) => product.status === "active"
  );
  const estimatedSubtotal = lines.reduce((total, line) => {
    const quantity = Number(line.quantity) || 0;
    const unitSalePrice = Number(line.unitSalePrice) || 0;
    return total + quantity * unitSalePrice;
  }, 0);
  const estimatedOrderTotal =
    estimatedSubtotal -
    (Number(discountAmount) || 0) +
    (Number(shippingChargedAmount) || 0);
  const estimatedConfirmedPayments = payments.reduce((total, payment) => {
    if (payment.status !== "confirmed") {
      return total;
    }

    return total + (Number(payment.grossAmount) || 0);
  }, 0);

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

  const updatePayment = (
    paymentId: number,
    nextPayment: Partial<PaymentLine>
  ) => {
    setPayments((currentPayments) =>
      currentPayments.map((payment) =>
        payment.id === paymentId ? { ...payment, ...nextPayment } : payment
      )
    );
  };

  const addPayment = () => {
    setPayments((currentPayments) => [
      ...currentPayments,
      createPaymentLine((currentPayments.at(-1)?.id ?? 0) + 1),
    ]);
  };

  const removePayment = (paymentId: number) => {
    setPayments((currentPayments) =>
      currentPayments.length === 1
        ? currentPayments
        : currentPayments.filter((payment) => payment.id !== paymentId)
    );
  };

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-sm">Itens da venda</p>
            <p className="text-muted-foreground text-xs">
              Monte o carrinho antes de ajustar desconto, frete ou pagamentos.
            </p>
          </div>
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
            <div className="grid gap-3 md:grid-cols-[1.4fr_0.6fr_0.8fr]">
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

      <div className="grid gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="channel">
                Canal
              </label>
              <input
                className={inputClassName}
                defaultValue="Loja fisica"
                id="channel"
                name="channel"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                className="font-medium text-sm"
                htmlFor="shippingChargedAmount"
              >
                Frete cobrado
              </label>
              <input
                className={inputClassName}
                id="shippingChargedAmount"
                min="0"
                name="shippingChargedAmount"
                onChange={(event) =>
                  setShippingChargedAmount(event.target.value)
                }
                step="0.01"
                type="number"
                value={shippingChargedAmount}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="discountAmount">
              Desconto do pedido
            </label>
            <input
              className={inputClassName}
              id="discountAmount"
              min="0"
              name="discountAmount"
              onChange={(event) => setDiscountAmount(event.target.value)}
              step="0.01"
              type="number"
              value={discountAmount}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
            Resumo rapido
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <p className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">
                {formatCurrency(estimatedSubtotal)}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Pedido</span>
              <span className="font-medium">
                {formatCurrency(estimatedOrderTotal)}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Pagto confirmado</span>
              <span className="font-medium">
                {formatCurrency(estimatedConfirmedPayments)}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">A receber</span>
              <span className="font-semibold">
                {formatCurrency(
                  Math.max(estimatedOrderTotal - estimatedConfirmedPayments, 0)
                )}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-sm">Pagamentos iniciais</p>
            <p className="text-muted-foreground text-xs">
              Use uma ou mais linhas para PIX, dinheiro, cartao ou pagamento
              pendente.
            </p>
          </div>
          <button
            className={lineButtonClassName}
            onClick={addPayment}
            type="button"
          >
            Adicionar pagamento
          </button>
        </div>

        {payments.map((payment, index) => (
          <div
            className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-3"
            key={payment.id}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-sm">Pagamento {index + 1}</p>
              {payments.length > 1 ? (
                <button
                  className="text-muted-foreground text-sm transition hover:text-foreground"
                  onClick={() => removePayment(payment.id)}
                  type="button"
                >
                  Remover
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <input
                className={inputClassName}
                min="0"
                name="paymentGrossAmount"
                onChange={(event) =>
                  updatePayment(payment.id, { grossAmount: event.target.value })
                }
                placeholder="Valor bruto"
                step="0.01"
                type="number"
                value={payment.grossAmount}
              />
              <input
                className={inputClassName}
                min="0"
                name="paymentFeeAmount"
                onChange={(event) =>
                  updatePayment(payment.id, { feeAmount: event.target.value })
                }
                placeholder="Taxa"
                step="0.01"
                type="number"
                value={payment.feeAmount}
              />
              <select
                className={inputClassName}
                name="paymentMethod"
                onChange={(event) =>
                  updatePayment(payment.id, { method: event.target.value })
                }
                value={payment.method}
              >
                <option value="pix">PIX</option>
                <option value="cash">Dinheiro</option>
                <option value="card_debit">Cartao debito</option>
                <option value="card_credit">Cartao credito</option>
                <option value="payment_link">Link</option>
                <option value="bank_transfer">Transferencia</option>
                <option value="other">Outro</option>
              </select>
              <select
                className={inputClassName}
                name="paymentStatus"
                onChange={(event) =>
                  updatePayment(payment.id, { status: event.target.value })
                }
                value={payment.status}
              >
                <option value="confirmed">Confirmado</option>
                <option value="pending">Pendente</option>
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="font-medium text-sm"
                  htmlFor={`paymentDue-${payment.id}`}
                >
                  Vencimento
                </label>
                <input
                  className={inputClassName}
                  id={`paymentDue-${payment.id}`}
                  name="paymentDueDate"
                  onChange={(event) =>
                    updatePayment(payment.id, { dueDate: event.target.value })
                  }
                  type="date"
                  value={payment.dueDate}
                />
              </div>
              <div className="space-y-2">
                <label
                  className="font-medium text-sm"
                  htmlFor={`paymentEffective-${payment.id}`}
                >
                  Data efetiva
                </label>
                <input
                  className={inputClassName}
                  id={`paymentEffective-${payment.id}`}
                  name="paymentEffectiveDate"
                  onChange={(event) =>
                    updatePayment(payment.id, {
                      effectiveDate: event.target.value,
                    })
                  }
                  type="date"
                  value={payment.effectiveDate}
                />
              </div>
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
