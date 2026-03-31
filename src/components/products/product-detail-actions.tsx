"use client";

import {
  Archive01Icon,
  ArrowLeft01Icon,
  Delete02Icon,
  Edit01Icon,
  ListPlusIcon,
  Menu03Icon,
  MinusSignCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addProductStockAction,
  archiveProductAction,
  deleteProductAction,
  type ProductListItem,
  unarchiveProductAction,
  updateProductAction,
  writeOffProductStockAction,
} from "@/app/(app)/produtos/actions";
import { ProductDatePicker } from "@/components/products/product-date-picker";
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
import { Textarea } from "@/components/ui/textarea";

interface ProductCategoryOption {
  id: string;
  name: string;
}

export function ProductDetailActions({
  categories,
  linkedSalesCount,
  product,
}: {
  categories: ProductCategoryOption[];
  linkedSalesCount: number;
  product: ProductListItem;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [stocking, setStocking] = useState(false);
  const [writingOff, setWritingOff] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editName, setEditName] = useState(product.name);
  const [editCategoryId, setEditCategoryId] = useState(product.categoryId);
  const [editDescription, setEditDescription] = useState(
    product.description ?? ""
  );
  const [stockQuantity, setStockQuantity] = useState("1");
  const [stockedOn, setStockedOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [stockUnitCost, setStockUnitCost] = useState(product.costPrice ?? "0");
  const [writeOffQuantity, setWriteOffQuantity] = useState("1");
  const [writeOffDate, setWriteOffDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [writeOffReason, setWriteOffReason] = useState<
    "adjustment" | "operational"
  >("operational");
  const [writeOffNotes, setWriteOffNotes] = useState("");
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");

  const handleEditProduct = () => {
    startTransition(async () => {
      try {
        await updateProductAction(product.id, {
          categoryId: editCategoryId,
          description: editDescription || undefined,
          name: editName,
        });
        toast.success("Produto atualizado.");
        setEditing(false);
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
        } else {
          await archiveProductAction(product.id);
          toast.success("Produto arquivado.");
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

  const handleDeleteProduct = () => {
    startTransition(async () => {
      try {
        await deleteProductAction(product.id);
        toast.success("Produto removido definitivamente.");
        router.push("/produtos");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel deletar o produto."
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
            size="xs"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon icon={Menu03Icon} strokeWidth={2} />
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
          <DropdownMenuItem onSelect={() => setEditing(true)}>
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
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setDeleting(true);
              setDeleteConfirmationName("");
            }}
            variant="destructive"
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            Deletar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog onOpenChange={setEditing} open={editing}>
        <DialogContent className="sm:max-w-105">
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
            <DialogDescription>
              Edite apenas nome, categoria e observacoes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="detail-edit-name">Nome</Label>
              <Input
                id="detail-edit-name"
                onChange={(event) => setEditName(event.target.value)}
                value={editName}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="detail-edit-category">Categoria</Label>
              <Select onValueChange={setEditCategoryId} value={editCategoryId}>
                <SelectTrigger className="w-full" id="detail-edit-category">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="detail-edit-description">Observacoes</Label>
              <Textarea
                className="min-h-24"
                id="detail-edit-description"
                onChange={(event) => setEditDescription(event.target.value)}
                value={editDescription}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={pending || editName.trim().length === 0}
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
          <div className="space-y-4">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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
          <div className="space-y-4">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <Label htmlFor="detail-writeoff-date">Data da baixa</Label>
              <ProductDatePicker
                id="detail-writeoff-date"
                onChange={setWriteOffDate}
                value={writeOffDate}
              />
            </div>
            <div className="space-y-1.5">
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

      <Dialog
        onOpenChange={(open) => {
          setDeleting(open);

          if (!open) {
            setDeleteConfirmationName("");
          }
        }}
        open={deleting}
      >
        <DialogContent className="sm:max-w-115">
          <DialogHeader>
            <DialogTitle>Deletar produto</DialogTitle>
            <DialogDescription>
              Esta acao e irreversivel. O produto sera apagado definitivamente,
              junto com qualquer relacao registrada para ele, como entradas e
              baixas de estoque.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {linkedSalesCount > 0 ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-xs">
                Este produto esta vinculado a {linkedSalesCount} venda
                {linkedSalesCount > 1 ? "s" : ""}. Ao deletar, essas vendas e
                seus itens tambem serao removidos.
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Nenhuma venda vinculada encontrada para este produto.
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="detail-delete-confirmation">
                Digite exatamente o nome do produto para confirmar
              </Label>
              <Input
                id="detail-delete-confirmation"
                onChange={(event) =>
                  setDeleteConfirmationName(event.target.value)
                }
                placeholder={product.name}
                value={deleteConfirmationName}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setDeleting(false)}
              type="button"
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button
              disabled={
                pending || deleteConfirmationName.trim() !== product.name
              }
              onClick={handleDeleteProduct}
              type="button"
              variant="destructive"
            >
              {linkedSalesCount > 0
                ? "Deletar produto e vendas"
                : "Deletar definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
