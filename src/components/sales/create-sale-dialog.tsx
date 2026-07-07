"use client";

import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ProductDatePicker } from "@/components/products/product-date-picker";
import { ProductCombobox } from "@/components/sales/product-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
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
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  type CardInstallmentRule,
  findCardInstallmentRule,
  getCardInstallmentRuleLabel,
} from "@/features/catalog/payment-rules";
import { createSaleAction } from "@/features/sales/actions";
import {
  calculateSaleFinancials,
  calculateSaleReceivedAmount,
  type SaleFinancials,
} from "@/features/sales/calculations";
import type {
  SalePaymentFeePayer,
  SaleProductOption,
} from "@/features/sales/contracts";
import { createSaleSchema } from "@/features/sales/schema";
import { roundCurrency } from "@/lib/domain/currency";
import { formatDateInputValue } from "@/lib/domain/date";
import {
  formatCurrency,
  formatCurrencyInput,
  formatPercent,
  parseCurrencyInput,
} from "@/lib/formatters";

interface SaleRowDraft {
  id: string;
  productId: string;
  quantity: string;
}

interface ResolvedPaymentState {
  paymentFeePayer: SalePaymentFeePayer;
  paymentInstallments: number;
}

interface SalePayloadItem {
  expectedUnitPrice: number;
  productId: string;
  quantity: number;
}

const createSaleRow = (): SaleRowDraft => ({
  id: crypto.randomUUID(),
  productId: "",
  quantity: "1",
});

const isCardFeePayer = (
  value: SalePaymentFeePayer | ""
): value is "customer" | "seller" => value === "customer" || value === "seller";

const resolvePaymentState = ({
  paymentFeePayer,
  paymentInstallments,
  paymentMethod,
}: {
  paymentFeePayer: SalePaymentFeePayer | "";
  paymentInstallments: string;
  paymentMethod: "card" | "pix";
}): ResolvedPaymentState => {
  if (paymentMethod === "pix") {
    return { paymentFeePayer: "not_applicable", paymentInstallments: 0 };
  }

  return {
    paymentFeePayer: isCardFeePayer(paymentFeePayer)
      ? paymentFeePayer
      : "not_applicable",
    paymentInstallments: Number(paymentInstallments),
  };
};

const calculateBaseAmount = ({
  additionalAmount,
  discountAmount,
  freightAmount,
  itemSubtotal,
}: {
  additionalAmount: number;
  discountAmount: number;
  freightAmount: number;
  itemSubtotal: number;
}) =>
  Number.isFinite(freightAmount) &&
  Number.isFinite(additionalAmount) &&
  Number.isFinite(discountAmount)
    ? roundCurrency(
        itemSubtotal + freightAmount + additionalAmount - discountAmount
      )
    : itemSubtotal;

const getPreviewFinancials = ({
  additionalAmount,
  cardInstallmentRules,
  discountAmount,
  freightAmount,
  itemSubtotal,
  paymentFeePayer,
  paymentInstallments,
  paymentMethod,
}: {
  additionalAmount: number;
  cardInstallmentRules: CardInstallmentRule[];
  discountAmount: number;
  freightAmount: number;
  itemSubtotal: number;
  paymentFeePayer: SalePaymentFeePayer | "";
  paymentInstallments: string;
  paymentMethod: "card" | "pix";
}): SaleFinancials | null => {
  const resolvedPaymentState = resolvePaymentState({
    paymentFeePayer,
    paymentInstallments,
    paymentMethod,
  });
  const selectedInstallmentRule =
    paymentMethod === "card"
      ? findCardInstallmentRule(
          cardInstallmentRules,
          resolvedPaymentState.paymentInstallments
        )
      : undefined;

  if (
    paymentMethod === "card" &&
    !(selectedInstallmentRule && isCardFeePayer(paymentFeePayer))
  ) {
    return null;
  }

  try {
    return calculateSaleFinancials({
      additionalAmount,
      discountAmount,
      freightAmount,
      installmentFeePercent: selectedInstallmentRule?.feePercent ?? 0,
      itemSubtotal,
      paymentFeePayer: resolvedPaymentState.paymentFeePayer,
      paymentInstallments: resolvedPaymentState.paymentInstallments,
      paymentMethod,
    });
  } catch {
    return null;
  }
};

