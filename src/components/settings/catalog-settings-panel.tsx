"use client";

import {
  Cancel01Icon,
  Delete02Icon,
  PencilEdit02Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createCategoryAction,
  deleteCategoryAction,
  saveCatalogSettingsAction,
  updateCategoryAction,
} from "@/app/(app)/configuracoes/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  canDeleteCategory,
  canRenameCategory,
} from "@/features/catalog/guards";
import type {
  CatalogCategory,
  CatalogSettings,
} from "@/features/catalog/server";

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);

export function CatalogSettingsPanel({
  categories,
  settings,
}: {
  categories: CatalogCategory[];
  settings: CatalogSettings;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [minimumMarkupPercent, setMinimumMarkupPercent] = useState(
    settings.minimumMarkupPercent.toString()
  );
  const [idealMarkupPercent, setIdealMarkupPercent] = useState(
    settings.idealMarkupPercent.toString()
  );

  const pricingHint = useMemo(() => {
    const minimum = Number(minimumMarkupPercent) || 0;
    const ideal = Number(idealMarkupPercent) || 0;

    if (minimum === 0 && ideal === 0) {
      return "Configure as margens para ativar as sugestoes de preco no cadastro de produtos.";
    }

    return `Margem minima ${formatPercent(minimum)}% e ideal ${formatPercent(
      ideal
    )}% aplicadas sobre o custo do produto.`;
  }, [idealMarkupPercent, minimumMarkupPercent]);

  const refreshView = () => {
    router.refresh();
  };

  const handleCreateCategory = () => {
    startTransition(async () => {
      try {
        await createCategoryAction({ name: newCategoryName });
        setNewCategoryName("");
        toast.success("Categoria criada.");
        refreshView();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel criar a categoria."
        );
      }
    });
  };

  const handleUpdateCategory = (id: string) => {
    startTransition(async () => {
      try {
        await updateCategoryAction(id, { name: editingName });
        setEditingId(null);
        setEditingName("");
        toast.success("Categoria atualizada.");
        refreshView();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel atualizar a categoria."
        );
      }
    });
  };

  const handleDeleteCategory = (id: string) => {
    startTransition(async () => {
      try {
        await deleteCategoryAction(id);
        toast.success("Categoria removida.");
        refreshView();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel remover a categoria."
        );
      }
    });
  };

  const handleSaveSettings = () => {
    startTransition(async () => {
      try {
        await saveCatalogSettingsAction({
          idealMarkupPercent: Number(idealMarkupPercent) || 0,
          minimumMarkupPercent: Number(minimumMarkupPercent) || 0,
        });
        toast.success("Configuracoes salvas.");
        refreshView();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar as configuracoes."
        );
      }
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
          <CardDescription>
            Organize o catalogo fora do fluxo de cadastro. A categoria Outros e
            protegida e sempre permanece disponivel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="new-category-name">Nova categoria</Label>
              <Input
                id="new-category-name"
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateCategory();
                  }
                }}
                placeholder="Ex: Smartphones"
                value={newCategoryName}
              />
            </div>
            <Button
              disabled={pending || newCategoryName.trim().length === 0}
              onClick={handleCreateCategory}
              type="button"
            >
              Adicionar
            </Button>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/10">
            {categories.map((category) => {
              const deleteAllowed = canDeleteCategory(
                category,
                category.productCount
              );
              const renameAllowed = canRenameCategory(category);
              const statusLabel = category.isSystem
                ? "fixa"
                : `${category.productCount} prod.`;
              let deleteTitle = "Remover categoria";

              if (!deleteAllowed) {
                deleteTitle = category.isSystem
                  ? "Categoria protegida pelo sistema."
                  : "Remocao bloqueada enquanto houver produtos vinculados.";
              }

              return (
                <div
                  className="flex min-h-10 items-center justify-between gap-3 border-border/50 border-b px-3 py-2 last:border-b-0"
                  key={category.id}
                >
                  {editingId === category.id ? (
                    <div className="flex w-full items-center gap-2">
                      <Input
                        autoFocus
                        className="h-6"
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleUpdateCategory(category.id);
                          }
                        }}
                        value={editingName}
                      />
                      <Button
                        disabled={pending || editingName.trim().length === 0}
                        onClick={() => handleUpdateCategory(category.id)}
                        size="icon-sm"
                        type="button"
                      >
                        <HugeiconsIcon icon={Tick01Icon} />
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingId(null);
                          setEditingName("");
                        }}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{category.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {statusLabel}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          disabled={!renameAllowed || pending}
                          onClick={() => {
                            setEditingId(category.id);
                            setEditingName(category.name);
                          }}
                          size="icon-sm"
                          title={
                            renameAllowed
                              ? "Editar categoria"
                              : "Categoria protegida pelo sistema."
                          }
                          type="button"
                          variant="ghost"
                        >
                          <HugeiconsIcon icon={PencilEdit02Icon} />
                        </Button>
                        <Button
                          disabled={!deleteAllowed || pending}
                          onClick={() => handleDeleteCategory(category.id)}
                          size="icon-sm"
                          title={deleteTitle}
                          type="button"
                          variant="ghost"
                        >
                          <HugeiconsIcon icon={Delete02Icon} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precificacao</CardTitle>
          <CardDescription>
            Defina os percentuais globais usados para sugerir preco minimo e
            ideal no cadastro de produtos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="minimum-markup-percent">Margem minima (%)</Label>
              <Input
                id="minimum-markup-percent"
                min="0"
                onChange={(event) =>
                  setMinimumMarkupPercent(event.target.value)
                }
                step="0.01"
                type="number"
                value={minimumMarkupPercent}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ideal-markup-percent">Margem ideal (%)</Label>
              <Input
                id="ideal-markup-percent"
                min="0"
                onChange={(event) => setIdealMarkupPercent(event.target.value)}
                step="0.01"
                type="number"
                value={idealMarkupPercent}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-muted-foreground text-xs">
            {pricingHint}
          </div>

          <Button
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={handleSaveSettings}
            type="button"
          >
            Salvar configuracoes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
