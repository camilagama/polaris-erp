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
  type GoalsSettingsPayload,
  MAX_ACTIVE_GOALS,
} from "@/features/goals/contracts";
import { formatCompletionElapsedLabel } from "@/features/goals/duration";
import {
  computeGoalProgressPercent,
  getGoalActualValue,
  goalTargetMet,
} from "@/features/goals/progress";
import type { CreateGoalInput, UpdateGoalInput } from "@/features/goals/schema";
import { goalPeriodIsCreatable } from "@/features/goals/schema";
import { roundCurrency } from "@/lib/domain/currency";
import { formatDateInputValue } from "@/lib/domain/date";

const SETTINGS_HISTORY_LIMIT = 40;

const createGoalCapacityErrorMessage = (): string =>
  MAX_ACTIVE_GOALS === 1
    ? "Permitido apenas 1 meta ativa por vez. Arquive ou encerre a meta atual antes de criar outra."
    : `Voce pode ter no maximo ${MAX_ACTIVE_GOALS} metas ativas. Encerre ou arquive uma meta antes de criar outra.`;

const unarchiveCapacityErrorMessage = (): string =>
  MAX_ACTIVE_GOALS === 1
    ? "Ja existe uma meta ativa. Arquive ou encerre ela antes de reativar esta."
    : `Ja existem ${MAX_ACTIVE_GOALS} metas ativas. Arquive ou conclua outra antes de reativar esta.`;

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

const countActiveGoals = async (organizationId: string): Promise<number> => {
  const rows = await db
    .select({ value: count() })
    .from(goals)
    .where(
      and(eq(goals.organizationId, organizationId), eq(goals.status, "active"))
    );

  return Number(rows[0]?.value ?? 0);
};

