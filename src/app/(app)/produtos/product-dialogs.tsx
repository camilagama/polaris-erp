"use client";

import {
  Add01Icon,
  DeliveryBox01Icon,
  Edit02Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
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
}

interface ProductDialogsProps {
  createProductAction: (formData: FormData) => void | Promise<void>;
  createProductMovementAction: (formData: FormData) => void | Promise<void>;
  createPurchaseAction: (formData: FormData) => void | Promise<void>;
  products: ProductOption[];
}

interface UpdatePriceDialogProps {
  action: (formData: FormData) => void | Promise<void>;
  productId: number;
  productName: string;
  salePrice: number;
}

const fieldClassName = "flex flex-col gap-2";

export function ProductDialogs({
  createProductAction,
  createProductMovementAction,
  createPurchaseAction,
  products,
}: ProductDialogsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <NewProductDialog action={createProductAction} />
      <NewPurchaseDialog action={createPurchaseAction} products={products} />
      <NewAdjustmentDialog
        action={createProductMovementAction}
        products={products}
      />
    </div>
  );
}

function NewProductDialog({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
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
            Só o necessário para começar a vender: identificação, preço e custo.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldClassName} htmlFor="product-name">
              <span>Nome</span>
              <Input id="product-name" name="name" required />
            </label>
            <label className={fieldClassName} htmlFor="product-category">
              <span>Categoria</span>
              <Input id="product-category" name="category" />
            </label>
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

function NewPurchaseDialog({
  action,
  products,
}: {
  action: (formData: FormData) => void | Promise<void>;
  products: ProductOption[];
}) {
  const [productId, setProductId] = useState<string>(
    products[0] ? String(products[0].id) : ""
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={products.length === 0} variant="outline">
          <HugeiconsIcon data-icon="inline-start" icon={DeliveryBox01Icon} />
          Registrar entrada
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar entrada</DialogTitle>
          <DialogDescription>
            Entrada simples de mercadoria. Sem frete, taxa ou estados extras.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input name="productId" type="hidden" value={productId} />
          <div className={fieldClassName}>
            <span>Produto</span>
            <Select onValueChange={setProductId} value={productId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldClassName} htmlFor="purchase-quantity">
              <span>Quantidade</span>
              <Input
                defaultValue="1"
                id="purchase-quantity"
                min="1"
                name="quantity"
                required
                step="1"
                type="number"
              />
            </label>
            <label
              className={fieldClassName}
              htmlFor="purchase-supplier-amount"
            >
              <span>Custo total</span>
              <Input
                defaultValue="0"
                id="purchase-supplier-amount"
                min="0"
                name="supplierAmount"
                required
                step="0.01"
                type="number"
              />
            </label>
          </div>
          <label className={fieldClassName} htmlFor="purchase-date">
            <span>Data da compra</span>
            <DatePickerField id="purchase-date" name="purchaseDate" />
          </label>
          <label className={fieldClassName} htmlFor="purchase-notes">
            <span>Observação</span>
            <Textarea id="purchase-notes" name="notes" />
          </label>
          <DialogFooter>
            <Button type="submit">Salvar entrada</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewAdjustmentDialog({
  action,
  products,
}: {
  action: (formData: FormData) => void | Promise<void>;
  products: ProductOption[];
}) {
  const [productId, setProductId] = useState<string>(
    products[0] ? String(products[0].id) : ""
  );
  const [type, setType] = useState("adjustment_plus");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={products.length === 0} variant="outline">
          <HugeiconsIcon data-icon="inline-start" icon={PencilEdit02Icon} />
          Ajuste manual
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar estoque</DialogTitle>
          <DialogDescription>
            Use apenas para correção rápida, perdas ou retiradas.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input name="productId" type="hidden" value={productId} />
          <input name="type" type="hidden" value={type} />
          <div className={fieldClassName}>
            <span>Produto</span>
            <Select onValueChange={setProductId} value={productId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name} • estoque {product.currentStock}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={fieldClassName}>
              <span>Tipo de ajuste</span>
              <Select onValueChange={setType} value={type}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="adjustment_plus">
                      Acréscimo (+)
                    </SelectItem>
                    <SelectItem value="adjustment_minus">
                      Retirada (-)
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <label className={fieldClassName} htmlFor="movement-quantity">
              <span>Quantidade</span>
              <Input
                defaultValue="1"
                id="movement-quantity"
                min="1"
                name="quantity"
                required
                step="1"
                type="number"
              />
            </label>
          </div>
          <label className={fieldClassName} htmlFor="movement-note">
            <span>Motivo / Observação</span>
            <Textarea
              id="movement-note"
              name="note"
              placeholder="Ex: Quebra, erro de contagem..."
            />
          </label>
          <DialogFooter>
            <Button type="submit">Salvar ajuste</Button>
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
