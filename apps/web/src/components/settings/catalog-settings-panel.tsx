"use client";

import {
  Cancel01Icon,
  Delete02Icon,
  PencilEdit02Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createCategoryAction,
  deleteCategoryAction,
  saveCatalogSettingsAction,
  updateCategoryAction,
} from "@/features/catalog/actions";
import {
  canDeleteCategory,
  canRenameCategory,
} from "@/features/catalog/guards";
import {
  buildDefaultCardInstallmentRules,
  type CardInstallmentRule,
  MAX_CARD_INSTALLMENTS,
} from "@/features/catalog/payment-rules";
import type {
  CatalogCategory,
  CatalogSettings,
} from "@/features/catalog/server";

interface CardInstallmentRuleDraft {
  feePercent: string;
  installments: number;
}

const syncCardInstallmentRuleDrafts = (
  currentRules: CardInstallmentRuleDraft[],
  maxInstallments: number
) => {
  const rulesByInstallments = new Map(
    currentRules.map((rule) => [rule.installments, rule.feePercent])
  );

  return buildDefaultCardInstallmentRules(maxInstallments).map((rule) => ({
    feePercent: rulesByInstallments.get(rule.installments) ?? "0",
    installments: rule.installments,
  }));
};

const toRuleDrafts = (
  rules: CardInstallmentRule[]
): CardInstallmentRuleDraft[] =>
  rules.map((rule) => ({
    feePercent: rule.feePercent.toString(),
    installments: rule.installments,
  }));

