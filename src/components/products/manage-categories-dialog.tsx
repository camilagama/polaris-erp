"use client";

import {
  Cancel01Icon,
  Delete02Icon,
  PencilEdit02Icon,
  PlusSignIcon,
  Settings02Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCategoryAction,
  deleteCategoryAction,
  getCategoriesAction,
  updateCategoryAction,
} from "./category-actions";

interface Category {
  description: string | null;
  id: string;
  name: string;
}

export function ManageCategoriesDialog() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editName, setEditName] = useState("");

  async function loadCategories() {
    try {
      setLoading(true);
      const data = await getCategoriesAction();
      setCategories(data as Category[]);
    } catch (_error) {
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      return;
    }
    try {
      await createCategoryAction({ name: newName });
      setNewName("");
      toast.success("Categoria criada!");
      loadCategories();
    } catch (_error) {
      toast.error("Erro ao criar categoria");
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) {
      return;
    }
    try {
      await updateCategoryAction(id, { name: editName });
      setEditingId(null);
      toast.success("Categoria atualizada!");
      loadCategories();
    } catch (_error) {
      toast.error("Erro ao atualizar categoria");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCategoryAction(id);
      toast.success("Categoria removida!");
      loadCategories();
    } catch (_error) {
      toast.error(
        "Erro ao remover (é possível que existam produtos vinculados)"
      );
    }
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="py-8 text-center text-muted-foreground text-xs">
          Carregando...
        </div>
      );
    }

    if (categories.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground text-xs">
          Nenhuma categoria cadastrada.
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        {categories.map((category) => (
          <div
            className="group flex items-center justify-between rounded-sm px-2 py-1.5 hover:bg-muted"
            key={category.id}
          >
            {editingId === category.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  autoFocus
                  className="h-6 flex-1 text-xs"
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleUpdate(category.id)
                  }
                  value={editName}
                />
                <button
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-green-600 outline-none transition-colors hover:bg-green-50 hover:text-green-700"
                  onClick={() => handleUpdate(category.id)}
                  type="button"
                >
                  <HugeiconsIcon className="h-4 w-4" icon={Tick01Icon} />
                </button>
                <button
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-destructive outline-none transition-colors hover:bg-destructive/10"
                  onClick={() => setEditingId(null)}
                  type="button"
                >
                  <HugeiconsIcon className="h-4 w-4" icon={Cancel01Icon} />
                </button>
              </div>
            ) : (
              <>
                <span className="cursor-default text-sm">{category.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-all hover:bg-muted-foreground/10 hover:text-foreground group-hover:opacity-100"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditName(category.name);
                    }}
                    type="button"
                  >
                    <HugeiconsIcon
                      className="h-4 w-4"
                      icon={PencilEdit02Icon}
                    />
                  </button>
                  <button
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive/70 outline-none transition-all hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(category.id)}
                    type="button"
                  >
                    <HugeiconsIcon className="h-4 w-4" icon={Delete02Icon} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog onOpenChange={(open) => open && loadCategories()}>
      <DialogTrigger asChild>
        <Button className="h-6 w-6 rounded-full" size="icon" variant="ghost">
          <HugeiconsIcon
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            icon={Settings02Icon}
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
          <DialogDescription>
            Crie, edite ou remova as categorias de seus produtos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="new-category">Nova Categoria</Label>
              <Input
                id="new-category"
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Ex: Smartphones"
                value={newName}
              />
            </div>
            <Button
              className="h-7 w-7 shrink-0"
              onClick={handleCreate}
              size="icon"
            >
              <HugeiconsIcon className="h-5 w-5" icon={PlusSignIcon} />
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto overflow-x-hidden rounded-md border bg-muted/20 p-1">
            {renderContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
