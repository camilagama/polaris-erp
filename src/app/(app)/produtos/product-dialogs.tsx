"use client";

import { Add01Icon, Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
import { Textarea } from "@/components/ui/textarea";

interface ProductDialogsProps {
  categories: string[];
  createProductAction: (formData: FormData) => void | Promise<void>;
}

interface UpdatePriceDialogProps {
  action: (formData: FormData) => void | Promise<void>;
  productId: number;
  productName: string;
  salePrice: number;
}

const fieldClassName = "flex flex-col gap-2";

export function ProductDialogs({
  categories,
  createProductAction,
}: ProductDialogsProps) {
  return (
    <NewProductDialog action={createProductAction} categories={categories} />
  );
}

function NewProductDialog({
  action,
  categories,
}: {
  action: (formData: FormData) => void | Promise<void>;
  categories: string[];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />
          Novo produto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar produto</DialogTitle>
          <DialogDescription>
            Identificação, categoria, preço e custo.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldClassName} htmlFor="product-name">
              <span>Nome</span>
              <Input id="product-name" name="name" required />
            </label>
            <div className={fieldClassName}>
              <span>Categoria</span>
              <Combobox
                allowCreate
                emptyMessage="Nenhuma categoria encontrada."
                name="category"
                options={categories.map((c) => ({ label: c, value: c }))}
                placeholder="Selecione ou digite..."
                searchPlaceholder="Procurar categoria..."
              />
            </div>
            <label className={fieldClassName} htmlFor="product-unit-cost">
              <span>Custo atual</span>
              <Input
                id="product-unit-cost"
                min="0.01"
                name="unitCost"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className={fieldClassName} htmlFor="product-sale-price">
              <span>Preço de venda</span>
              <Input
                id="product-sale-price"
                min="0.01"
                name="salePrice"
                required
                step="0.01"
                type="number"
              />
            </label>
          </div>
          <label className={fieldClassName} htmlFor="product-notes">
            <span>Informações adicionais</span>
            <Textarea
              id="product-notes"
              name="notes"
              placeholder="Ex: Tamanho, cor, fornecedor preferencial..."
            />
          </label>
          <DialogFooter>
            <Button type="submit">Salvar produto</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UpdatePriceDialog({
  action,
  productId,
  productName,
  salePrice,
}: UpdatePriceDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <HugeiconsIcon data-icon="inline-start" icon={Edit02Icon} />
          Preço
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar preço</DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input name="productId" type="hidden" value={productId} />
          <label className={fieldClassName} htmlFor={`sale-price-${productId}`}>
            <span>Preço de venda</span>
            <Input
              defaultValue={salePrice}
              id={`sale-price-${productId}`}
              min="0.01"
              name="salePrice"
              required
              step="0.01"
              type="number"
            />
          </label>
          <DialogFooter>
            <Button type="submit">Salvar preço</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
