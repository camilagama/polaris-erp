"use client";

import {
  Cancel01Icon,
  Delete02Icon,
  PencilEdit02Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import {
  canDeleteCategory,
  canRenameCategory,
} from "@/features/catalog/guards";
import {
  getAvailableCardInstallments,
  getPaymentRuleLabel,
  type PaymentFeeRule,
  sortPaymentFeeRules,
} from "@/features/catalog/payment-rules";
import type {
  CatalogCategory,
  CatalogSettings,
} from "@/features/catalog/server";
import { formatPercent } from "@/lib/formatters";

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
  const [minimumMarkupPercent, setMinimumMarkupPercent] = useState(
    settings.minimumMarkupPercent.toString()
  );
  const [idealMarkupPercent, setIdealMarkupPercent] = useState(
    settings.idealMarkupPercent.toString()
  );
  const [paymentFeeRules, setPaymentFeeRules] = useState<PaymentFeeRule[]>(
    sortPaymentFeeRules(settings.paymentFeeRules)
  );

  const availableInstallments = useMemo(
    () => getAvailableCardInstallments(paymentFeeRules),
    [paymentFeeRules]
  );
  const [installmentsToAdd, setInstallmentsToAdd] = useState<string>(
    availableInstallments[0] ? String(availableInstallments[0]) : ""
  );

  const pricingHint = useMemo(() => {
    const pixRule = paymentFeeRules.find(
      (rule) => rule.paymentMethod === "pix"
    );
    const oneTimeRule = paymentFeeRules.find((rule) => rule.code === "1x");
    const minimum = Number(minimumMarkupPercent) || 0;
    const ideal = Number(idealMarkupPercent) || 0;

    if (minimum === 0 && ideal === 0) {
      return "Configure as margens para ativar as sugestoes de preco no cadastro de produtos.";
    }

    const pixFee = pixRule?.feePercent ?? 0;
    const oneTimeFee = oneTimeRule?.feePercent ?? 0;
    const extraConditions = paymentFeeRules.filter(
      (rule) => rule.paymentMethod === "card" && rule.installments >= 2
    ).length;

    return `Margem minima ${formatPercent(minimum)}% e ideal ${formatPercent(
      ideal
    )}% aplicadas sobre o custo do produto. Taxas de venda: Pix ${formatPercent(
      pixFee
    )}% e 1x ${formatPercent(oneTimeFee)}%${
      extraConditions > 0
        ? `, com ${extraConditions} condicao(oes) adicional(is)`
        : ""
    }.`;
  }, [idealMarkupPercent, minimumMarkupPercent, paymentFeeRules]);

  const handlePaymentFeeRuleChange = (code: string, rawValue: string) => {
    const parsedValue = Number(rawValue);

    setPaymentFeeRules((currentRules) =>
      currentRules.map((rule) => {
        if (rule.code !== code) {
          return rule;
        }

        return {
          ...rule,
          feePercent:
            Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0,
        };
      })
    );
  };

  const handleAddInstallmentRule = () => {
    const installments = Number(installmentsToAdd);

    if (
      !Number.isInteger(installments) ||
      installments < 2 ||
      installments > 12
    ) {
      toast.error("Selecione uma quantidade valida de parcelas.");
      return;
    }

    setPaymentFeeRules((currentRules) => {
      if (currentRules.some((rule) => rule.installments === installments)) {
        return currentRules;
      }

      return sortPaymentFeeRules([
        ...currentRules,
        {
          code: `${installments}x`,
          feePercent: 0,
          installments,
          paymentMethod: "card",
        },
      ]);
    });

    const nextAvailable = availableInstallments.find(
      (value) => value !== installments
    );
    setInstallmentsToAdd(nextAvailable ? String(nextAvailable) : "");
  };

  const handleRemoveInstallmentRule = (installments: number) => {
    if (installments < 2) {
      return;
    }

    setPaymentFeeRules((currentRules) =>
      sortPaymentFeeRules(
        currentRules.filter((rule) => rule.installments !== installments)
      )
    );

    const nextAvailable = [...availableInstallments, installments].sort(
      (left, right) => left - right
    )[0];
    setInstallmentsToAdd(nextAvailable ? String(nextAvailable) : "");
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
        const hasPix = paymentFeeRules.some(
          (rule) => rule.paymentMethod === "pix" && rule.installments === 0
        );
        const hasOneTime = paymentFeeRules.some(
          (rule) => rule.paymentMethod === "card" && rule.installments === 1
        );

        if (!(hasPix && hasOneTime)) {
          toast.error("Mantenha Pix e 1x configurados nas taxas de pagamento.");
          return;
        }

        await saveCatalogSettingsAction({
          idealMarkupPercent: Number(idealMarkupPercent) || 0,
          minimumMarkupPercent: Number(minimumMarkupPercent) || 0,
          paymentFeeRules,
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
            <div className="space-y-1">
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

          <div className="space-y-2 rounded-lg border border-border/60 p-3">
            <div className="space-y-0.5">
              <p className="font-medium text-sm">Taxas de pagamento</p>
              <p className="text-muted-foreground text-xs">
                Configure Pix, 1x e as parcelas adicionais que devem aparecer na
                venda.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {paymentFeeRules.map((rule) => {
                const label = getPaymentRuleLabel(rule);
                const canRemove =
                  rule.paymentMethod === "card" && rule.installments >= 2;

                return (
                  <div
                    className="grid items-center gap-2 sm:grid-cols-[88px_1fr_auto]"
                    key={rule.code}
                  >
                    <Label className="text-xs">{label}</Label>
                    <InputGroup>
                      <InputGroupInput
                        min="0"
                        onChange={(event) =>
                          handlePaymentFeeRuleChange(
                            rule.code,
                            event.target.value
                          )
                        }
                        step="0.01"
                        type="number"
                        value={rule.feePercent}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>%</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                    <Button
                      disabled={!canRemove || pending}
                      onClick={() =>
                        handleRemoveInstallmentRule(rule.installments)
                      }
                      size="xs"
                      type="button"
                      variant="ghost"
                    >
                      Remover
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Select
                onValueChange={setInstallmentsToAdd}
                value={installmentsToAdd}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Adicionar parcela" />
                </SelectTrigger>
                <SelectContent>
                  {availableInstallments.map((installments) => (
                    <SelectItem key={installments} value={String(installments)}>
                      {installments}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={pending || installmentsToAdd.length === 0}
                onClick={handleAddInstallmentRule}
                type="button"
                variant="outline"
              >
                Adicionar
              </Button>
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
