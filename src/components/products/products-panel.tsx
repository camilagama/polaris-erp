"use client";

import {
  Archive01Icon,
  Edit01Icon,
  Menu03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  archiveProductAction,
  removeProductImageAction,
  replaceProductImageAction,
  unarchiveProductAction,
  updateProductAction,
} from "@/app/(app)/produtos/actions";
import { loadMoreProductsAction } from "@/app/(app)/produtos/pagination";
import type { ProductStatusFilter } from "@/app/(app)/produtos/queries";
import { ProductEditFields } from "@/components/products/product-edit-fields";
import { ProductImageFrame } from "@/components/products/product-image-frame";
import { uploadProductImageToStaging } from "@/components/products/product-image-upload";
import { ProductCatalogPerformanceChart } from "@/components/products/product-sales-chart";
import { RegisterProductDialog } from "@/components/products/register-product-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ProductAnalytics,
  ProductListItem,
} from "@/features/products/contracts";
import { formatCurrency } from "@/lib/formatters";
import { InventoryCategoriesChart } from "../dashboard/inventory-categories-chart";

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

const getProductsEmptyStateTitle = ({
  appliedQuery,
  status,
}: {
  appliedQuery: string;
  status: ProductStatusFilter;
}) => {
  if (appliedQuery) {
    return "Nenhum produto corresponde aos filtros atuais.";
  }

  return status === "archived"
    ? "Nenhum produto arquivado encontrado."
    : "Nenhum produto ativo encontrado.";
};

const getProductsSummaryScope = (status: ProductStatusFilter) =>
  status === "archived" ? "produtos arquivados" : "produtos ativos";

function ProductTableThumbnail({ product }: { product: ProductListItem }) {
  return (
    <div className="size-11 shrink-0">
      <ProductImageFrame
        alt={`Miniatura de ${product.name}`}
        image={product.image}
        sizes="44px"
      />
    </div>
  );
}

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

