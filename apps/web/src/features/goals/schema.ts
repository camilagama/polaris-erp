import { z } from "zod";
import type { GoalMetric } from "@/features/goals/contracts";
import { isoDateSchema } from "@/lib/domain/date-validation";

export const goalMetricSchema = z.enum(["revenue", "profit", "sales_count"]);

export const goalDisplayModeSchema = z.enum(["percentage", "absolute"]);

const trimmedNameSchema = z
  .string()
  .trim()
  .min(1, "Informe um nome para a meta.")
  .max(80, "Nome muito longo.");

const targetBaseSchema = z.coerce
  .number()
  .finite("Informe um valor alvo valido.");

export const createGoalSchema = z
  .object({
    displayMode: goalDisplayModeSchema,
    metric: goalMetricSchema,
    name: trimmedNameSchema,
    periodEnd: isoDateSchema,
    periodStart: isoDateSchema,
    targetValue: targetBaseSchema,
  })
  .superRefine((data, ctx) => {
    if (data.periodEnd < data.periodStart) {
      ctx.addIssue({
        code: "custom",
        message: "A data final deve ser igual ou posterior a data inicial.",
        path: ["periodEnd"],
      });
    }

    if (data.metric === "sales_count") {
      if (!Number.isInteger(data.targetValue)) {
        ctx.addIssue({
          code: "custom",
          message: "Meta de vendas deve usar um numero inteiro.",
          path: ["targetValue"],
        });
      }

      if (data.targetValue < 1) {
        ctx.addIssue({
          code: "custom",
          message: "O alvo deve ser pelo menos 1 venda.",
          path: ["targetValue"],
        });
      }

      return;
    }

    if (data.targetValue <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "O valor alvo deve ser maior que zero.",
        path: ["targetValue"],
      });
    }
  });

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = createGoalSchema.extend({
  id: z.string().uuid("Meta invalida."),
});

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const archiveGoalSchema = z.object({
  id: z.string().uuid("Meta invalida."),
});

export type ArchiveGoalInput = z.infer<typeof archiveGoalSchema>;

export const unarchiveGoalSchema = z.object({
  id: z.string().uuid("Meta invalida."),
});

export type UnarchiveGoalInput = z.infer<typeof unarchiveGoalSchema>;

export const validateGoalTargetValue = (
  metric: GoalMetric,
  value: number
): string | undefined => {
  if (!Number.isFinite(value)) {
    return "Informe um valor alvo valido.";
  }

  if (metric === "sales_count") {
    if (!Number.isInteger(value)) {
      return "Meta de vendas deve usar um numero inteiro.";
    }

    if (value < 1) {
      return "O alvo deve ser pelo menos 1 venda.";
    }

    return;
  }

  if (value <= 0) {
    return "O valor alvo deve ser maior que zero.";
  }

  return;
};

export const periodIncludesToday = ({
  periodEnd,
  periodStart,
  today,
}: {
  periodEnd: string;
  periodStart: string;
  today: string;
}): boolean => periodStart <= today && periodEnd >= today;

export const goalPeriodIsCreatable = ({
  periodEnd,
  periodStart,
  today,
}: {
  periodEnd: string;
  periodStart: string;
  today: string;
}): boolean => {
  if (periodEnd < periodStart) {
    return false;
  }

  // Future goals are allowed. What is blocked is a period that ended before today.
  return periodEnd >= today;
};
