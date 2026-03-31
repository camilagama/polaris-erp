"use client";

import {
  Archive01Icon,
  ArrowDown01Icon,
  Delete02Icon,
  Edit01Icon,
  ListPlusIcon,
  Menu03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addProductStockAction,
  archiveProductAction,
  deleteProductAction,
  type ProductListItem,
  type ProductStockEntryItem,
  unarchiveProductAction,
  updateProductAction,
} from "@/app/(app)/produtos/actions";
import { ProductDatePicker } from "@/components/products/product-date-picker";
import { RegisterProductDialog } from "@/components/products/register-product-dialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface ProductCategoryOption {
  id: string;
  key: string;
  name: string;
}

const formatCurrency = (value: string | number | null) =>
  new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number(value) || 0);

export function ProductsPanel({
  categories,
  products,
  settings,
  stockEntries,
}: {
  categories: ProductCategoryOption[];
  products: ProductListItem[];
  settings: {
    idealMarkupPercent: number;
    minimumMarkupPercent: number;
  };
  stockEntries: ProductStockEntryItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showArchived, setShowArchived] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState<ProductListItem | null>(
    null
  );
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(
    null
  );
  const [stockProduct, setStockProduct] = useState<ProductListItem | null>(
    null
  );
  const [deleteProduct, setDeleteProduct] = useState<ProductListItem | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [stockQuantity, setStockQuantity] = useState("1");
  const [stockedOn, setStockedOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [stockUnitCost, setStockUnitCost] = useState("");

  const visibleProducts = useMemo(
    () =>
      products.filter((product) =>
        showArchived ? Boolean(product.archivedAt) : !product.archivedAt
      ),
    [products, showArchived]
  );

  const refreshView = () => {
    router.refresh();
  };

  const selectedStockEntries = useMemo(() => {
    if (!detailsProduct) {
      return [];
    }

    return stockEntries
      .filter((entry) => entry.productId === detailsProduct.id)
      .sort((left, right) => right.stockedOn.localeCompare(left.stockedOn));
  }, [detailsProduct, stockEntries]);

  const openEditDialog = (product: ProductListItem) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategoryId(product.categoryId);
    setEditDescription(product.description ?? "");
  };

  const openStockDialog = (product: ProductListItem) => {
    setStockProduct(product);
    setStockQuantity("1");
    setStockedOn(format(new Date(), "yyyy-MM-dd"));
    setStockUnitCost(product.costPrice ?? "0");
  };

  const handleEditProduct = () => {
    if (!editingProduct) {
      return;
    }

    startTransition(async () => {
      try {
        await updateProductAction(editingProduct.id, {
          categoryId: editCategoryId,
          description: editDescription || undefined,
          name: editName,
        });
        toast.success("Produto atualizado.");
        setEditingProduct(null);
        refreshView();
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
    if (!stockProduct) {
      return;
    }

    startTransition(async () => {
      try {
        await addProductStockAction(stockProduct.id, {
          quantity: Number(stockQuantity),
          stockedOn,
          unitCost: stockUnitCost,
        });
        toast.success("Estoque adicionado.");
        setStockProduct(null);
        refreshView();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel adicionar estoque."
        );
      }
    });
  };

  const handleArchiveToggle = (product: ProductListItem) => {
    startTransition(async () => {
      try {
        if (product.archivedAt) {
          await unarchiveProductAction(product.id);
          toast.success("Produto desarquivado.");
        } else {
          await archiveProductAction(product.id);
          toast.success("Produto arquivado.");
          if (detailsProduct?.id === product.id) {
            setDetailsProduct(null);
          }
        }
        refreshView();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel alterar o arquivo do produto."
        );
      }
    });
  };

  const handleDeleteProduct = () => {
    if (!deleteProduct) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteProductAction(deleteProduct.id);
        toast.success("Produto removido definitivamente.");
        setDeleteProduct(null);
        if (detailsProduct?.id === deleteProduct.id) {
          setDetailsProduct(null);
        }
        refreshView();
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
    <div className="flex flex-col gap-6 p-4 pb-20 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Produtos</h1>
          <p className="text-muted-foreground text-xs">
            Toque na linha para ver o resumo do produto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowArchived((current) => !current)}
            size="xs"
            type="button"
            variant="ghost"
          >
            {showArchived ? "Ver ativos" : "Ver arquivados"}
          </Button>
          <RegisterProductDialog categories={categories} settings={settings} />
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4 sm:pl-6">Nome</TableHead>
              <TableHead>Preco</TableHead>
              <TableHead className="text-center">Estoque</TableHead>
              <TableHead className="pr-4 text-right sm:pr-6">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProducts.length === 0 ? (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={4}>
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              visibleProducts.map((product) => (
                <TableRow
                  className="cursor-pointer"
                  key={product.id}
                  onClick={() => setDetailsProduct(product)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setDetailsProduct(product);
                    }
                  }}
                  tabIndex={0}
                >
                  <TableCell className="pl-4 font-medium sm:pl-6">
                    {product.name}
                  </TableCell>
                  <TableCell>{formatCurrency(product.price)}</TableCell>
                  <TableCell className="text-center font-semibold tabular-nums">
                    {product.stock}
                  </TableCell>
                  <TableCell
                    className="pr-4 text-right sm:pr-6"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label={`Acoes para ${product.name}`}
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                          size="xs"
                          type="button"
                          variant="ghost"
                        >
                          <HugeiconsIcon icon={Menu03Icon} strokeWidth={2} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-36">
                        <DropdownMenuItem
                          onClick={(event) => event.stopPropagation()}
                          onSelect={() => openEditDialog(product)}
                        >
                          <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(event) => event.stopPropagation()}
                          onSelect={() => openStockDialog(product)}
                        >
                          <HugeiconsIcon icon={ListPlusIcon} strokeWidth={2} />
                          Estoque
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(event) => event.stopPropagation()}
                          onSelect={() => handleArchiveToggle(product)}
                        >
                          <HugeiconsIcon icon={Archive01Icon} strokeWidth={2} />
                          {product.archivedAt ? "Ativar" : "Arquivar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(event) => event.stopPropagation()}
                          onSelect={() => setDeleteProduct(product)}
                          variant="destructive"
                        >
                          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDetailsProduct(null);
          }
        }}
        open={Boolean(detailsProduct)}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{detailsProduct?.name}</DialogTitle>
            <DialogDescription>
              Resumo do produto selecionado.
            </DialogDescription>
          </DialogHeader>
          {detailsProduct ? (
            <div className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 text-xs">
              <span className="text-muted-foreground">Categoria</span>
              <span>{detailsProduct.categoryName}</span>
              <span className="text-muted-foreground">Custo</span>
              <span>{formatCurrency(detailsProduct.costPrice)}</span>
              <span className="text-muted-foreground">Preco</span>
              <span>{formatCurrency(detailsProduct.price)}</span>
              <span className="text-muted-foreground">Compra</span>
              <span>
                {format(parseISO(detailsProduct.purchasedOn), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
              </span>
              <span className="text-muted-foreground">Estoque</span>
              <span>{detailsProduct.stock}</span>
              <span className="text-muted-foreground">Status</span>
              <span>{detailsProduct.archivedAt ? "Arquivado" : "Ativo"}</span>
              <span className="col-span-2 mt-2 border-border/50 border-t pt-2 text-muted-foreground">
                Observacoes
              </span>
              <p className="col-span-2 text-xs/relaxed">
                {detailsProduct.description?.trim() || "Sem observacoes."}
              </p>
              <Collapsible className="col-span-2 mt-2 rounded-md border border-border/50">
                <CollapsibleTrigger asChild>
                  <Button
                    className="w-full justify-between rounded-md px-3"
                    type="button"
                    variant="ghost"
                  >
                    Historico
                    <HugeiconsIcon
                      data-icon="inline-end"
                      icon={ArrowDown01Icon}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-border/50 border-t px-3 py-2">
                  <div className="flex flex-col gap-2">
                    {selectedStockEntries.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        Sem abastecimentos registrados.
                      </p>
                    ) : (
                      selectedStockEntries.map((entry) => (
                        <div
                          className="flex items-center justify-between gap-3 text-xs"
                          key={entry.id}
                        >
                          <div className="min-w-0">
                            <p className="font-medium">+{entry.quantity} un.</p>
                            <p className="text-muted-foreground">
                              {format(parseISO(entry.stockedOn), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          <p className="shrink-0 text-muted-foreground">
                            {formatCurrency(entry.unitCost)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setEditingProduct(null);
          }
        }}
        open={Boolean(editingProduct)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
            <DialogDescription>
              Edite apenas nome, categoria e observacoes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-product-name">Nome</Label>
              <Input
                id="edit-product-name"
                onChange={(event) => setEditName(event.target.value)}
                value={editName}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-product-category">Categoria</Label>
              <Select onValueChange={setEditCategoryId} value={editCategoryId}>
                <SelectTrigger className="w-full" id="edit-product-category">
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
              <Label htmlFor="edit-product-description">Observacoes</Label>
              <Textarea
                className="min-h-24"
                id="edit-product-description"
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

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setStockProduct(null);
          }
        }}
        open={Boolean(stockProduct)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Adicionar estoque</DialogTitle>
            <DialogDescription>
              Informe a quantidade e o custo unitario desta nova entrada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="stock-quantity">Quantidade</Label>
              <Input
                id="stock-quantity"
                min="1"
                onChange={(event) => setStockQuantity(event.target.value)}
                type="number"
                value={stockQuantity}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-unit-cost">Custo unitario</Label>
              <Input
                id="stock-unit-cost"
                min="0"
                onChange={(event) => setStockUnitCost(event.target.value)}
                step="0.01"
                type="number"
                value={stockUnitCost}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-date">Data do abastecimento</Label>
              <ProductDatePicker
                id="stock-date"
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
          if (!open) {
            setDeleteProduct(null);
          }
        }}
        open={Boolean(deleteProduct)}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Deletar produto</DialogTitle>
            <DialogDescription>
              Esta acao e irreversivel. O produto sera apagado definitivamente,
              junto com qualquer relacao registrada para ele, como entradas de
              estoque. E como se ele nunca tivesse existido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setDeleteProduct(null)}
              type="button"
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button
              disabled={pending}
              onClick={handleDeleteProduct}
              type="button"
              variant="destructive"
            >
              Deletar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