function MobileAnalyticsSection({
  analytics,
}: {
  analytics: ProductAnalytics;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading font-semibold text-xl tracking-tight">
            Analytics
          </h2>
          <p className="text-muted-foreground text-sm">
            Leitura consolidada de estoque, categorias e desempenho recente.
          </p>
        </div>
        <Button
          className="md:hidden"
          onClick={() => setExpanded((current) => !current)}
          size="sm"
          type="button"
          variant="outline"
        >
          {expanded ? "Ocultar" : "Mostrar"}
        </Button>
      </div>

      <div className={expanded ? "grid gap-4" : "hidden md:grid md:gap-4"}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[0.85fr_0.95fr_1.8fr]">
          <div className="flex flex-col gap-4">
            <Card className="flex flex-1 flex-col justify-center">
              <CardHeader className="gap-1 pb-2">
                <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                  Total em estoque
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <strong className="font-heading text-[1.8rem] leading-none tracking-tight">
                  {analytics.totalUnitsInStock} un.
                </strong>
                <CardDescription className="mt-1 text-xs">
                  Soma das unidades dos produtos ativos.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="flex flex-1 flex-col justify-center">
              <CardHeader className="gap-1 pb-2">
                <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                  Compras acumuladas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <strong className="font-heading text-[1.8rem] leading-none tracking-tight">
                  {formatCurrency(analytics.totalInventoryInvestment)}
                </strong>
                <CardDescription className="mt-1 text-xs">
                  Soma historica de todas as compras registradas.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <Card className="flex flex-col">
            <CardHeader className="gap-1 pb-2">
              <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                Categorias no estoque
              </CardTitle>
              <CardDescription className="text-xs">
                Distribuicao do inventario atual
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 items-center pt-0">
              <InventoryCategoriesChart data={analytics.inventoryByCategory} />
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="gap-1 pb-2">
              <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                Faturamento x compras
              </CardTitle>
              <CardDescription className="text-xs">
                Ultimos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 items-center pt-0">
              <ProductCatalogPerformanceChart
                data={analytics.recentPerformance}
                emptyLabel="Sem movimentacao recente para exibir faturamento e compras."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ProductsPanel({
  analytics,
  appliedQuery,
  categories,
  initialCursor,
  products: initialProducts,
  settings,
  status,
}: {
  analytics: ProductAnalytics;
  appliedQuery: string;
  categories: ProductCategoryOption[];
  initialCursor: string | null;
  products: ProductListItem[];
  settings: {
    idealMarkupPercent: number;
    minimumMarkupPercent: number;
  };
  status: ProductStatusFilter;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [products, setProducts] = useState(initialProducts);
  const [cursor, setCursor] = useState(initialCursor);
  const cursorRef = useRef(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState(appliedQuery);
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImageMarkedForRemoval, setEditImageMarkedForRemoval] =
    useState(false);
  const emptyStateTitle = getProductsEmptyStateTitle({
    appliedQuery,
    status,
  });
  const summaryScope = getProductsSummaryScope(status);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state only on filter change, not on RSC revalidation
  useEffect(() => {
    setProducts(initialProducts);
    setCursor(initialCursor);
    cursorRef.current = initialCursor;
  }, [appliedQuery, status]);

  useEffect(() => {
    setSearchTerm(appliedQuery);
  }, [appliedQuery]);

  const applyFilters = ({
    nextQuery = searchTerm,
    nextStatus = status,
  }: {
    nextQuery?: string;
    nextStatus?: ProductStatusFilter;
  }) => {
    const params = new URLSearchParams();
    const normalizedQuery = nextQuery.trim();

    if (normalizedQuery.length > 0) {
      params.set("q", normalizedQuery);
    }

    if (nextStatus !== "active") {
      params.set("status", nextStatus);
    }

    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  };

  const handleLoadMore = useCallback(async () => {
    const currentCursor = cursorRef.current;
    if (!currentCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    try {
      const result = await loadMoreProductsAction({
        cursor: currentCursor,
        query: appliedQuery,
        status,
      });

      setProducts((current) => {
        const existingIds = new Set(current.map((p) => p.id));
        const uniqueNewItems = result.items.filter(
          (item) => !existingIds.has(item.id)
        );
        return [...current, ...uniqueNewItems];
      });
      setCursor(result.nextCursor);
      cursorRef.current = result.nextCursor;
    } finally {
      setLoadingMore(false);
    }
  }, [appliedQuery, loadingMore, status]);

  const openEditDialog = (product: ProductListItem) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategoryId(product.categoryId);
    setEditDescription(product.description ?? "");
    setEditPrice(product.price);
    setEditImageFile(null);
    setEditImageMarkedForRemoval(false);
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
          price: editPrice,
        });

        if (editImageFile) {
          const stagedImage = await uploadProductImageToStaging(editImageFile);
          await replaceProductImageAction(editingProduct.id, stagedImage);
        } else if (editImageMarkedForRemoval && editingProduct.image) {
          await removeProductImageAction(editingProduct.id);
        }

        toast.success("Produto atualizado.");
        setEditingProduct(null);
        setEditImageFile(null);
        setEditImageMarkedForRemoval(false);
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
    <div className="flex flex-col gap-6 px-6 pb-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading font-semibold text-2xl tracking-tight">
              Produtos
            </h1>
            <p className="max-w-2xl text-muted-foreground text-sm">
              Abra o detalhe para ver historico, custo medio e movimentacoes. A
              listagem agora consulta o catalogo inteiro com filtros reais no
              servidor.
            </p>
          </div>

          <RegisterProductDialog categories={categories} settings={settings} />
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form
            className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters({});
            }}
          >
            <Input
              className="w-full sm:w-80"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nome ou categoria"
              value={searchTerm}
            />
            <Button
              disabled={pending}
              size="sm"
              type="submit"
              variant="outline"
            >
              Aplicar busca
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => applyFilters({ nextStatus: "active" })}
              size="xs"
              type="button"
              variant={status === "active" ? "default" : "ghost"}
            >
              Ativos
            </Button>
            <Button
              onClick={() => applyFilters({ nextStatus: "archived" })}
              size="xs"
              type="button"
              variant={status === "archived" ? "default" : "ghost"}
            >
              Arquivados
            </Button>
          </div>
        </div>

        {appliedQuery ? (
          <p className="text-muted-foreground text-xs">
            Resultado para{" "}
            <span className="font-medium text-foreground">
              "{appliedQuery}"
            </span>{" "}
            em {summaryScope}.
          </p>
        ) : null}
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-10 text-center">
          <p className="font-medium">{emptyStateTitle}</p>
          <p className="mt-2 text-muted-foreground text-sm">
            {appliedQuery
              ? "Ajuste a busca ou troque o status para ampliar a consulta."
              : "Ajuste os filtros ou cadastre um novo item para continuar."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {products.map((product) => {
              const statusBadge = getProductStatus(product);

              return (
                <article
                  className="rounded-xl border border-border/60 bg-card p-4"
                  key={product.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <ProductTableThumbnail product={product} />
                      <div className="min-w-0">
                        <Link
                          className="block truncate font-medium text-sm transition-colors hover:text-primary hover:underline"
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
                    </div>
                    <Badge variant={statusBadge.variant}>
                      {statusBadge.label}
                    </Badge>
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

          <div className="hidden overflow-hidden rounded-lg border border-border/50 md:block">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 sm:pl-6">Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Preco</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="pr-4 text-right sm:pr-6">
                    Acoes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const statusBadge = getProductStatus(product);

                  return (
                    <TableRow className="border-border/40" key={product.id}>
                      <TableCell className="max-w-[240px] pl-4 sm:pl-6">
                        <div className="flex items-center gap-3">
                          <ProductTableThumbnail product={product} />
                          <Link
                            className="block truncate font-medium text-sm transition-colors hover:text-primary hover:underline"
                            href={`/produtos/${product.id}`}
                            title={product.name}
                          >
                            {product.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[170px]">
                        <span
                          className="block truncate text-muted-foreground text-sm"
                          title={product.categoryName}
                        >
                          {product.categoryName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
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

          {cursor ? (
            <Button
              className="w-full"
              disabled={loadingMore}
              onClick={handleLoadMore}
              type="button"
              variant="outline"
            >
              {loadingMore ? "Carregando..." : "Carregar mais produtos"}
            </Button>
          ) : null}
        </>
      )}

      <Separator />

      <MobileAnalyticsSection analytics={analytics} />

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setEditingProduct(null);
            setEditImageFile(null);
            setEditImageMarkedForRemoval(false);
            setEditPrice("");
          }
        }}
        open={Boolean(editingProduct)}
      >
        <DialogContent className="sm:max-w-105">
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
            <DialogDescription>
              Atualize dados principais e ajuste a imagem quando necessario.
            </DialogDescription>
          </DialogHeader>
          <ProductEditFields
            categories={categories}
            categoryId={editCategoryId}
            costPrice={editingProduct?.costPrice ?? "0"}
            description={editDescription}
            image={editingProduct?.image ?? null}
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
            productName={editName || editingProduct?.name || "produto"}
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
    </div>
  );
}
