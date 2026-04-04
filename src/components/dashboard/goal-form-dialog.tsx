"use client";

import { useForm } from "@tanstack/react-form";
import { endOfMonth, startOfMonth } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createGoalAction, updateGoalAction } from "@/app/(app)/metas/actions";
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
import type { DashboardGoalCard } from "@/features/goals/contracts";
import {
  createGoalSchema,
  goalDisplayModeSchema,
  goalMetricSchema,
  updateGoalSchema,
  validateGoalTargetValue,
} from "@/features/goals/schema";
import { formatDateInputValue } from "@/lib/domain/date";

const defaultMonthRange = () => {
  const now = new Date();

  return {
    periodEnd: formatDateInputValue(endOfMonth(now)),
    periodStart: formatDateInputValue(startOfMonth(now)),
  };
};

type GoalFormMode = "create" | "edit";

interface GoalFormDialogProps {
  initialGoal?: DashboardGoalCard | null;
  mode: GoalFormMode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function GoalFormDialog({
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
  const description =
    mode === "edit"
      ? "Ajuste nome, tipo, periodo ou valor alvo. O periodo deve incluir hoje enquanto a meta estiver ativa."
      : "Defina ate 3 metas ativas para acompanhar receita, lucro operacional ou quantidade de vendas no periodo.";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-130">
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
          <div className="flex flex-col gap-5 py-4">
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
                        <SelectItem value="revenue">
                          Receita no periodo
                        </SelectItem>
                        <SelectItem value="profit">
                          Lucro operacional no periodo
                        </SelectItem>
                        <SelectItem value="sales_count">
                          Vendas concluidas no periodo
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
                        <SelectItem value="absolute">
                          Valor real (atual vs meta)
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
            </div>

            <form.Subscribe selector={(state) => state.values.metric}>
              {(metric) => (
                <form.Field
                  name="targetValue"
                  validators={{
                    onChange: ({ value }) =>
                      validateGoalTargetValue(metric, value),
                  }}
                >
                  {(field) => (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={field.name}>Valor alvo</Label>
                      <InputGroup>
                        {metric === "sales_count" ? null : (
                          <InputGroupAddon>
                            <InputGroupText>R$</InputGroupText>
                          </InputGroupAddon>
                        )}
                        <InputGroupInput
                          id={field.name}
                          min={metric === "sales_count" ? 1 : 0.01}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(Number(event.target.value))
                          }
                          placeholder={
                            metric === "sales_count" ? "50" : "10000.00"
                          }
                          step={metric === "sales_count" ? 1 : 0.01}
                          type="number"
                          value={field.state.value}
                        />
                        {metric === "sales_count" ? (
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
                  )}
                </form.Field>
              )}
            </form.Subscribe>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <form.Field
                name="periodStart"
                validators={{
                  onChange: ({ value }) => {
                    const result =
                      createGoalSchema.shape.periodStart.safeParse(value);
                    return result.success
                      ? undefined
                      : result.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>Inicio do periodo</Label>
                    <ProductDatePicker
                      id={field.name}
                      onChange={field.handleChange}
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

              <form.Field
                name="periodEnd"
                validators={{
                  onChange: ({ value }) => {
                    const result =
                      createGoalSchema.shape.periodEnd.safeParse(value);
                    return result.success
                      ? undefined
                      : result.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>Fim do periodo</Label>
                    <ProductDatePicker
                      id={field.name}
                      onChange={field.handleChange}
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
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              O periodo precisa incluir hoje. O progresso usa apenas vendas
              concluidas e o mesmo calculo de receita e lucro do dashboard.
            </p>
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
