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
import { useEffect, useRef, useState, useTransition } from "react";
import { ProductDatePicker } from "@/components/products/product-date-picker";
import { ProductEditFields } from "@/components/products/product-edit-fields";
import { ProductImageInput } from "@/components/products/product-image-input";
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
  addProductImageAction,
  addProductStockAction,
  archiveProductAction,
  removeAdditionalProductImageAction,
  removeProductImageAction,
  replaceProductImageAction,
  softDeleteProductAction,
  unarchiveProductAction,
  updateProductAction,
  writeOffProductStockAction,
} from "@/features/products/actions";
import type {
  ProductImageAsset,
  ProductListItem,
} from "@/features/products/contracts";
import { formatDateInputValue } from "@/lib/domain/date";

interface ProductCategoryOption {
  id: string;
  name: string;
}

const getWriteOffQuantityError = ({
  quantity,
  stock,
}: {
  quantity: string;
  stock: number;
}): string | null => {
  const parsedQuantity = Number(quantity);

  if (quantity.trim().length === 0 || Number.isNaN(parsedQuantity)) {
    return "Informe uma quantidade valida.";
  }

  if (parsedQuantity <= 0) {
    return "A quantidade da baixa deve ser maior que zero.";
  }

  if (parsedQuantity > stock) {
    return "A baixa nao pode ser maior que o estoque atual.";
  }

  return null;
};