const buildPayloadItems = ({
  items,
  productById,
}: {
  items: SaleRowDraft[];
  productById: Map<string, SaleProductOption>;
}):
  | { message: string; ok: false; shouldRefresh: boolean }
  | { items: SalePayloadItem[]; ok: true } => {
  const payloadItems: SalePayloadItem[] = [];

  for (const item of items) {
    if (item.productId.trim().length === 0) {
      continue;
    }

    const selectedProduct = productById.get(item.productId);

    if (!selectedProduct) {
      return {
        message: "Um dos produtos da venda nao esta mais disponivel.",
        ok: false,
        shouldRefresh: true,
      };
    }

    payloadItems.push({
      expectedUnitPrice: Number(selectedProduct.price),
      productId: item.productId,
      quantity: Number(item.quantity),
    });
  }

  if (payloadItems.length === 0) {
    return {
      message: "Adicione pelo menos um item na venda.",
      ok: false,
      shouldRefresh: false,
    };
  }

  return { items: payloadItems, ok: true };
};

const updateDraftItem = (
  currentItems: SaleRowDraft[],
  rowId: string,
  updater: (item: SaleRowDraft) => SaleRowDraft
) => currentItems.map((item) => (item.id === rowId ? updater(item) : item));

function SaleProductRow({
  item,
  items,
  products,
  removeItem,
  updateItem,
}: {
  item: SaleRowDraft;
  items: SaleRowDraft[];
  products: SaleProductOption[];
  removeItem: (rowId: string) => void;
  updateItem: (
    rowId: string,
    updater: (item: SaleRowDraft) => SaleRowDraft
  ) => void;
}) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const selectedProduct = productById.get(item.productId);
  const quantity = Number(item.quantity);
  const unitPrice = selectedProduct ? Number(selectedProduct.price) : 0;
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
      product.id === item.productId || !selectedByOthers.has(product.id)
  );

  return (
    <div className="grid items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_80px_100px_100px_40px]">
      <div className="flex flex-col gap-1">
        <Label className="text-[11px] text-muted-foreground sm:hidden">
          Produto
        </Label>
        <ProductCombobox
          label="Selecionar produto da venda"
          onSelect={(productId) => {
            updateItem(item.id, (currentItem) => ({
              ...currentItem,
              productId,
            }));
          }}
          options={availableProducts}
          value={item.productId}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-[11px] text-muted-foreground sm:hidden">
          Qtd.
        </Label>
        <Input
          className="h-7 bg-background"
          min="1"
          onChange={(event) => {
            const nextQuantityValue = event.target.value;
            updateItem(item.id, (currentItem) => ({
              ...currentItem,
              quantity: nextQuantityValue,
            }));
          }}
          step="1"
          type="number"
          value={item.quantity}
        />
        {selectedProduct &&
        Number.parseInt(item.quantity, 10) > selectedProduct.stock ? (
          <span className="mt-1 text-[10px] text-amber-500 leading-tight">
            Quantidade excede o estoque atual ({selectedProduct.stock}).
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-[11px] text-muted-foreground sm:hidden">
          V. Unit.
        </Label>
        <div className="flex h-7 items-center text-foreground/80 text-xs sm:justify-end">
          {formatCurrency(unitPrice)}
        </div>
      </div>

      <div className="flex flex-col gap-1">
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
}

export function CreateSaleDialog({
  cardInstallmentRules,
  products,
}: {
  cardInstallmentRules: CardInstallmentRule[];
  products: SaleProductOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [occurredOn, setOccurredOn] = useState(() => formatDateInputValue());
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix">("pix");
  const [paymentInstallments, setPaymentInstallments] = useState("0");
  const [paymentFeePayer, setPaymentFeePayer] = useState<
    SalePaymentFeePayer | ""
  >("not_applicable");
  const [additionalAmount, setAdditionalAmount] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [freightAmount, setFreightAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleRowDraft[]>([createSaleRow()]);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID()
  );

  const productById = new Map(products.map((product) => [product.id, product]));
  const itemSubtotal = items.reduce((acc, item) => {
    const quantity = Number(item.quantity);
    const selectedProduct = productById.get(item.productId);
    const unitPrice = selectedProduct ? Number(selectedProduct.price) : 0;

    if (!(Number.isFinite(quantity) && Number.isFinite(unitPrice))) {
      return acc;
    }

    return acc + quantity * unitPrice;
  }, 0);
  const parsedFreightAmount = Number(freightAmount);
  const parsedAdditionalAmount = Number(additionalAmount);
  const parsedDiscountAmount = Number(discountAmount);
  const selectedInstallmentRule =
    paymentMethod === "card"
      ? findCardInstallmentRule(
          cardInstallmentRules,
          Number(paymentInstallments)
        )
      : undefined;
  const financials = getPreviewFinancials({
    additionalAmount: parsedAdditionalAmount,
    cardInstallmentRules,
    discountAmount: parsedDiscountAmount,
    freightAmount: parsedFreightAmount,
    itemSubtotal,
    paymentFeePayer,
    paymentInstallments,
    paymentMethod,
  });
  const displayBaseAmount =
    financials?.baseAmount ??
    calculateBaseAmount({
      additionalAmount: parsedAdditionalAmount,
      discountAmount: parsedDiscountAmount,
      freightAmount: parsedFreightAmount,
      itemSubtotal,
    });
  const displayChargedAmount = financials?.chargedAmount ?? displayBaseAmount;
  const customerFeeAmount = financials?.customerFeeAmount ?? 0;
  const sellerFeeAmount = financials?.sellerFeeAmount ?? 0;
  const totalFeeAmount = roundCurrency(customerFeeAmount + sellerFeeAmount);
  const displayReceivedAmount = calculateSaleReceivedAmount({
    feeAmount: totalFeeAmount,
    freightAmount: parsedFreightAmount,
    saleAmount: displayChargedAmount,
  });

  const resetForm = () => {
    setOccurredOn(formatDateInputValue());
    setCustomerName("");
    setPaymentMethod("pix");
    setPaymentInstallments("0");
    setPaymentFeePayer("not_applicable");
    setAdditionalAmount("0");
    setDiscountAmount("0");
    setFreightAmount("0");
    setNotes("");
    setItems([createSaleRow()]);
    setIdempotencyKey(crypto.randomUUID());
  };

  const removeItem = (rowId: string) => {
    setItems((currentItems) => {
      if (currentItems.length === 1) {
        return [createSaleRow()];
      }

      return currentItems.filter((item) => item.id !== rowId);
    });
  };

  const updateItem = (
    rowId: string,
    updater: (item: SaleRowDraft) => SaleRowDraft
  ) => {
    setItems((currentItems) => updateDraftItem(currentItems, rowId, updater));
  };

  const handleSubmit = () => {
    const payloadItemsResult = buildPayloadItems({ items, productById });

    if (!payloadItemsResult.ok) {
      if (payloadItemsResult.shouldRefresh) {
        router.refresh();
      }

      toast.error(payloadItemsResult.message);
      return;
    }

    const resolvedPaymentState = resolvePaymentState({
      paymentFeePayer,
      paymentInstallments,
      paymentMethod,
    });
    const parsedPayload = createSaleSchema.safeParse({
      additionalAmount: parsedAdditionalAmount,
      customerName,
      discountAmount: parsedDiscountAmount,
      freightAmount: parsedFreightAmount,
      idempotencyKey,
      items: payloadItemsResult.items,
      notes,
      occurredOn,
      paymentFeePayer: resolvedPaymentState.paymentFeePayer,
      paymentInstallments: resolvedPaymentState.paymentInstallments,
      paymentMethod,
    });

    if (!parsedPayload.success) {
      toast.error(parsedPayload.error.issues[0]?.message ?? "Revise a venda.");
      return;
    }

    if (displayBaseAmount < 0) {
      toast.error(
        "Desconto nao pode ser maior que subtotal somado com frete e adicional."
      );
      return;
    }

    startTransition(async () => {
      try {
        const saleId = await createSaleAction(parsedPayload.data);
        toast.success("Venda registrada.");
        setOpen(false);
        resetForm();
        router.push(`/vendas/${saleId}`);
      } catch (error) {
        router.refresh();
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
      <DialogContent
        className="flex h-[100svh] max-h-[100svh] w-screen max-w-none flex-col overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-5xl sm:rounded-3xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="border-border/40 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Registrar nova venda</DialogTitle>
            <DialogDescription>
              Venda concluida na hora com baixa imediata de estoque.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <h3 className="font-medium text-foreground/80 text-sm">
                  Informacoes gerais
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="sale-date">Data da venda</FieldLabel>
                    <ProductDatePicker
                      id="sale-date"
                      onChange={setOccurredOn}
                      value={occurredOn}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="sale-payment-method">
                      Metodo de pagamento
                    </FieldLabel>
                    <Select
                      onValueChange={(value) => {
                        if (value === "pix") {
                          setPaymentMethod("pix");
                          setPaymentInstallments("0");
                          setPaymentFeePayer("not_applicable");
                          return;
                        }

                        const installments = value.split("-")[1] ?? "1";
                        setPaymentMethod("card");
                        setPaymentInstallments(installments);
                        setPaymentFeePayer((prev) =>
                          isCardFeePayer(prev) ? prev : "seller"
                        );
                      }}
                      value={
                        paymentMethod === "pix"
                          ? "pix"
                          : `card-${paymentInstallments}`
                      }
                    >
                      <SelectTrigger
                        aria-label="Metodo de pagamento da venda"
                        className="w-full"
                        id="sale-payment-method"
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">Pix</SelectItem>
                        {cardInstallmentRules.map((rule) => (
                          <SelectItem
                            key={rule.installments}
                            value={`card-${rule.installments}`}
                          >
                            {getCardInstallmentRuleLabel(rule.installments)} no
                            cartao
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {paymentMethod === "card" ? (
                    <div className="flex flex-col gap-4 sm:col-span-2">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor="sale-payment-fee-payer">
                            Quem paga a taxa
                          </FieldLabel>
                          <Select
                            onValueChange={(value: "customer" | "seller") =>
                              setPaymentFeePayer(value)
                            }
                            value={paymentFeePayer}
                          >
                            <SelectTrigger
                              aria-label="Responsavel pela taxa do cartao"
                              className="w-full"
                              id="sale-payment-fee-payer"
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="seller">Vendedor</SelectItem>
                              <SelectItem value="customer">Cliente</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <div className="flex items-end">
                          <div className="flex h-7 w-full items-center rounded-lg border border-border/60 bg-muted/15 px-3 text-muted-foreground text-xs">
                            Taxa configurada para{" "}
                            {selectedInstallmentRule
                              ? getCardInstallmentRuleLabel(
                                  selectedInstallmentRule.installments
                                )
                              : "o parcelamento selecionado"}
                            :{" "}
                            {formatPercent(
                              selectedInstallmentRule?.feePercent ?? 0
                            )}
                            %.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="sale-customer">
                      Nome do cliente (opcional)
                    </FieldLabel>
                    <Input
                      id="sale-customer"
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="Ex: Joao Silva"
                      value={customerName}
                    />
                  </Field>
                </div>
              </div>

              <div className="h-px w-full bg-border/40" />

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground/80 text-sm">
                    Produtos da venda
                  </h3>
                  <Button
                    className="h-7 text-xs"
                    onClick={() =>
                      setItems((currentItems) => [
                        ...currentItems,
                        createSaleRow(),
                      ])
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
                  <div className="hidden grid-cols-[minmax(0,1fr)_80px_100px_100px_40px] gap-3 border-border/60 border-b px-3 py-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wider sm:grid">
                    <span>Produto</span>
                    <span>Qtd.</span>
                    <span className="text-right">V. Unit.</span>
                    <span className="text-right">Total</span>
                    <span />
                  </div>

                  <div className="flex flex-col gap-1.5 p-1.5">
                    {items.map((item) => (
                      <SaleProductRow
                        item={item}
                        items={items}
                        key={item.id}
                        products={products}
                        removeItem={removeItem}
                        updateItem={updateItem}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-border/40" />

              <Field>
                <FieldLabel htmlFor="sale-notes">
                  Observacoes internas (opcional)
                </FieldLabel>
                <Textarea
                  className="min-h-24 resize-none text-sm"
                  id="sale-notes"
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Instrucoes adicionais, informacoes de entrega..."
                  value={notes}
                />
              </Field>
            </div>

            <div className="pb-4 lg:pb-0">
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

                <div className="flex flex-col gap-3">
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
                        inputMode="numeric"
                        onChange={(event) =>
                          setFreightAmount(
                            parseCurrencyInput(event.target.value).toString()
                          )
                        }
                        type="text"
                        value={formatCurrencyInput(Number(freightAmount))}
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
                        inputMode="numeric"
                        onChange={(event) =>
                          setAdditionalAmount(
                            parseCurrencyInput(event.target.value).toString()
                          )
                        }
                        type="text"
                        value={formatCurrencyInput(Number(additionalAmount))}
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
                        inputMode="numeric"
                        onChange={(event) =>
                          setDiscountAmount(
                            parseCurrencyInput(event.target.value).toString()
                          )
                        }
                        type="text"
                        value={formatCurrencyInput(Number(discountAmount))}
                      />
                    </InputGroup>
                  </div>
                </div>

                <div className="-mx-5 my-0.5 h-px bg-border/40" />

                {paymentMethod === "card" && customerFeeAmount > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">
                      Taxa do cartao (cliente)
                    </span>
                    <span className="font-medium">
                      {formatCurrency(customerFeeAmount)}
                    </span>
                  </div>
                ) : null}

                <div className="mt-1 flex items-center justify-between rounded-md border border-border px-2 py-2">
                  <strong className="font-bold text-muted-foreground">
                    Total final
                  </strong>
                  <strong className="text-xl tracking-tight">
                    {formatCurrency(displayChargedAmount)}
                  </strong>
                </div>

                {paymentMethod === "card" && sellerFeeAmount > 0 ? (
                  <div className="flex items-center justify-between text-red-400 text-sm">
                    <span className="font-medium">
                      Taxa do cartao (vendedor)
                    </span>
                    <span className="font-medium">
                      -{formatCurrency(sellerFeeAmount)}
                    </span>
                  </div>
                ) : null}

                {parsedFreightAmount > 0 ? (
                  <div className="flex items-center justify-between text-red-400 text-sm">
                    <span className="font-medium">Frete</span>
                    <span className="font-medium">
                      -{formatCurrency(parsedFreightAmount)}
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-chart-6 text-sm">
                  <span className="font-medium">Valor recebido</span>
                  <span className="font-medium">
                    {formatCurrency(displayReceivedAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-border/40 border-t bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
          <Button onClick={() => setOpen(false)} type="button" variant="ghost">
            Cancelar
          </Button>
          <Button
            disabled={pending || products.length === 0}
            onClick={handleSubmit}
            type="button"
          >
            {pending ? "Registrando..." : "Confirmar venda"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
