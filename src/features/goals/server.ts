import "server-only";

import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { getDashboardMetrics } from "@/features/dashboard/server";
import {
  type DashboardGoalCard,
  type DashboardGoalHistoryItem,
  type GoalMetric,
  type GoalStatus,
  type GoalsDashboardPayload,
  MAX_ACTIVE_GOALS,
} from "@/features/goals/contracts";
import {
  computeGoalProgressPercent,
  getGoalActualValue,
  goalTargetMet,
} from "@/features/goals/progress";
import type { CreateGoalInput, UpdateGoalInput } from "@/features/goals/schema";
import { periodIncludesToday } from "@/features/goals/schema";
import { roundCurrency } from "@/lib/domain/currency";
import { formatDateInputValue } from "@/lib/domain/date";

const HISTORY_LIMIT = 5;

const toTargetDecimalString = (metric: GoalMetric, value: number): string => {
  if (metric === "sales_count") {
    return `${Math.round(value)}.00`;
  }

  return roundCurrency(value).toFixed(2);
};

const toResolvedDecimalString = (
  metric: GoalMetric,
  actual: number
): string => {
  if (metric === "sales_count") {
    return `${Math.round(actual)}.00`;
  }

  return roundCurrency(actual).toFixed(2);
};

export const countActiveGoals = async (): Promise<number> => {
  const rows = await db
    .select({ value: count() })
    .from(goals)
    .where(eq(goals.status, "active"));

  return Number(rows[0]?.value ?? 0);
};

export const resolveActiveGoalTransitions = async (): Promise<void> => {
  const today = formatDateInputValue();
  const activeRows = await db
    .select()
    .from(goals)
    .where(eq(goals.status, "active"));

  for (const row of activeRows) {
    const metrics = await getDashboardMetrics({
      from: row.periodStart,
      to: row.periodEnd,
    });
    const metric = row.metric as GoalMetric;
    const actual = getGoalActualValue(metric, metrics);
    const target = Number(row.targetValue);

    let nextStatus: "completed" | "expired" | null = null;

    if (goalTargetMet(metric, actual, target)) {
      nextStatus = "completed";
    } else if (today > row.periodEnd) {
      nextStatus = "expired";
    }

    if (!nextStatus) {
      continue;
    }

    await db
      .update(goals)
      .set({
        resolvedAt: new Date(),
        resolvedValue: toResolvedDecimalString(metric, actual),
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(goals.id, row.id));
  }
};

export const getGoalsDashboardData =
  async (): Promise<GoalsDashboardPayload> => {
    await resolveActiveGoalTransitions();

    const activeRows = await db
      .select()
      .from(goals)
      .where(eq(goals.status, "active"))
      .orderBy(asc(goals.periodEnd));

    const active: DashboardGoalCard[] = [];

    for (const row of activeRows) {
      const metric = row.metric as GoalMetric;
      const metrics = await getDashboardMetrics({
        from: row.periodStart,
        to: row.periodEnd,
      });
      const actual = getGoalActualValue(metric, metrics);
      const target = Number(row.targetValue);
      const { barPercent, progressPercent } = computeGoalProgressPercent(
        actual,
        target
      );

      active.push({
        actualValue: actual,
        barPercent,
        displayMode: row.displayMode as DashboardGoalCard["displayMode"],
        id: row.id,
        metric,
        name: row.name,
        period: { from: row.periodStart, to: row.periodEnd },
        progressPercent,
        status: row.status as GoalStatus,
        targetValue: target,
      });
    }

    const historyRows = await db
      .select()
      .from(goals)
      .where(inArray(goals.status, ["completed", "expired", "archived"]))
      .orderBy(desc(goals.updatedAt))
      .limit(HISTORY_LIMIT);

    const history: DashboardGoalHistoryItem[] = historyRows.map((row) => ({
      id: row.id,
      metric: row.metric as GoalMetric,
      name: row.name,
      period: { from: row.periodStart, to: row.periodEnd },
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      resolvedValue:
        row.resolvedValue === null ? null : Number(row.resolvedValue),
      status: row.status as DashboardGoalHistoryItem["status"],
      targetValue: Number(row.targetValue),
    }));

    return { active, history };
  };

export const createGoal = async (
  input: CreateGoalInput,
  createdByUserId: string
): Promise<void> => {
  const today = formatDateInputValue();

  if (
    !periodIncludesToday({
      periodEnd: input.periodEnd,
      periodStart: input.periodStart,
      today,
    })
  ) {
    throw new Error(
      "O periodo da meta deve incluir a data de hoje. Ajuste as datas."
    );
  }

  const activeCount = await countActiveGoals();

  if (activeCount >= MAX_ACTIVE_GOALS) {
    throw new Error(
      `Voce pode ter no maximo ${MAX_ACTIVE_GOALS} metas ativas. Encerre ou arquive uma meta antes de criar outra.`
    );
  }

  await db.insert(goals).values({
    createdByUserId,
    displayMode: input.displayMode,
    metric: input.metric,
    name: input.name.trim(),
    periodEnd: input.periodEnd,
    periodStart: input.periodStart,
    status: "active",
    targetValue: toTargetDecimalString(input.metric, input.targetValue),
  });
};

export const updateGoal = async (input: UpdateGoalInput): Promise<void> => {
  const today = formatDateInputValue();

  if (
    !periodIncludesToday({
      periodEnd: input.periodEnd,
      periodStart: input.periodStart,
      today,
    })
  ) {
    throw new Error(
      "O periodo da meta deve incluir a data de hoje. Ajuste as datas."
    );
  }

  const existing = await db.query.goals.findFirst({
    where: and(eq(goals.id, input.id), eq(goals.status, "active")),
  });

  if (!existing) {
    throw new Error("Meta nao encontrada ou nao esta ativa.");
  }

  await db
    .update(goals)
    .set({
      displayMode: input.displayMode,
      metric: input.metric,
      name: input.name.trim(),
      periodEnd: input.periodEnd,
      periodStart: input.periodStart,
      targetValue: toTargetDecimalString(input.metric, input.targetValue),
      updatedAt: new Date(),
    })
    .where(eq(goals.id, input.id));
};

export const archiveGoal = async (goalId: string): Promise<void> => {
  const row = await db.query.goals.findFirst({
    where: eq(goals.id, goalId),
  });

  if (!row) {
    throw new Error("Meta nao encontrada.");
  }

  if (row.status === "archived") {
    return;
  }

  const metric = row.metric as GoalMetric;
  const metrics = await getDashboardMetrics({
    from: row.periodStart,
    to: row.periodEnd,
  });
  const actual = getGoalActualValue(metric, metrics);

  await db
    .update(goals)
    .set({
      resolvedAt: new Date(),
      resolvedValue: toResolvedDecimalString(metric, actual),
      status: "archived",
      updatedAt: new Date(),
    })
    .where(eq(goals.id, goalId));
};
