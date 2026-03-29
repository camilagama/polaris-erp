"use client";

import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { DatePickerField } from "@/components/date-picker-field";
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";

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
    { id: 1, productId: "", quantity: "1", unitSalePrice: "" },
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

  return (
    <form action={action} className="flex flex-col gap-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Dados da venda</CardTitle>
          <CardDescription>Comece pela data e pelos itens.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2" htmlFor="sale-date">
            <span>Data da venda</span>
            <DatePickerField id="sale-date" name="saleDate" />
          </label>
          <label className="flex flex-col gap-2" htmlFor="sale-channel">
            <span>Canal</span>
            <Input
              defaultValue="Loja física"
              id="sale-channel"
              name="channel"
              required
            />
          </label>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Itens</CardTitle>
              <CardDescription>
                Monte a venda antes dos pagamentos.
              </CardDescription>
            </div>
            <Button
              onClick={() =>
                setLines((currentLines) => [
                  ...currentLines,
                  {
                    id: (currentLines.at(-1)?.id ?? 0) + 1,
                    productId: "",
                    quantity: "1",
                    unitSalePrice: "",
                  },
                ])
              }
              type="button"
              variant="outline"
            >
              <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />
              Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {lines.map((line, index) => (
            <div className="grid gap-3 rounded-lg border p-3" key={line.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Item {index + 1}</span>
                {lines.length > 1 ? (
                  <Button
                    onClick={() =>
                      setLines((currentLines) =>
                        currentLines.filter(
                          (currentLine) => currentLine.id !== line.id
                        )
                      )
                    }
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <HugeiconsIcon
                      data-icon="inline-start"
                      icon={Delete02Icon}
                    />
                    Remover
                  </Button>
                ) : null}
              </div>
              <input
                name="itemProductId"
                type="hidden"
                value={line.productId}
              />
              <div className="grid gap-3 md:grid-cols-[1.3fr_0.5fr_0.7fr]">
                <div className="flex flex-col gap-2">
                  <span>Produto</span>
                  <Select
                    onValueChange={(value) => {
                      const selectedProduct = activeProducts.find(
                        (product) => String(product.id) === value
                      );

                      updateLine(line.id, {
                        productId: value,
                        unitSalePrice: selectedProduct?.salePrice ?? "",
                      });
                    }}
                    value={line.productId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {activeProducts.map((product) => (
                          <SelectItem
                            key={product.id}
                            value={String(product.id)}
                          >
                            {product.name} • estoque {product.currentStock}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <label
                  className="flex flex-col gap-2"
                  htmlFor={`item-quantity-${line.id}`}
                >
                  <span>Qtd.</span>
                  <Input
                    id={`item-quantity-${line.id}`}
                    min="1"
                    name="itemQuantity"
                    onChange={(event) =>
                      updateLine(line.id, { quantity: event.target.value })
                    }
                    required
                    step="1"
                    type="number"
                    value={line.quantity}
                  />
                </label>
                <label
                  className="flex flex-col gap-2"
                  htmlFor={`item-price-${line.id}`}
                >
                  <span>Preço</span>
                  <Input
                    id={`item-price-${line.id}`}
                    min="0"
                    name="itemPrice"
                    onChange={(event) =>
                      updateLine(line.id, { unitSalePrice: event.target.value })
                    }
                    required
                    step="0.01"
                    type="number"
                    value={line.unitSalePrice}
                  />
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>Desconto e frete, se houver.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2" htmlFor="discountAmount">
              <span>Desconto</span>
              <Input
                id="discountAmount"
                min="0"
                name="discountAmount"
                onChange={(event) => setDiscountAmount(event.target.value)}
                step="0.01"
                type="number"
                value={discountAmount}
              />
            </label>
            <label
              className="flex flex-col gap-2"
              htmlFor="shippingChargedAmount"
            >
              <span>Frete cobrado</span>
              <Input
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
            </label>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Totais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(estimatedSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Total do pedido</span>
              <span className="font-medium">
                {formatCurrency(estimatedOrderTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Pago na largada</span>
              <span>{formatCurrency(estimatedConfirmedPayments)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Fica em aberto</span>
              <span className="font-semibold">
                {formatCurrency(
                  Math.max(estimatedOrderTotal - estimatedConfirmedPayments, 0)
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card size="sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Pagamentos iniciais</CardTitle>
              <CardDescription>
                PIX, dinheiro, cartão ou pendência.
              </CardDescription>
            </div>
            <Button
              onClick={() =>
                setPayments((currentPayments) => [
                  ...currentPayments,
                  createPaymentLine((currentPayments.at(-1)?.id ?? 0) + 1),
                ])
              }
              type="button"
              variant="outline"
            >
              <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />
              Pagamento
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {payments.map((payment, index) => (
            <div className="grid gap-3 rounded-lg border p-3" key={payment.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Pagamento {index + 1}</span>
                {payments.length > 1 ? (
                  <Button
                    onClick={() =>
                      setPayments((currentPayments) =>
                        currentPayments.filter(
                          (currentPayment) => currentPayment.id !== payment.id
                        )
                      )
                    }
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <HugeiconsIcon
                      data-icon="inline-start"
                      icon={Delete02Icon}
                    />
                    Remover
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <label
                  className="flex flex-col gap-2"
                  htmlFor={`payment-gross-${payment.id}`}
                >
                  <span>Valor</span>
                  <Input
                    id={`payment-gross-${payment.id}`}
                    min="0"
                    name="paymentGrossAmount"
                    onChange={(event) =>
                      updatePayment(payment.id, {
                        grossAmount: event.target.value,
                      })
                    }
                    step="0.01"
                    type="number"
                    value={payment.grossAmount}
                  />
                </label>
                <label
                  className="flex flex-col gap-2"
                  htmlFor={`payment-fee-${payment.id}`}
                >
                  <span>Taxa</span>
                  <Input
                    id={`payment-fee-${payment.id}`}
                    min="0"
                    name="paymentFeeAmount"
                    onChange={(event) =>
                      updatePayment(payment.id, {
                        feeAmount: event.target.value,
                      })
                    }
                    step="0.01"
                    type="number"
                    value={payment.feeAmount}
                  />
                </label>
                <div className="flex flex-col gap-2">
                  <span>Método</span>
                  <input
                    name="paymentMethod"
                    type="hidden"
                    value={payment.method}
                  />
                  <Select
                    onValueChange={(value) =>
                      updatePayment(payment.id, { method: value })
                    }
                    value={payment.method}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="card_debit">
                          Cartão débito
                        </SelectItem>
                        <SelectItem value="card_credit">
                          Cartão crédito
                        </SelectItem>
                        <SelectItem value="payment_link">Link</SelectItem>
                        <SelectItem value="bank_transfer">
                          Transferência
                        </SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <span>Status</span>
                  <input
                    name="paymentStatus"
                    type="hidden"
                    value={payment.status}
                  />
                  <Select
                    onValueChange={(value) =>
                      updatePayment(payment.id, { status: value })
                    }
                    value={payment.status}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label
                  className="flex flex-col gap-2"
                  htmlFor={`payment-due-${payment.id}`}
                >
                  <span>Vencimento</span>
                  <DatePickerField
                    defaultValue={payment.dueDate}
                    id={`payment-due-${payment.id}`}
                    name="paymentDueDate"
                  />
                </label>
                <label
                  className="flex flex-col gap-2"
                  htmlFor={`payment-effective-${payment.id}`}
                >
                  <span>Data efetiva</span>
                  <DatePickerField
                    defaultValue={payment.effectiveDate}
                    id={`payment-effective-${payment.id}`}
                    name="paymentEffectiveDate"
                  />
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <label className="flex flex-col gap-2" htmlFor="sale-notes">
        <span>Observações</span>
        <Textarea id="sale-notes" name="notes" />
      </label>

      <DialogFooterAction />
    </form>
  );
}

function DialogFooterAction() {
  return (
    <div className="flex justify-end">
      <Button type="submit">Salvar venda</Button>
    </div>
  );
}
