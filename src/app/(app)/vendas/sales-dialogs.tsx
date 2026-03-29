"use client";

import { DollarSquareIcon, WalletAdd01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { SalesForm } from "@/app/(app)/vendas/sales-form";
import { DatePickerField } from "@/components/date-picker-field";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ProductOption {
  currentStock: number;
  id: number;
  name: string;
  salePrice: string | null;
  status: "active" | "inactive";
}

interface NewSaleDialogProps {
  action: (formData: FormData) => void | Promise<void>;
  products: ProductOption[];
}

interface PaymentEventDialogProps {
  action: (formData: FormData) => void | Promise<void>;
  saleId: number;
}

export function NewSaleDialog({ action, products }: NewSaleDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <HugeiconsIcon data-icon="inline-start" icon={DollarSquareIcon} />
          Nova venda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Registrar venda</DialogTitle>
          <DialogDescription>
            Itens, total e pagamento inicial no mesmo fluxo.
          </DialogDescription>
        </DialogHeader>
        <SalesForm action={action} products={products} />
      </DialogContent>
    </Dialog>
  );
}

export function PaymentEventDialog({
  action,
  saleId,
}: PaymentEventDialogProps) {
  const [type, setType] = useState("payment");
  const [method, setMethod] = useState("pix");
  const [status, setStatus] = useState("confirmed");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <HugeiconsIcon data-icon="inline-start" icon={WalletAdd01Icon} />
          Evento financeiro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo evento financeiro</DialogTitle>
          <DialogDescription>
            Pagamento, refund ou chargeback.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input name="saleId" type="hidden" value={saleId} />
          <input name="type" type="hidden" value={type} />
          <input name="method" type="hidden" value={method} />
          <input name="status" type="hidden" value={status} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span>Tipo</span>
              <Select onValueChange={setType} value={type}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="payment">Pagamento</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="chargeback">Chargeback</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <span>Método</span>
              <Select onValueChange={setMethod} value={method}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="card_debit">Cartão débito</SelectItem>
                    <SelectItem value="card_credit">Cartão crédito</SelectItem>
                    <SelectItem value="payment_link">Link</SelectItem>
                    <SelectItem value="bank_transfer">Transferência</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <label
              className="flex flex-col gap-2"
              htmlFor={`gross-amount-${saleId}`}
            >
              <span>Valor bruto</span>
              <Input
                id={`gross-amount-${saleId}`}
                min="0.01"
                name="grossAmount"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label
              className="flex flex-col gap-2"
              htmlFor={`fee-amount-${saleId}`}
            >
              <span>Taxa</span>
              <Input
                defaultValue="0"
                id={`fee-amount-${saleId}`}
                min="0"
                name="feeAmount"
                step="0.01"
                type="number"
              />
            </label>
            <div className="flex flex-col gap-2">
              <span>Status</span>
              <Select onValueChange={setStatus} value={status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="canceled">Cancelado</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label
              className="flex flex-col gap-2"
              htmlFor={`due-date-${saleId}`}
            >
              <span>Vencimento</span>
              <DatePickerField id={`due-date-${saleId}`} name="dueDate" />
            </label>
            <label
              className="flex flex-col gap-2"
              htmlFor={`effective-date-${saleId}`}
            >
              <span>Data efetiva</span>
              <DatePickerField
                id={`effective-date-${saleId}`}
                name="effectiveDate"
              />
            </label>
          </div>
          <label
            className="flex flex-col gap-2"
            htmlFor={`payment-notes-${saleId}`}
          >
            <span>Observações</span>
            <Textarea id={`payment-notes-${saleId}`} name="notes" />
          </label>
          <DialogFooter>
            <Button type="submit">Salvar evento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
