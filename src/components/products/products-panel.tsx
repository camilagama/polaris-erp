"use client";

import {
  Archive01Icon,
  Edit01Icon,
  Menu03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  archiveProductAction,
  unarchiveProductAction,
  updateProductAction,
} from "@/app/(app)/produtos/actions";
import { ProductEditFields } from "@/components/products/product-edit-fields";
import { RegisterProductDialog } from "@/components/products/register-product-dialog";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductListItem } from "@/features/products/contracts";
import { formatCurrency } from "@/lib/formatters";

interface ProductCategoryOption {
  id: string;
  key: string;
  name: string;
}

const getProductStatus = (product: ProductListItem) =>
  product.archivedAt
    ? {
        label: "Arquivado",
        variant: "outline" as const,
      }
    : {
        label: "Ativo",
        variant: "secondary" as const,
      };

function ProductRowActions({
  onArchiveToggle,
  onEdit,
  product,
}: {
  onArchiveToggle: (product: ProductListItem) => void;
  onEdit: (product: ProductListItem) => void;
  product: ProductListItem;
}) {
  return (
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
          <Link href={`/produtos/${product.id}`}>Abrir detalhe</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onEdit(product)}>
          <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onArchiveToggle(product)}>
          <HugeiconsIcon icon={Archive01Icon} strokeWidth={2} />
          {product.archivedAt ? "Ativar" : "Arquivar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProductsPanel({
  categories,
  products,
  settings,
}: {
  categories: ProductCategoryOption[];
  products: ProductListItem[];
  settings: {
    idealMarkupPercent: number;
    minimumMarkupPercent: number;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilterId, setCategoryFilterId] = useState("all");
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    const matchesArchive = showArchived
      ? Boolean(product.archivedAt)
      : !product.archivedAt;

    if (!matchesArchive) {
      return false;
    }

    const matchesCategory =
      categoryFilterId === "all" || product.categoryId === categoryFilterId;

    if (!matchesCategory) {
      return false;
    }

    if (normalizedSearch.length === 0) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(normalizedSearch) ||
      product.categoryName.toLowerCase().includes(normalizedSearch)
    );
  });

  const openEditDialog = (product: ProductListItem) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategoryId(product.categoryId);
    setEditDescription(product.description ?? "");
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
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel atualizar o produto."
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
    <div className="flex flex-col gap-6 p-4 pb-20 sm:p-6 sm:pb-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading font-semibold text-2xl tracking-tight">
            Produtos
          </h1>
          <p className="max-w-2xl text-muted-foreground text-sm">
            Abra o detalhe para ver historico, custo medio e movimentacoes. A
            listagem concentra filtro rapido, status e acoes operacionais.
          </p>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nome ou categoria"
              value={searchTerm}
            />
            <Select
              onValueChange={setCategoryFilterId}
              value={categoryFilterId}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Filtrar categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <RegisterProductDialog
              categories={categories}
              settings={settings}
            />
          </div>
        </div>
      </div>

      {visibleProducts.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-10 text-center">
          <p className="font-medium">Nenhum produto encontrado.</p>
          <p className="mt-2 text-muted-foreground text-sm">
            Ajuste os filtros ou cadastre um novo item para continuar.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {visibleProducts.map((product) => {
              const status = getProductStatus(product);

              return (
                <article
                  className="rounded-xl border border-border/60 bg-card p-4"
                  key={product.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        className="block truncate font-medium text-sm hover:underline"
                        href={`/produtos/${product.id}`}
                        title={product.name}
                      >
                        {product.name}
                      </Link>
                      <p
                        className="mt-1 truncate text-muted-foreground text-xs"
                        title={product.categoryName}
                      >
                        {product.categoryName}
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border/50 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                        Preco
                      </p>
                      <p className="mt-1 font-medium text-sm">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                        Estoque
                      </p>
                      <p className="mt-1 font-medium text-sm">
                        {product.stock} un.
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex items-center justify-between gap-3">
                    <Button asChild size="xs" variant="outline">
                      <Link href={`/produtos/${product.id}`}>
                        Abrir detalhe
                      </Link>
                    </Button>
                    <ProductRowActions
                      onArchiveToggle={handleArchiveToggle}
                      onEdit={openEditDialog}
                      product={product}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden rounded-lg border border-border/60 bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 sm:pl-6">Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preco</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="pr-4 text-right sm:pr-6">
                    Acoes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleProducts.map((product) => {
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="max-w-[200px] pl-4 sm:pl-6">
                        <Link
                          className="block truncate font-medium hover:underline"
                          href={`/produtos/${product.id}`}
                          title={product.name}
                        >
                          {product.name}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <span
                          className="block truncate text-muted-foreground text-sm"
                          title={product.categoryName}
                        >
                          {product.categoryName}
                        </span>
                      </TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell className="text-center font-semibold tabular-nums">
                        {product.stock}
                      </TableCell>
                      <TableCell className="pr-4 sm:pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild size="xs" variant="outline">
                            <Link href={`/produtos/${product.id}`}>Abrir</Link>
                          </Button>
                          <ProductRowActions
                            onArchiveToggle={handleArchiveToggle}
                            onEdit={openEditDialog}
                            product={product}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setEditingProduct(null);
          }
        }}
        open={Boolean(editingProduct)}
      >
        <DialogContent className="sm:max-w-105">
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
            <DialogDescription>
              Atualize nome, categoria e observacoes operacionais.
            </DialogDescription>
          </DialogHeader>
          <ProductEditFields
            categories={categories}
            categoryId={editCategoryId}
            description={editDescription}
            name={editName}
            onCategoryIdChange={setEditCategoryId}
            onDescriptionChange={setEditDescription}
            onNameChange={setEditName}
          />
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
    </div>
  );
}