const resolveActiveGoalTransitions = async (
  organizationId: string
): Promise<void> => {
  const today = formatDateInputValue();
  const activeRows = await db
    .select()
    .from(goals)
    .where(
      and(eq(goals.organizationId, organizationId), eq(goals.status, "active"))
    );

  for (const row of activeRows) {
    const metrics = await getDashboardMetrics(organizationId, {
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
      .where(
        and(eq(goals.id, row.id), eq(goals.organizationId, organizationId))
      );
  }
};

const buildActiveDashboardCards = async (
  organizationId: string,
  activeRows: (typeof goals.$inferSelect)[]
): Promise<DashboardGoalCard[]> => {
  const active: DashboardGoalCard[] = [];

  for (const row of activeRows) {
    const metric = row.metric as GoalMetric;
    const metrics = await getDashboardMetrics(organizationId, {
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

  return active;
};

export const getGoalsDashboardData = async (
  organizationId: string
): Promise<GoalsDashboardPayload> => {
  await resolveActiveGoalTransitions(organizationId);

  const activeRows = await db
    .select()
    .from(goals)
    .where(
      and(eq(goals.organizationId, organizationId), eq(goals.status, "active"))
    )
    .orderBy(asc(goals.periodEnd));

  const active = await buildActiveDashboardCards(organizationId, activeRows);

  return { active };
};

export const getGoalsSettingsData = async (
  organizationId: string
): Promise<GoalsSettingsPayload> => {
  await resolveActiveGoalTransitions(organizationId);

  const activeRows = await db
    .select()
    .from(goals)
    .where(
      and(eq(goals.organizationId, organizationId), eq(goals.status, "active"))
    )
    .orderBy(asc(goals.periodEnd));

  const active = await buildActiveDashboardCards(organizationId, activeRows);

  const historyRows = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.organizationId, organizationId),
        inArray(goals.status, ["completed", "expired", "archived"])
      )
    )
    .orderBy(desc(goals.updatedAt))
    .limit(SETTINGS_HISTORY_LIMIT);

  const history: DashboardGoalHistoryItem[] = historyRows.map((row) => {
    const resolvedAtIso = row.resolvedAt?.toISOString() ?? null;
    const resolutionElapsedLabel =
      resolvedAtIso === null
        ? null
        : formatCompletionElapsedLabel(row.periodStart, resolvedAtIso);

    return {
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      metric: row.metric as GoalMetric,
      name: row.name,
      period: { from: row.periodStart, to: row.periodEnd },
      resolutionElapsedLabel,
      resolvedAt: resolvedAtIso,
      resolvedValue:
        row.resolvedValue === null ? null : Number(row.resolvedValue),
      status: row.status as DashboardGoalHistoryItem["status"],
      targetValue: Number(row.targetValue),
    };
  });

  return { active, history };
};

export const createGoal = async (
  organizationId: string,
  input: CreateGoalInput,
  createdByUserId: string
): Promise<void> => {
  const today = formatDateInputValue();

  if (
    !goalPeriodIsCreatable({
      periodEnd: input.periodEnd,
      periodStart: input.periodStart,
      today,
    })
  ) {
    throw new Error(
      "Nao e permitido criar metas com periodo totalmente passado."
    );
  }

  const activeCount = await countActiveGoals(organizationId);

  if (activeCount >= MAX_ACTIVE_GOALS) {
    throw new Error(createGoalCapacityErrorMessage());
  }

  await db.insert(goals).values({
    createdByUserId,
    displayMode: input.displayMode,
    metric: input.metric,
    name: input.name.trim(),
    organizationId,
    periodEnd: input.periodEnd,
    periodStart: input.periodStart,
    status: "active",
    targetValue: toTargetDecimalString(input.metric, input.targetValue),
  });
};

export const updateGoal = async (
  organizationId: string,
  input: UpdateGoalInput
): Promise<void> => {
  const today = formatDateInputValue();

  if (
    !goalPeriodIsCreatable({
      periodEnd: input.periodEnd,
      periodStart: input.periodStart,
      today,
    })
  ) {
    throw new Error(
      "Nao e permitido criar metas com periodo totalmente passado."
    );
  }

  const existing = await db.query.goals.findFirst({
    where: and(
      eq(goals.id, input.id),
      eq(goals.organizationId, organizationId),
      eq(goals.status, "active")
    ),
  });

  if (!existing) {
    throw new Error("Meta nao encontrada ou nao esta ativa.");
  }

  const updatedRows = await db
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
    .where(
      and(eq(goals.id, input.id), eq(goals.organizationId, organizationId))
    )
    .returning({ id: goals.id });

  if (updatedRows.length === 0) {
    throw new Error("Meta nao encontrada ou nao esta ativa.");
  }
};

export const archiveGoal = async (
  organizationId: string,
  goalId: string
): Promise<void> => {
  const row = await db.query.goals.findFirst({
    where: and(eq(goals.id, goalId), eq(goals.organizationId, organizationId)),
  });

  if (!row) {
    throw new Error("Meta nao encontrada.");
  }

  if (row.status === "archived") {
    return;
  }

  const metric = row.metric as GoalMetric;
  const metrics = await getDashboardMetrics(organizationId, {
    from: row.periodStart,
    to: row.periodEnd,
  });
  const actual = getGoalActualValue(metric, metrics);

  const archivedRows = await db
    .update(goals)
    .set({
      resolvedAt: new Date(),
      resolvedValue: toResolvedDecimalString(metric, actual),
      status: "archived",
      updatedAt: new Date(),
    })
    .where(and(eq(goals.id, goalId), eq(goals.organizationId, organizationId)))
    .returning({ id: goals.id });

  if (archivedRows.length === 0) {
    throw new Error("Meta nao encontrada.");
  }
};

export const unarchiveGoal = async (
  organizationId: string,
  goalId: string
): Promise<void> => {
  const row = await db.query.goals.findFirst({
    where: and(eq(goals.id, goalId), eq(goals.organizationId, organizationId)),
  });

  if (!row) {
    throw new Error("Meta nao encontrada.");
  }

  if (row.status !== "archived") {
    throw new Error("Somente metas arquivadas podem ser desarquivadas.");
  }

  const today = formatDateInputValue();

  if (
    !goalPeriodIsCreatable({
      periodEnd: row.periodEnd,
      periodStart: row.periodStart,
      today,
    })
  ) {
    throw new Error(
      "Nao e permitido reativar metas com periodo totalmente passado."
    );
  }

  const activeCount = await countActiveGoals(organizationId);

  if (activeCount >= MAX_ACTIVE_GOALS) {
    throw new Error(unarchiveCapacityErrorMessage());
  }

  const unarchivedRows = await db
    .update(goals)
    .set({
      resolvedAt: null,
      resolvedValue: null,
      status: "active",
      updatedAt: new Date(),
    })
    .where(and(eq(goals.id, goalId), eq(goals.organizationId, organizationId)))
    .returning({ id: goals.id });

  if (unarchivedRows.length === 0) {
    throw new Error("Meta nao encontrada.");
  }
};
