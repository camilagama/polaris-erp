"use client";

import {
  Archive01Icon,
  ArrowLeft01Icon,
  Edit01Icon,
  ListPlusIcon,
  MinusSignCircleIcon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ProductDatePicker } from "@/components/products/product-date-picker";
import { ProductEditFields } from "@/components/products/product-edit-fields";
import { uploadProductImageToStaging } from "@/components/products/product-image-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
  addProductStockAction,
  archiveProductAction,
  removeProductImageAction,
  replaceProductImageAction,
  unarchiveProductAction,
  updateProductAction,
  writeOffProductStockAction,
} from "@/features/products/actions";
import type { ProductListItem } from "@/features/products/contracts";
import { formatDateInputValue } from "@/lib/domain/date";

interface ProductCategoryOption {
  id: string;
  name: string;
}

export function ProductDetailActions({
  categories,
  product,
  settings,
}: {
  categories: ProductCategoryOption[];
  product: ProductListItem;
  settings: {
    idealMarkupPercent: number;
    minimumMarkupPercent: number;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [stocking, setStocking] = useState(false);
  const [writingOff, setWritingOff] = useState(false);
  const [editName, setEditName] = useState(product.name);
  const [editCategoryId, setEditCategoryId] = useState(product.categoryId);
  const [editDescription, setEditDescription] = useState(
    product.description ?? ""
  );
  const [editPrice, setEditPrice] = useState(product.price);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImageMarkedForRemoval, setEditImageMarkedForRemoval] =
    useState(false);
  const [stockQuantity, setStockQuantity] = useState("1");
  const [stockedOn, setStockedOn] = useState(() => formatDateInputValue());
  const [stockUnitCost, setStockUnitCost] = useState(product.costPrice ?? "0");
  const [writeOffQuantity, setWriteOffQuantity] = useState("1");
  const [writeOffDate, setWriteOffDate] = useState(() =>
    formatDateInputValue()
  );
  const [writeOffReason, setWriteOffReason] = useState<
    "adjustment" | "operational"
  >("operational");
  const [writeOffNotes, setWriteOffNotes] = useState("");

  useEffect(() => {
    setEditName(product.name);
    setEditCategoryId(product.categoryId);
    setEditDescription(product.description ?? "");
    setEditPrice(product.price);
    setEditImageFile(null);
    setEditImageMarkedForRemoval(false);
    setStockUnitCost(product.costPrice ?? "0");
  }, [
    product.categoryId,
    product.costPrice,
    product.description,
    product.name,
    product.price,
  ]);

  const handleEditProduct = () => {
    startTransition(async () => {
      try {
        await updateProductAction(product.id, {
          categoryId: editCategoryId,
          description: editDescription || undefined,
          name: editName,
          price: editPrice,
        });

        if (editImageFile) {
          const stagedImage = await uploadProductImageToStaging(editImageFile);
          await replaceProductImageAction(product.id, stagedImage);
        } else if (editImageMarkedForRemoval && product.image) {
          await removeProductImageAction(product.id);
        }

        toast.success("Produto atualizado.");
        setEditing(false);
        setEditImageFile(null);
        setEditImageMarkedForRemoval(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel atualizar o produto."
        );
      }
    });
  };

  const handleAddStock = () => {
    startTransition(async () => {
      try {
        await addProductStockAction(product.id, {
          quantity: Number(stockQuantity),
          stockedOn,
          unitCost: stockUnitCost,
        });
        toast.success("Estoque adicionado.");
        setStocking(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel adicionar estoque."
        );
      }
    });
  };

  const handleWriteOffStock = () => {
    startTransition(async () => {
      try {
        await writeOffProductStockAction(product.id, {
          happenedOn: writeOffDate,
          notes: writeOffNotes || undefined,
          quantity: Number(writeOffQuantity),
          reason: writeOffReason,
        });
        toast.success("Baixa registrada.");
        setWritingOff(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel registrar a baixa."
        );
      }
    });
  };

  const handleArchiveToggle = () => {
    startTransition(async () => {
      try {
        if (product.archivedAt) {
          await unarchiveProductAction(product.id);
          toast.success("Produto desarquivado.");
          router.refresh();
        } else {
          await archiveProductAction(product.id);
          toast.success("Produto arquivado.");
          router.push("/produtos");
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel alterar o status do produto."
        );
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Acoes para ${product.name}`}
            className="gap-2 px-3"
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
            <span className="font-medium">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-36">
          <DropdownMenuItem asChild>
            <Link href="/produtos">
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              Voltar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setEditName(product.name);
              setEditCategoryId(product.categoryId);
              setEditDescription(product.description ?? "");
              setEditPrice(product.price);
              setEditing(true);
            }}
          >
            <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setStocking(true)}>
            <HugeiconsIcon icon={ListPlusIcon} strokeWidth={2} />
            Estoque
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setWritingOff(true)}>
            <HugeiconsIcon icon={MinusSignCircleIcon} strokeWidth={2} />
            Baixa
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleArchiveToggle}>
            <HugeiconsIcon icon={Archive01Icon} strokeWidth={2} />
            {product.archivedAt ? "Ativar" : "Arquivar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        onOpenChange={(open) => {
          setEditing(open);

          if (!open) {
            setEditImageFile(null);
            setEditImageMarkedForRemoval(false);
            setEditPrice(product.price);
          }
        }}
        open={editing}
      >
        <DialogContent className="sm:max-w-105">
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
            <DialogDescription>
              Edite dados principais e ajuste a imagem sem sair desta tela.
            </DialogDescription>
          </DialogHeader>
          <ProductEditFields
            categories={categories}
            categoryId={editCategoryId}
            costPrice={product.costPrice}
            description={editDescription}
            image={product.image}
            imageDisabled={pending}
            imageMarkedForRemoval={editImageMarkedForRemoval}
            name={editName}
            onCategoryIdChange={setEditCategoryId}
            onDescriptionChange={setEditDescription}
            onImageFileChange={setEditImageFile}
            onImageRemovalChange={setEditImageMarkedForRemoval}
            onNameChange={setEditName}
            onPriceChange={setEditPrice}
            price={editPrice}
            productName={editName || product.name}
            settings={settings}
          />
          <DialogFooter>
            <Button
              disabled={
                pending ||
                editName.trim().length === 0 ||
                editPrice.trim().length === 0 ||
                Number(editPrice) < 0 ||
                Number.isNaN(Number(editPrice))
              }
              onClick={handleEditProduct}
              type="button"
            >
              Salvar alteracoes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setStocking} open={stocking}>
        <DialogContent className="sm:max-w-105">
          <DialogHeader>
            <DialogTitle>Adicionar estoque</DialogTitle>
            <DialogDescription>
              Informe a quantidade e o custo unitario desta nova entrada.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detail-stock-quantity">Quantidade</Label>
              <Input
                id="detail-stock-quantity"
                min="1"
                onChange={(event) => setStockQuantity(event.target.value)}
                step="1"
                type="number"
                value={stockQuantity}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detail-stock-cost">Custo unitario</Label>
              <Input
                id="detail-stock-cost"
                min="0"
                onChange={(event) => setStockUnitCost(event.target.value)}
                step="0.01"
                type="number"
                value={stockUnitCost}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detail-stock-date">Data do abastecimento</Label>
              <ProductDatePicker
                id="detail-stock-date"
                onChange={setStockedOn}
                value={stockedOn}
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={pending} onClick={handleAddStock} type="button">
              Confirmar entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setWritingOff} open={writingOff}>
        <DialogContent className="sm:max-w-105">
          <DialogHeader>
            <DialogTitle>Baixa de estoque</DialogTitle>
            <DialogDescription>
              Registre perda, avaria ou ajuste sem apagar o historico do
              produto.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detail-writeoff-quantity">Quantidade</Label>
              <Input
                id="detail-writeoff-quantity"
                max={product.stock}
                min="1"
                onChange={(event) => setWriteOffQuantity(event.target.value)}
                step="1"
                type="number"
                value={writeOffQuantity}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detail-writeoff-reason">Motivo</Label>
              <Select
                onValueChange={(value) =>
                  setWriteOffReason(value as "adjustment" | "operational")
                }
                value={writeOffReason}
              >
                <SelectTrigger className="w-full" id="detail-writeoff-reason">
                  <SelectValue placeholder="Selecione um motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjustment">Ajuste</SelectItem>
                  <SelectItem value="operational">Operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detail-writeoff-date">Data da baixa</Label>
              <ProductDatePicker
                id="detail-writeoff-date"
                onChange={setWriteOffDate}
                value={writeOffDate}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detail-writeoff-notes">Observacoes</Label>
              <Textarea
                className="min-h-20"
                id="detail-writeoff-notes"
                onChange={(event) => setWriteOffNotes(event.target.value)}
                value={writeOffNotes}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Estoque atual: {product.stock} un.
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={pending || Number(writeOffQuantity) <= 0}
              onClick={handleWriteOffStock}
              type="button"
              variant="destructive"
            >
              Confirmar baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