export function ProductDetailActions({
  categories,
  images = [],
  product,
  settings,
}: {
  categories: ProductCategoryOption[];
  images?: ProductImageAsset[];
  product: ProductListItem;
  settings: {
    idealMarkupPercent: number;
    minimumMarkupPercent: number;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const stockAdditionKeyRef = useRef<string | null>(null);
  const stockWriteOffKeyRef = useRef<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [stocking, setStocking] = useState(false);
  const [writingOff, setWritingOff] = useState(false);
  const [writeOffReviewing, setWriteOffReviewing] = useState(false);
  const [writeOffTouched, setWriteOffTouched] = useState(false);
  const [archiveConfirmationOpen, setArchiveConfirmationOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [softDeleteReason, setSoftDeleteReason] = useState("");
  const [editName, setEditName] = useState(product.name);
  const [editCategoryId, setEditCategoryId] = useState(product.categoryId);
  const [editDescription, setEditDescription] = useState(
    product.description ?? ""
  );
  const [editPrice, setEditPrice] = useState(product.price);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [additionalImageFile, setAdditionalImageFile] = useState<File | null>(
    null
  );
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

  const writeOffQuantityNumber = Number(writeOffQuantity);
  const writeOffQuantityError = getWriteOffQuantityError({
    quantity: writeOffQuantity,
    stock: product.stock,
  });
  const showWriteOffQuantityError =
    writeOffTouched && writeOffQuantityError !== null;

  useEffect(() => {
    setEditName(product.name);
    setEditCategoryId(product.categoryId);
    setEditDescription(product.description ?? "");
    setEditPrice(product.price);
    setEditImageFile(null);
    setAdditionalImageFile(null);
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

        if (additionalImageFile) {
          const stagedImage =
            await uploadProductImageToStaging(additionalImageFile);
          await addProductImageAction(product.id, stagedImage);
        }

        toast.success("Produto atualizado.");
        setEditing(false);
        setEditImageFile(null);
        setAdditionalImageFile(null);
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
        stockAdditionKeyRef.current ??= crypto.randomUUID();
        await addProductStockAction(
          product.id,
          {
            quantity: Number(stockQuantity),
            stockedOn,
            unitCost: stockUnitCost,
          },
          stockAdditionKeyRef.current
        );
        toast.success("Estoque adicionado.");
        setStocking(false);
        stockAdditionKeyRef.current = null;
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
    setWriteOffTouched(true);

    if (writeOffQuantityError) {
      return;
    }

    startTransition(async () => {
      try {
        stockWriteOffKeyRef.current ??= crypto.randomUUID();
        await writeOffProductStockAction(
          product.id,
          {
            happenedOn: writeOffDate,
            notes: writeOffNotes || undefined,
            quantity: writeOffQuantityNumber,
            reason: writeOffReason,
          },
          stockWriteOffKeyRef.current
        );
        toast.success("Baixa registrada.");
        setWritingOff(false);
        setWriteOffReviewing(false);
        stockWriteOffKeyRef.current = null;
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

  const handleArchiveProduct = () => {
    startTransition(async () => {
      try {
        await archiveProductAction(product.id);
        toast.success("Produto arquivado.");
        setArchiveConfirmationOpen(false);
        router.push("/produtos");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel alterar o status do produto."
        );
      }
    });
  };

  const handleUnarchiveProduct = () => {
    startTransition(async () => {
      try {
        await unarchiveProductAction(product.id);
        toast.success("Produto desarquivado.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel alterar o status do produto."
        );
      }
    });
  };

  const handleSoftDeleteProduct = () => {
    startTransition(async () => {
      try {
        await softDeleteProductAction(product.id, {
          confirmed: true,
          reason: softDeleteReason,
        });
        toast.success("Produto removido definitivamente.");
        setDeleteConfirmationOpen(false);
        router.push("/produtos");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel remover o produto definitivamente."
        );
      }
    });
  };

  const handleRemoveAdditionalImage = (version: number) => {
    startTransition(async () => {
      try {
        await removeAdditionalProductImageAction(product.id, version);
        toast.success("Imagem adicional removida.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel remover a imagem adicional."
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
          <DropdownMenuItem
            onSelect={() => {
              if (product.archivedAt) {
                handleUnarchiveProduct();
                return;
              }

              setArchiveConfirmationOpen(true);
            }}
          >
            <HugeiconsIcon icon={Archive01Icon} strokeWidth={2} />
            {product.archivedAt ? "Ativar" : "Arquivar"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setSoftDeleteReason("");
              setDeleteConfirmationOpen(true);
            }}
          >
            Remover definitivamente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        onOpenChange={(open) => {
          setEditing(open);

          if (!open) {
            setEditImageFile(null);
            setAdditionalImageFile(null);
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
          {product.image ? (
            <ProductImageInput
              description="Disponível no plano pago, até cinco imagens no total."
              disabled={pending}
              id="product-additional-image"
              label="Imagem adicional"
              onFileChange={setAdditionalImageFile}
            />
          ) : null}
          {images.length > 1 ? (
            <div className="flex flex-col gap-2">
              <p className="font-medium text-sm">Imagens adicionais</p>
              {images.slice(1).map((image) => (
                <div
                  className="flex items-center justify-between gap-3"
                  key={image.version}
                >
                  <span className="text-muted-foreground text-sm">
                    Imagem {image.version}
                  </span>
                  <Button
                    disabled={pending}
                    onClick={() => handleRemoveAdditionalImage(image.version)}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
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

      <Dialog
        onOpenChange={(open) => {
          setWritingOff(open);

          if (!open) {
            setWriteOffReviewing(false);
            setWriteOffTouched(false);
          }
        }}
        open={writingOff}
      >
        <DialogContent className="sm:max-w-105">
          <DialogHeader>
            <DialogTitle>
              {writeOffReviewing ? "Confirmar baixa" : "Baixa de estoque"}
            </DialogTitle>
            <DialogDescription>
              {writeOffReviewing
                ? "Revise a baixa antes de alterar o estoque do produto."
                : "Registre perda, avaria ou ajuste sem apagar o historico do produto."}
            </DialogDescription>
          </DialogHeader>
          {writeOffReviewing ? (
            <div className="flex flex-col gap-3 text-sm">
              <p>
                Voce esta prestes a dar baixa de{" "}
                <strong>{writeOffQuantityNumber} un.</strong> em {product.name}.
              </p>
              <p className="text-muted-foreground">
                Estoque atual: {product.stock} un. Estoque apos baixa:{" "}
                {product.stock - writeOffQuantityNumber} un.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="detail-writeoff-quantity">Quantidade</Label>
                <Input
                  aria-describedby={
                    showWriteOffQuantityError
                      ? "detail-writeoff-quantity-error"
                      : undefined
                  }
                  aria-invalid={showWriteOffQuantityError}
                  id="detail-writeoff-quantity"
                  max={product.stock}
                  min="1"
                  onBlur={() => setWriteOffTouched(true)}
                  onChange={(event) => {
                    setWriteOffTouched(true);
                    setWriteOffQuantity(event.target.value);
                  }}
                  step="1"
                  type="number"
                  value={writeOffQuantity}
                />
                {showWriteOffQuantityError ? (
                  <p
                    className="text-destructive text-xs"
                    id="detail-writeoff-quantity-error"
                    role="alert"
                  >
                    {writeOffQuantityError}
                  </p>
                ) : null}
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
          )}
          <DialogFooter>
            {writeOffReviewing ? (
              <>
                <Button
                  disabled={pending}
                  onClick={() => setWriteOffReviewing(false)}
                  type="button"
                  variant="outline"
                >
                  Voltar
                </Button>
                <Button
                  disabled={pending}
                  onClick={handleWriteOffStock}
                  type="button"
                  variant="destructive"
                >
                  Confirmar baixa
                </Button>
              </>
            ) : (
              <Button
                disabled={pending || writeOffQuantityError !== null}
                onClick={() => {
                  setWriteOffTouched(true);

                  if (!writeOffQuantityError) {
                    setWriteOffReviewing(true);
                  }
                }}
                type="button"
                variant="destructive"
              >
                Revisar baixa
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={setArchiveConfirmationOpen}
        open={archiveConfirmationOpen}
      >
        <DialogContent className="sm:max-w-105">
          <DialogHeader>
            <DialogTitle>Arquivar produto?</DialogTitle>
            <DialogDescription>
              O produto sairá da lista principal, mas o historico de vendas e
              estoque sera mantido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => setArchiveConfirmationOpen(false)}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              disabled={pending}
              onClick={handleArchiveProduct}
              type="button"
              variant="destructive"
            >
              Confirmar arquivamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={setDeleteConfirmationOpen}
        open={deleteConfirmationOpen}
      >
        <DialogContent className="sm:max-w-105">
          <DialogHeader>
            <DialogTitle>Remover produto definitivamente?</DialogTitle>
            <DialogDescription>
              Esta acao nao pode ser desfeita. O produto precisa estar com
              estoque zero. O historico operacional sera preservado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="soft-delete-reason">Motivo</Label>
            <Textarea
              disabled={pending}
              id="soft-delete-reason"
              maxLength={240}
              onChange={(event) => setSoftDeleteReason(event.target.value)}
              placeholder="Explique por que este produto sera removido"
              value={softDeleteReason}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => setDeleteConfirmationOpen(false)}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              disabled={pending || softDeleteReason.trim().length < 3}
              onClick={handleSoftDeleteProduct}
              type="button"
              variant="destructive"
            >
              Confirmar remocao definitiva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
