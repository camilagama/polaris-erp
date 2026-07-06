"use client";

import { useForm } from "@tanstack/react-form";
import { endOfMonth, startOfMonth } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { createGoalAction, updateGoalAction } from "@/app/(app)/metas/actions";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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
  type DashboardGoalCard,
  MAX_ACTIVE_GOALS,
} from "@/features/goals/contracts";
import {
  createGoalSchema,
  goalDisplayModeSchema,
  goalMetricSchema,
  goalPeriodIsCreatable,
  updateGoalSchema,
  validateGoalTargetValue,
} from "@/features/goals/schema";
import { formatDateInputValue } from "@/lib/domain/date";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";

const defaultMonthRange = () => {
  const now = new Date();

  return {
    periodEnd: formatDateInputValue(endOfMonth(now)),
    periodStart: formatDateInputValue(startOfMonth(now)),
    rangePreset: null as string | null,
  };
};

type GoalFormMode = "create" | "edit";

interface GoalFormDialogProps {
  dateBounds: {
    from: string;
    to: string;
  };
  initialGoal?: DashboardGoalCard | null;
  mode: GoalFormMode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function GoalFormDialog({
  dateBounds: _dateBounds,
  initialGoal,
  mode,
  onOpenChange,
  open,
}: GoalFormDialogProps) {
  const [submitLabel, setSubmitLabel] = useState(() =>
    mode === "edit" ? "Salvar alteracoes" : "Criar meta"
  );

  const defaults = useMemo(() => {
    if (mode === "edit" && initialGoal) {
      return {
        displayMode: initialGoal.displayMode,
        metric: initialGoal.metric,
        name: initialGoal.name,
        periodEnd: initialGoal.period.to,
        periodStart: initialGoal.period.from,
        rangePreset: null as string | null,
        targetValue: initialGoal.targetValue,
      };
    }

    return {
      displayMode: "percentage" as const,
      metric: "revenue" as const,
      name: "",
      ...defaultMonthRange(),
      targetValue: 0,
    };
  }, [initialGoal, mode]);

  const form = useForm({
    defaultValues: defaults,
    onSubmit: async ({ value }) => {
      const today = formatDateInputValue();

      if (
        !goalPeriodIsCreatable({
          periodEnd: value.periodEnd,
          periodStart: value.periodStart,
          today,
        })
      ) {
        toast.error(
          "Nao e permitido criar metas com periodo totalmente passado."
        );
        return;
      }

      try {
        setSubmitLabel("Salvando...");

        if (mode === "edit" && initialGoal) {
          const parsed = updateGoalSchema.parse({
            displayMode: value.displayMode,
            id: initialGoal.id,
            metric: value.metric,
            name: value.name,
            periodEnd: value.periodEnd,
            periodStart: value.periodStart,
            targetValue: value.targetValue,
          });
          await updateGoalAction(parsed);
          toast.success("Meta atualizada.");
        } else {
          const parsed = createGoalSchema.parse({
            displayMode: value.displayMode,
            metric: value.metric,
            name: value.name,
            periodEnd: value.periodEnd,
            periodStart: value.periodStart,
            targetValue: value.targetValue,
          });
          await createGoalAction(parsed);
          toast.success("Meta criada.");
        }

        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar a meta."
        );
      } finally {
        setSubmitLabel(mode === "edit" ? "Salvar alteracoes" : "Criar meta");
      }
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(defaults);
  }, [defaults, form, open]);

  const title = mode === "edit" ? "Editar meta" : "Nova meta";
  const createModeDescription =
    MAX_ACTIVE_GOALS === 1
      ? "Uma meta ativa por vez no dashboard (receita, lucro operacional ou vendas no periodo)."
      : `Defina ate ${MAX_ACTIVE_GOALS} metas ativas para acompanhar receita, lucro operacional ou quantidade de vendas no periodo.`;
  const description =
    mode === "edit"
      ? "Ajuste nome, tipo, periodo ou valor alvo. Metas totalmente passadas nao podem ser salvas."
      : createModeDescription;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="sm:max-w-130"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="flex flex-col gap-5 pb-6">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  const result = createGoalSchema.shape.name.safeParse(value);
                  return result.success
                    ? undefined
                    : result.error.issues[0]?.message;
                },
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>Nome da meta</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Ex: Meta abril — receita"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <em className="text-[11px] text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </em>
                  ) : null}
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <form.Field
                name="metric"
                validators={{
                  onChange: ({ value }) => {
                    const result = goalMetricSchema.safeParse(value);
                    return result.success
                      ? undefined
                      : result.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>Tipo</Label>
                    <Select
                      onValueChange={(v) =>
                        field.handleChange(v as typeof field.state.value)
                      }
                      value={field.state.value}
                    >
                      <SelectTrigger className="w-full" id={field.name}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Receita</SelectItem>
                        <SelectItem value="profit">Lucro</SelectItem>
                        <SelectItem value="sales_count">
                          Vendas concluidas
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 ? (
                      <em className="text-[11px] text-destructive">
                        {field.state.meta.errors.join(", ")}
                      </em>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="displayMode"
                validators={{
                  onChange: ({ value }) => {
                    const result = goalDisplayModeSchema.safeParse(value);
                    return result.success
                      ? undefined
                      : result.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>Destaque no card</Label>
                    <Select
                      onValueChange={(v) =>
                        field.handleChange(v as typeof field.state.value)
                      }
                      value={field.state.value}
                    >
                      <SelectTrigger className="w-full" id={field.name}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentagem</SelectItem>
                        <SelectItem value="absolute">Valor real</SelectItem>
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 ? (
                      <em className="text-[11px] text-destructive">
                        {field.state.meta.errors.join(", ")}
                      </em>
                    ) : null}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <form.Subscribe selector={(state) => state.values.metric}>
                {(metric) => (
                  <form.Field
                    name="targetValue"
                    validators={{
                      onChange: ({ value }) =>
                        validateGoalTargetValue(metric, value),
                    }}
                  >
                    {
                      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Required for dynamic unit masking
                      (field) => {
                        const isSalesCount = metric === "sales_count";

                        return (
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={field.name}>Valor alvo</Label>
                            <InputGroup>
                              {isSalesCount ? null : (
                                <InputGroupAddon>
                                  <InputGroupText>R$</InputGroupText>
                                </InputGroupAddon>
                              )}
                              <InputGroupInput
                                id={field.name}
                                inputMode={isSalesCount ? undefined : "numeric"}
                                min={isSalesCount ? 1 : undefined}
                                name={field.name}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                  field.handleChange(
                                    isSalesCount
                                      ? Number(event.target.value)
                                      : parseCurrencyInput(event.target.value)
                                  )
                                }
                                placeholder={isSalesCount ? "50" : "10.000,00"}
                                step={isSalesCount ? 1 : undefined}
                                type={isSalesCount ? "number" : "text"}
                                value={
                                  isSalesCount
                                    ? field.state.value
                                    : formatCurrencyInput(field.state.value)
                                }
                              />
                              {isSalesCount ? (
                                <InputGroupAddon align="inline-end">
                                  <InputGroupText>vendas</InputGroupText>
                                </InputGroupAddon>
                              ) : null}
                            </InputGroup>
                            {field.state.meta.errors.length > 0 ? (
                              <em className="text-[11px] text-destructive">
                                {field.state.meta.errors.join(", ")}
                              </em>
                            ) : null}
                          </div>
                        );
                      }
                    }
                  </form.Field>
                )}
              </form.Subscribe>

              <form.Subscribe
                selector={(state) => ({
                  from: state.values.periodStart,
                  preset: state.values.rangePreset,
                  to: state.values.periodEnd,
                })}
              >
                {(range) => (
                  <div className="flex flex-col gap-1.5">
                    <Label>Periodo da meta</Label>
                    <DateRangePicker
                      onChange={({ from, preset, to }) => {
                        form.setFieldValue("periodStart", from);
                        form.setFieldValue("periodEnd", to);
                        form.setFieldValue("rangePreset", preset);
                      }}
                      popoverAlign="start"
                      popoverContentClassName="z-[100] w-auto max-h-[85vh] overflow-auto"
                      triggerClassName="h-7 w-full min-w-0 sm:min-w-0"
                      value={{
                        from: range.from,
                        preset: range.preset,
                        to: range.to,
                      }}
                    />

                    {goalPeriodIsCreatable({
                      periodEnd: range.to,
                      periodStart: range.from,
                      today: formatDateInputValue(),
                    }) ? null : (
                      <em className="text-[11px] text-destructive">
                        Periodos totalmente no passado nao sao permitidos.
                      </em>
                    )}
                  </div>
                )}
              </form.Subscribe>
            </div>
          </div>

          <DialogFooter>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => {
                const idleLabel =
                  mode === "edit" ? "Salvar alteracoes" : "Criar meta";
                const label = isSubmitting ? submitLabel : idleLabel;

                return (
                  <Button
                    className="w-full"
                    disabled={!canSubmit}
                    type="submit"
                  >
                    {label}
                  </Button>
                );
              }}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
