"use client";

import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createSaleAction } from "@/app/(app)/vendas/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getPaymentRuleLabel,
  type PaymentFeeRule,
  sortPaymentFeeRules,
} from "@/features/catalog/payment-rules";

export interface SaleProductOption {
  id: string;
  name: string;
  price: string;
  stock: number;
}

interface SaleRowDraft {
  id: string;
  productId: string;
  quantity: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value || 0);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value || 0);

const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const createSaleRow = (): SaleRowDraft => ({
  id: crypto.randomUUID(),
  productId: "",
  quantity: "1",
});

export function CreateSaleDialog({
  paymentFeeRules,
  products,
}: {
  paymentFeeRules: PaymentFeeRule[];
  products: SaleProductOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [occurredOn, setOccurredOn] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [customerName, setCustomerName] = useState("");
  const normalizedPaymentFeeRules = useMemo(
    () => sortPaymentFeeRules(paymentFeeRules),
    [paymentFeeRules]
  );
  const [paymentOptionCode, setPaymentOptionCode] = useState<string>(
    normalizedPaymentFeeRules[0]?.code ?? "pix"
  );
  const [additionalAmount, setAdditionalAmount] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [freightAmount, setFreightAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleRowDraft[]>([createSaleRow()]);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const itemSubtotal = useMemo(
    () =>
      items.reduce((acc, item) => {
        const quantity = Number(item.quantity);
        const selectedProduct = productById.get(item.productId);
        const unitPrice = selectedProduct ? Number(selectedProduct.price) : 0;

        if (!(Number.isFinite(quantity) && Number.isFinite(unitPrice))) {
          return acc;
        }

        return acc + quantity * unitPrice;
      }, 0),
    [items, productById]
  );

  const parsedFreightAmount = Number(freightAmount);
  const parsedAdditionalAmount = Number(additionalAmount);
  const parsedDiscountAmount = Number(discountAmount);
  const selectedPaymentRule =
    normalizedPaymentFeeRules.find((rule) => rule.code === paymentOptionCode) ??
    normalizedPaymentFeeRules[0];
  const selectedFeePercent = selectedPaymentRule?.feePercent ?? 0;

  const baseAmount = useMemo(() => {
    if (
      !(
        Number.isFinite(parsedFreightAmount) &&
        Number.isFinite(parsedAdditionalAmount) &&
        Number.isFinite(parsedDiscountAmount)
      )
    ) {
      return itemSubtotal;
    }

    return roundCurrency(
      itemSubtotal +
        parsedFreightAmount +
        parsedAdditionalAmount -
        parsedDiscountAmount
    );
  }, [
    itemSubtotal,
    parsedAdditionalAmount,
    parsedDiscountAmount,
    parsedFreightAmount,
  ]);

  const calculatedFeeAmount = useMemo(() => {
    if (baseAmount <= 0) {
      return 0;
    }

    return roundCurrency(baseAmount * (selectedFeePercent / 100));
  }, [baseAmount, selectedFeePercent]);

  const totalAmount = useMemo(() => {
    return roundCurrency(baseAmount + calculatedFeeAmount);
  }, [baseAmount, calculatedFeeAmount]);

  const resetForm = () => {
    setOccurredOn(format(new Date(), "yyyy-MM-dd"));
    setCustomerName("");
    setPaymentOptionCode(normalizedPaymentFeeRules[0]?.code ?? "pix");
    setAdditionalAmount("0");
    setDiscountAmount("0");
    setFreightAmount("0");
    setNotes("");
    setItems([createSaleRow()]);
  };

  const updateItem = (
    rowId: string,
    updater: (item: SaleRowDraft) => SaleRowDraft
  ) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === rowId ? updater(item) : item))
    );
  };

  const removeItem = (rowId: string) => {
    setItems((currentItems) => {
      if (currentItems.length === 1) {
        return [createSaleRow()];
      }

      return currentItems.filter((item) => item.id !== rowId);
    });
  };

  const handleSubmit = () => {
    const payloadItems = items
      .filter((item) => item.productId.trim().length > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      }));

    if (payloadItems.length === 0) {
      toast.error("Adicione pelo menos um item na venda.");
      return;
    }

    for (const item of payloadItems) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        toast.error("Quantidade deve ser um numero inteiro maior que zero.");
        return;
      }
    }

    if (!(Number.isFinite(parsedFreightAmount) && parsedFreightAmount >= 0)) {
      toast.error("Frete deve ser um numero maior ou igual a zero.");
      return;
    }

    if (
      !(Number.isFinite(parsedAdditionalAmount) && parsedAdditionalAmount >= 0)
    ) {
      toast.error("Adicional deve ser um numero maior ou igual a zero.");
      return;
    }

    if (!(Number.isFinite(parsedDiscountAmount) && parsedDiscountAmount >= 0)) {
      toast.error("Desconto deve ser um numero maior ou igual a zero.");
      return;
    }

    if (baseAmount < 0) {
      toast.error(
        "Desconto nao pode ser maior que subtotal somado com frete e adicional."
      );
      return;
    }

    startTransition(async () => {
      try {
        const saleId = await createSaleAction({
          additionalAmount: parsedAdditionalAmount,
          customerName: customerName.trim() || undefined,
          discountAmount: parsedDiscountAmount,
          freightAmount: parsedFreightAmount,
          items: payloadItems,
          notes: notes.trim() || undefined,
          occurredOn,
          paymentOptionCode,
        });

        toast.success("Venda registrada.");
        setOpen(false);
        resetForm();
        router.push(`/vendas/${saleId}`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel registrar a venda."
        );
      }
    });
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          resetForm();
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button type="button">Nova venda</Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
        <div className="border-border/40 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Registrar nova venda</DialogTitle>
            <DialogDescription>
              Venda concluída na hora com baixa imediata de estoque.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
            {/* Left Column */}
            <div className="flex flex-col gap-6">
              {/* Seção 1: Informações Gerais */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground/80 text-sm">
                  Informações gerais
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      className="text-muted-foreground text-xs"
                      htmlFor="sale-date"
                    >
                      Data da venda
                    </Label>
                    <Input
                      id="sale-date"
                      onChange={(event) => setOccurredOn(event.target.value)}
                      type="date"
                      value={occurredOn}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      className="text-muted-foreground text-xs"
                      htmlFor="sale-payment-method"
                    >
                      Método de pagamento
                    </Label>
                    <Select
                      onValueChange={setPaymentOptionCode}
                      value={paymentOptionCode}
                    >
                      <SelectTrigger
                        className="w-full"
                        id="sale-payment-method"
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {normalizedPaymentFeeRules.map((rule) => (
                          <SelectItem key={rule.code} value={rule.code}>
                            {getPaymentRuleLabel(rule)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label
                      className="text-muted-foreground text-xs"
                      htmlFor="sale-customer"
                    >
                      Nome do cliente (opcional)
                    </Label>
                    <Input
                      id="sale-customer"
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="Ex: João Silva"
                      value={customerName}
                    />
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-border/40" />

              {/* Seção 2: Itens da Venda */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground/80 text-sm">
                    Produtos da venda
                  </h3>
                  <Button
                    className="h-7 text-xs"
                    onClick={() =>
                      setItems((current) => [...current, createSaleRow()])
                    }
                    size="xs"
                    type="button"
                    variant="secondary"
                  >
                    <HugeiconsIcon
                      className="mr-1.5 size-3.5"
                      icon={Add01Icon}
                      strokeWidth={2}
                    />
                    Adicionar produto
                  </Button>
                </div>

                <div className="rounded-md border border-border/60">
                  <div className="hidden grid-cols-[1fr_80px_100px_100px_40px] gap-3 border-border/60 border-b px-3 py-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wider sm:grid">
                    <span>Produto</span>
                    <span>Qtd.</span>
                    <span className="text-right">V. Unit.</span>
                    <span className="text-right">Total</span>
                    <span />
                  </div>

                  <div className="flex flex-col gap-1.5 p-1.5">
                    {items.map((item) => {
                      const selectedProduct = products.find(
                        (product) => product.id === item.productId
                      );
                      const quantity = Number(item.quantity);
                      const unitPrice = selectedProduct
                        ? Number(selectedProduct.price)
                        : 0;
                      const lineTotal =
                        Number.isFinite(quantity) && Number.isFinite(unitPrice)
                          ? quantity * unitPrice
                          : 0;

                      const selectedByOthers = new Set(
                        items
                          .filter((otherItem) => otherItem.id !== item.id)
                          .map((otherItem) => otherItem.productId)
                          .filter(Boolean)
                      );

                      const availableProducts = products.filter(
                        (product) =>
                          product.id === item.productId ||
                          !selectedByOthers.has(product.id)
                      );

                      return (
                        <div
                          className="grid items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_80px_100px_100px_40px]"
                          key={item.id}
                        >
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground sm:hidden">
                              Produto
                            </Label>
                            <Select
                              onValueChange={(value) => {
                                updateItem(item.id, (currentItem) => ({
                                  ...currentItem,
                                  productId: value,
                                }));
                              }}
                              value={item.productId}
                            >
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue placeholder="Selecione um produto" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableProducts.map((product) => (
                                  <SelectItem
                                    key={product.id}
                                    value={product.id}
                                  >
                                    {product.name} ({product.stock} un.)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground sm:hidden">
                              Qtd.
                            </Label>
                            <Input
                              className="h-7 bg-background"
                              max={selectedProduct?.stock}
                              min="1"
                              onChange={(event) => {
                                const val = event.target.value;
                                const numVal = Number.parseInt(val, 10);

                                if (
                                  selectedProduct &&
                                  !Number.isNaN(numVal) &&
                                  numVal > selectedProduct.stock
                                ) {
                                  toast.error(
                                    `Estoque insuficiente. Máximo disponível: ${selectedProduct.stock} unidades.`
                                  );
                                  updateItem(item.id, (currentItem) => ({
                                    ...currentItem,
                                    quantity: String(selectedProduct.stock),
                                  }));
                                } else {
                                  updateItem(item.id, (currentItem) => ({
                                    ...currentItem,
                                    quantity: val,
                                  }));
                                }
                              }}
                              step="1"
                              type="number"
                              value={item.quantity}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground sm:hidden">
                              V. Unit.
                            </Label>
                            <div className="flex h-7 items-center text-foreground/80 text-xs sm:justify-end">
                              {formatCurrency(unitPrice)}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground sm:hidden">
                              Total
                            </Label>
                            <div className="flex h-7 items-center font-medium text-xs sm:justify-end">
                              {formatCurrency(lineTotal)}
                            </div>
                          </div>

                          <div className="flex items-center justify-end sm:justify-center">
                            <Button
                              aria-label="Remover item"
                              className={`h-8 w-8 text-muted-foreground hover:text-destructive ${
                                items.length <= 1 ? "invisible" : ""
                              }`}
                              disabled={items.length <= 1}
                              onClick={() => removeItem(item.id)}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <HugeiconsIcon
                                className="size-4"
                                icon={Delete02Icon}
                                strokeWidth={2.5}
                              />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-border/40" />

              {/* Seção 3: Observações */}
              <div className="space-y-1.5">
                <Label
                  className="text-muted-foreground text-xs"
                  htmlFor="sale-notes"
                >
                  Observações internas (opcional)
                </Label>
                <Textarea
                  className="min-h-24 resize-none text-sm"
                  id="sale-notes"
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Instruções adicionais, informações de entrega..."
                  value={notes}
                />
              </div>
            </div>

            {/* Right Column: Resumo Financeiro */}
            <div>
              <div className="sticky top-0 flex flex-col gap-5 rounded-2xl border border-border/50 bg-muted/20 p-5">
                <h3 className="font-semibold text-foreground/90 text-sm">
                  Resumo financeiro
                </h3>

                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">
                    Subtotal dos itens
                  </span>
                  <span className="font-medium">
                    {formatCurrency(itemSubtotal)}
                  </span>
                </div>

                <div className="-mx-5 my-0.5 h-px bg-border/40" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <Label
                      className="font-normal text-muted-foreground text-xs"
                      htmlFor="sale-freight"
                    >
                      Frete (+)
                    </Label>
                    <InputGroup className="h-8 w-32">
                      <InputGroupAddon>
                        <InputGroupText className="text-xs">R$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        className="h-8 text-right text-sm placeholder:text-muted-foreground/50"
                        id="sale-freight"
                        min="0"
                        onChange={(event) =>
                          setFreightAmount(event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={freightAmount}
                      />
                    </InputGroup>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label
                      className="font-normal text-muted-foreground text-xs"
                      htmlFor="sale-additional"
                    >
                      Adicional (+)
                    </Label>
                    <InputGroup className="h-8 w-32">
                      <InputGroupAddon>
                        <InputGroupText className="text-xs">R$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        className="h-8 text-right text-sm placeholder:text-muted-foreground/50"
                        id="sale-additional"
                        min="0"
                        onChange={(event) =>
                          setAdditionalAmount(event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={additionalAmount}
                      />
                    </InputGroup>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label
                      className="font-normal text-muted-foreground text-xs"
                      htmlFor="sale-discount"
                    >
                      Desconto (-)
                    </Label>
                    <InputGroup className="h-8 w-32">
                      <InputGroupAddon>
                        <InputGroupText className="text-xs">R$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        className="h-8 text-right text-sm placeholder:text-muted-foreground/50"
                        id="sale-discount"
                        min="0"
                        onChange={(event) =>
                          setDiscountAmount(event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={discountAmount}
                      />
                    </InputGroup>
                  </div>
                </div>

                <div className="-mx-5 my-0.5 h-px bg-border/40" />

                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">
                    Taxa ({formatPercent(selectedFeePercent)}%)
                  </span>
                  <span className="font-medium text-destructive/80">
                    + {formatCurrency(calculatedFeeAmount)}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between rounded-md border border-border px-2 py-2">
                  <strong className="font-bold text-muted-foreground">
                    Total Final
                  </strong>
                  <strong className="text-xl tracking-tight">
                    {formatCurrency(totalAmount)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-border/40 border-t bg-muted/5 px-6 py-4">
          <Button onClick={() => setOpen(false)} type="button" variant="ghost">
            Cancelar
          </Button>
          <Button
            disabled={pending || products.length === 0}
            onClick={handleSubmit}
            type="button"
          >
            {pending ? "Registrando..." : "Confirmar Venda"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