export function CatalogSettingsPanel({
  categories,
  settings,
}: {
  categories: CatalogCategory[];
  settings: CatalogSettings;
}) {
  const [pending, startTransition] = useTransition();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [categoryPendingDeletion, setCategoryPendingDeletion] =
    useState<CatalogCategory | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [minimumMarkupPercent, setMinimumMarkupPercent] = useState(
    settings.minimumMarkupPercent.toString()
  );
  const [idealMarkupPercent, setIdealMarkupPercent] = useState(
    settings.idealMarkupPercent.toString()
  );
  const [cardInstallmentRules, setCardInstallmentRules] = useState(() =>
    toRuleDrafts(settings.cardInstallmentRules)
  );
  const [cardInstallmentRuleDrafts, setCardInstallmentRuleDrafts] = useState(
    () => toRuleDrafts(settings.cardInstallmentRules)
  );

  useEffect(() => {
    setMinimumMarkupPercent(settings.minimumMarkupPercent.toString());
    setIdealMarkupPercent(settings.idealMarkupPercent.toString());
    const nextCardInstallmentRules = toRuleDrafts(
      settings.cardInstallmentRules
    );
    setCardInstallmentRules(nextCardInstallmentRules);
    setCardInstallmentRuleDrafts(nextCardInstallmentRules);
  }, [settings]);

  const selectedMaxInstallments = String(cardInstallmentRules.length);

  const handleOpenRatesDialog = () => {
    setCardInstallmentRuleDrafts(cardInstallmentRules);
    setRatesOpen(true);
  };

  const handleCancelRatesDialog = () => {
    setCardInstallmentRuleDrafts(cardInstallmentRules);
    setRatesOpen(false);
  };

  const handleApplyRatesDialog = () => {
    setCardInstallmentRules(cardInstallmentRuleDrafts);
    setRatesOpen(false);
  };

  const handleCreateCategory = () => {
    startTransition(async () => {
      try {
        await createCategoryAction({ name: newCategoryName });
        setNewCategoryName("");
        toast.success("Categoria criada.");
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
          cardInstallmentRules: cardInstallmentRules.map((rule) => ({
            feePercent: Number(rule.feePercent) || 0,
            installments: rule.installments,
          })),
          idealMarkupPercent: Number(idealMarkupPercent) || 0,
          minimumMarkupPercent: Number(minimumMarkupPercent) || 0,
        });
        toast.success("Configuracoes salvas.");
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
    <>
      <Card className="h-full">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Categorias</CardTitle>
              <CardDescription>
                Organize o catalogo fora do fluxo de cadastro. A categoria
                Outros e protegida e sempre permanece disponivel.
              </CardDescription>
            </div>
            <Button
              onClick={() => setCategoriesOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              Gerenciar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1">
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
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader>
          <CardTitle>Precificacao</CardTitle>
          <CardDescription>
            Defina os percentuais globais usados para sugerir preco minimo e
            ideal no cadastro de produtos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="minimum-markup-percent">Margem minima (%)</Label>
              <InputGroup>
                <InputGroupInput
                  id="minimum-markup-percent"
                  min="0"
                  onChange={(event) =>
                    setMinimumMarkupPercent(event.target.value)
                  }
                  step="0.01"
                  type="number"
                  value={minimumMarkupPercent}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>%</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ideal-markup-percent">Margem ideal (%)</Label>
              <InputGroup>
                <InputGroupInput
                  id="ideal-markup-percent"
                  min="0"
                  onChange={(event) =>
                    setIdealMarkupPercent(event.target.value)
                  }
                  step="0.01"
                  type="number"
                  value={idealMarkupPercent}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>%</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </div>
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

      <Card className="h-full">
        <CardHeader>
          <CardTitle>Cartao</CardTitle>
          <CardDescription>
            Configure a taxa da quantidade de parcelas. A taxa de cada parcela e
            aplicada sobre o valor total da transacao.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor="card-max-installments">Maximo de parcelas</Label>
              <Select
                onValueChange={(value) => {
                  setCardInstallmentRules((currentRules) =>
                    syncCardInstallmentRuleDrafts(currentRules, Number(value))
                  );
                }}
                value={selectedMaxInstallments}
              >
                <SelectTrigger className="w-full" id="card-max-installments">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: MAX_CARD_INSTALLMENTS },
                    (_value, index) => index + 1
                  ).map((installments) => (
                    <SelectItem key={installments} value={String(installments)}>
                      {installments}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleOpenRatesDialog}
              size="sm"
              type="button"
              variant="outline"
            >
              Editar taxas
            </Button>
          </div>

          <Button
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={handleSaveSettings}
            type="button"
          >
            Salvar cartao
          </Button>
        </CardContent>
      </Card>

      <Dialog onOpenChange={setCategoriesOpen} open={categoriesOpen}>
        <DialogContent
          className="max-h-[85vh] sm:max-w-4xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Tabela de categorias</DialogTitle>
            <DialogDescription>
              Visualize, edite e remova categorias sem poluir o painel
              principal.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const deleteAllowed = canDeleteCategory(
                    category,
                    category.productCount
                  );
                  const renameAllowed = canRenameCategory(category);
                  let deleteTitle = "Remover categoria";

                  if (!deleteAllowed) {
                    deleteTitle = category.isSystem
                      ? "Categoria protegida pelo sistema."
                      : "Remocao bloqueada enquanto houver produtos vinculados.";
                  }

                  return (
                    <TableRow key={category.id}>
                      <TableCell>
                        {editingId === category.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              autoFocus
                              className="h-7"
                              onChange={(event) =>
                                setEditingName(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  handleUpdateCategory(category.id);
                                }
                              }}
                              value={editingName}
                            />
                            <Button
                              disabled={
                                pending || editingName.trim().length === 0
                              }
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
                          <span className="font-medium">{category.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {category.isSystem ? "Sistema" : "Custom"}
                      </TableCell>
                      <TableCell>{category.productCount}</TableCell>
                      <TableCell className="text-right">
                        {editingId === category.id ? null : (
                          <div className="inline-flex items-center gap-1">
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
                              onClick={() =>
                                setCategoryPendingDeletion(category)
                              }
                              size="icon-sm"
                              title={deleteTitle}
                              type="button"
                              variant="ghost"
                            >
                              <HugeiconsIcon icon={Delete02Icon} />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setCategoryPendingDeletion(null);
          }
        }}
        open={Boolean(categoryPendingDeletion)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remover {categoryPendingDeletion?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao remove a categoria do catalogo. Categorias com produtos
              vinculados continuam bloqueadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (categoryPendingDeletion) {
                  handleDeleteCategory(categoryPendingDeletion.id);
                }
              }}
              type="button"
              variant="destructive"
            >
              Remover categoria
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        onOpenChange={(open) => {
          if (open) {
            handleOpenRatesDialog();
            return;
          }

          handleCancelRatesDialog();
        }}
        open={ratesOpen}
      >
        <DialogContent
          className="sm:max-w-3xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Taxas por parcela</DialogTitle>
            <DialogDescription>
              Defina as taxas em grade compacta por parcela.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-3">
            {cardInstallmentRuleDrafts.map((rule) => (
              <InputGroup key={rule.installments}>
                <InputGroupAddon align="inline-start">
                  <InputGroupText>{rule.installments}x</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  aria-label={`Taxa ${rule.installments}x (%)`}
                  id={`card-fee-${rule.installments}`}
                  min="0"
                  onChange={(event) => {
                    const nextValue = event.target.value;

                    setCardInstallmentRuleDrafts((currentRules) =>
                      currentRules.map((currentRule) =>
                        currentRule.installments === rule.installments
                          ? {
                              ...currentRule,
                              feePercent: nextValue,
                            }
                          : currentRule
                      )
                    );
                  }}
                  step="0.01"
                  type="number"
                  value={rule.feePercent}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>%</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            ))}
          </div>

          <DialogFooter>
            <Button
              onClick={handleCancelRatesDialog}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button onClick={handleApplyRatesDialog} type="button">
              Aplicar taxas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
