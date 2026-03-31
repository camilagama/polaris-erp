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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
  unitPrice: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value || 0);

const createSaleRow = (): SaleRowDraft => ({
  id: crypto.randomUUID(),
  productId: "",
  quantity: "1",
  unitPrice: "0",
});

export function CreateSaleDialog({
  products,
}: {
  products: SaleProductOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [occurredOn, setOccurredOn] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleRowDraft[]>([createSaleRow()]);

  const totalAmount = useMemo(
    () =>
      items.reduce((acc, item) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);

        if (!(Number.isFinite(quantity) && Number.isFinite(unitPrice))) {
          return acc;
        }

        return acc + quantity * unitPrice;
      }, 0),
    [items]
  );

  const resetForm = () => {
    setOccurredOn(format(new Date(), "yyyy-MM-dd"));
    setCustomerName("");
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
        unitPrice: Number(item.unitPrice),
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

      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        toast.error("Preco de venda invalido.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const saleId = await createSaleAction({
          customerName: customerName.trim() || undefined,
          items: payloadItems,
          notes: notes.trim() || undefined,
          occurredOn,
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
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>Registrar venda</DialogTitle>
          <DialogDescription>
            Venda concluida na hora com baixa imediata de estoque.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sale-date">Data</Label>
              <Input
                id="sale-date"
                onChange={(event) => setOccurredOn(event.target.value)}
                type="date"
                value={occurredOn}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sale-customer">Cliente (opcional)</Label>
              <Input
                id="sale-customer"
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Nome do cliente"
                value={customerName}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-xs uppercase tracking-[0.14em]">
                Itens
              </p>
              <Button
                onClick={() =>
                  setItems((currentItems) => [...currentItems, createSaleRow()])
                }
                size="xs"
                type="button"
                variant="outline"
              >
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                Adicionar item
              </Button>
            </div>

            <div className="rounded-md border border-border/60">
              <div className="hidden grid-cols-[1.5fr_0.7fr_0.8fr_0.7fr_40px] gap-2 border-border/60 border-b px-3 py-2 text-[11px] text-muted-foreground uppercase tracking-[0.12em] sm:grid">
                <span>Produto</span>
                <span>Qtd.</span>
                <span>Preco</span>
                <span className="text-right">Subtotal</span>
                <span />
              </div>

              <div className="flex flex-col gap-2 p-2">
                {items.map((item) => {
                  const selectedProduct = products.find(
                    (product) => product.id === item.productId
                  );
                  const quantity = Number(item.quantity);
                  const unitPrice = Number(item.unitPrice);
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
                      className="grid gap-2 rounded-md border border-border/40 p-2 sm:grid-cols-[1.5fr_0.7fr_0.8fr_0.7fr_40px]"
                      key={item.id}
                    >
                      <div className="space-y-1">
                        <Label className="text-[11px] sm:hidden">Produto</Label>
                        <Select
                          onValueChange={(value) => {
                            const selected = products.find(
                              (product) => product.id === value
                            );

                            updateItem(item.id, (currentItem) => ({
                              ...currentItem,
                              productId: value,
                              unitPrice: selected
                                ? String(Number(selected.price))
                                : "0",
                            }));
                          }}
                          value={item.productId}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProducts.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.stock} un.)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedProduct ? (
                          <p className="text-[11px] text-muted-foreground">
                            Estoque disponivel: {selectedProduct.stock} un.
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] sm:hidden">Qtd.</Label>
                        <Input
                          min="1"
                          onChange={(event) =>
                            updateItem(item.id, (currentItem) => ({
                              ...currentItem,
                              quantity: event.target.value,
                            }))
                          }
                          step="1"
                          type="number"
                          value={item.quantity}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] sm:hidden">Preco</Label>
                        <Input
                          min="0"
                          onChange={(event) =>
                            updateItem(item.id, (currentItem) => ({
                              ...currentItem,
                              unitPrice: event.target.value,
                            }))
                          }
                          step="0.01"
                          type="number"
                          value={item.unitPrice}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] sm:hidden">
                          Subtotal
                        </Label>
                        <div className="flex h-7 items-center justify-end rounded-md border border-border/50 px-2 text-xs">
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>

                      <div className="flex items-start justify-end sm:items-center">
                        <Button
                          aria-label="Remover item"
                          onClick={() => removeItem(item.id)}
                          size="icon-xs"
                          type="button"
                          variant="ghost"
                        >
                          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sale-notes">Observacoes (opcional)</Label>
            <Textarea
              className="min-h-20"
              id="sale-notes"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </div>

          <div className="flex items-center justify-end gap-2 rounded-md border border-border/60 px-3 py-2">
            <span className="text-muted-foreground text-xs">Total</span>
            <strong className="font-semibold text-sm">
              {formatCurrency(totalAmount)}
            </strong>
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={pending || products.length === 0}
            onClick={handleSubmit}
            type="button"
          >
            {pending ? "Salvando..." : "Registrar venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
