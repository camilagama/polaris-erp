import "server-only";

import { auditEvents, goals } from "@polaris/db/schema";
import {
  type TenantTransaction,
  withTenantContext,
} from "@polaris/db/tenant-context";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { getDashboardMetrics } from "@/features/dashboard/server";
import type {
  DashboardGoalCard,
  DashboardGoalHistoryItem,
  GoalMetric,
  GoalStatus,
  GoalsDashboardPayload,
  GoalsSettingsPayload,
} from "@/features/goals/contracts";
import { formatCompletionElapsedLabel } from "@/features/goals/duration";
import {
  computeGoalProgressPercent,
  getGoalActualValue,
} from "@/features/goals/progress";
import type { CreateGoalInput, UpdateGoalInput } from "@/features/goals/schema";
import { goalPeriodIsCreatable } from "@/features/goals/schema";
import { roundCurrency } from "@/lib/domain/currency";
import { formatDateInputValue } from "@/lib/domain/date";
import { getOrganizationPlanEntitlements } from "@/lib/entitlements";

const GOAL_QUOTA_LOCK_NAMESPACE = 411_297;
const SETTINGS_HISTORY_LIMIT = 40;

const createGoalCapacityErrorMessage = (maxActiveGoals: number): string =>
  maxActiveGoals === 1
    ? "Permitido apenas 1 meta ativa por vez. Arquive ou encerre a meta atual antes de criar outra."
    : `Voce pode ter no maximo ${maxActiveGoals} metas ativas. Encerre ou arquive uma meta antes de criar outra.`;

const unarchiveCapacityErrorMessage = (maxActiveGoals: number): string =>
  maxActiveGoals === 1
    ? "Ja existe uma meta ativa. Arquive ou encerre ela antes de reativar esta."
    : `Ja existem ${maxActiveGoals} metas ativas. Arquive ou conclua outra antes de reativar esta.`;

const toTargetDecimalString = (metric: GoalMetric, value: number): string => {
  if (metric === "sales_count") {
    return `${Math.round(value)}.00`;
  }

  return roundCurrency(value).toFixed(2);
};

const toResolvedDecimalString = (metric: GoalMetric, actual: number): string =>
  metric === "sales_count"
    ? `${Math.round(actual)}.00`
    : roundCurrency(actual).toFixed(2);

const countActiveGoals = async (
  tx: TenantTransaction,
  organizationId: string
): Promise<number> => {
  const rows = await tx
    .select({ value: count() })
    .from(goals)
    .where(
      and(eq(goals.organizationId, organizationId), eq(goals.status, "active"))
    );

  return Number(rows[0]?.value ?? 0);
};

const assertActiveGoalCapacity = async (
  tx: TenantTransaction,
  organizationId: string,
  metric: GoalMetric,
  messageForLimit: (maxActiveGoals: number) => string
): Promise<void> => {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(${GOAL_QUOTA_LOCK_NAMESPACE}, hashtext(${organizationId}))`
  );

  const entitlements = await getOrganizationPlanEntitlements(
    tx,
    organizationId
  );
  const activeCount = await countActiveGoals(tx, organizationId);

  if (activeCount >= entitlements.maxActiveGoals) {
    throw new Error(messageForLimit(entitlements.maxActiveGoals));
  }

  const rows = await tx
    .select({ value: count() })
    .from(goals)
    .where(
      and(
        eq(goals.organizationId, organizationId),
        eq(goals.metric, metric),
        eq(goals.status, "active")
      )
    );

  if (Number(rows[0]?.value ?? 0) > 0) {
    throw new Error("Ja existe uma meta ativa para esta metrica.");
  }
};

const writeGoalAuditEvent = (
  tx: TenantTransaction,
  {
    actorUserId,
    metadata,
    organizationId,
    subjectId,
    type,
  }: {
    actorUserId?: string;
    metadata?: Record<string, unknown>;
    organizationId: string;
    subjectId?: string;
    type: string;
  }
) =>
  tx.insert(auditEvents).values({
    actorUserId,
    metadata,
    organizationId,
    subjectId,
    subjectType: "goal",
    type,
  });

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
  const activeRows = await withTenantContext(organizationId, (tx) =>
    tx
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.organizationId, organizationId),
          eq(goals.status, "active")
        )
      )
      .orderBy(asc(goals.periodEnd))
  );

  const active = await buildActiveDashboardCards(organizationId, activeRows);

  return { active };
};

export const getGoalsSettingsData = async (
  organizationId: string
): Promise<GoalsSettingsPayload> => {
  const activeRows = await withTenantContext(organizationId, (tx) =>
    tx
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.organizationId, organizationId),
          eq(goals.status, "active")
        )
      )
      .orderBy(asc(goals.periodEnd))
  );

  const active = await buildActiveDashboardCards(organizationId, activeRows);

  const historyRows = await withTenantContext(organizationId, (tx) =>
    tx
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.organizationId, organizationId),
          inArray(goals.status, ["completed", "expired", "archived"])
        )
      )
      .orderBy(desc(goals.updatedAt))
      .limit(SETTINGS_HISTORY_LIMIT)
  );

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

  const maxActiveGoals = await withTenantContext(
    organizationId,
    async (tx) =>
      (await getOrganizationPlanEntitlements(tx, organizationId)).maxActiveGoals
  );

  return { active, history, maxActiveGoals };
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

  await withTenantContext(organizationId, async (tx) => {
    await assertActiveGoalCapacity(
      tx,
      organizationId,
      input.metric,
      createGoalCapacityErrorMessage
    );

    await tx.insert(goals).values({
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

    await writeGoalAuditEvent(tx, {
      actorUserId: createdByUserId,
      metadata: { metric: input.metric, name: input.name },
      organizationId,
      type: "goal.created",
    });
  });
};

export const updateGoal = async (
  organizationId: string,
  input: UpdateGoalInput,
  actorUserId: string
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

  await withTenantContext(organizationId, async (tx) => {
    const existing = await tx.query.goals.findFirst({
      where: and(
        eq(goals.id, input.id),
        eq(goals.organizationId, organizationId),
        eq(goals.status, "active")
      ),
    });

    if (!existing) {
      throw new Error("Meta nao encontrada ou nao esta ativa.");
    }

    const updatedRows = await tx
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
        and(
          eq(goals.id, input.id),
          eq(goals.organizationId, organizationId),
          eq(goals.status, "active")
        )
      )
      .returning({ id: goals.id });

    if (updatedRows.length === 0) {
      throw new Error("Meta nao encontrada ou nao esta ativa.");
    }

    await writeGoalAuditEvent(tx, {
      actorUserId,
      organizationId,
      subjectId: input.id,
      type: "goal.updated",
    });
  });
};

export const archiveGoal = async (
  organizationId: string,
  goalId: string,
  actorUserId: string
): Promise<void> => {
  const row = await withTenantContext(organizationId, (tx) =>
    tx.query.goals.findFirst({
      where: and(
        eq(goals.id, goalId),
        eq(goals.organizationId, organizationId)
      ),
    })
  );

  if (!row) {
    throw new Error("Meta nao encontrada.");
  }

  if (row.status === "archived") {
    return;
  }

  if (row.status !== "active") {
    throw new Error("Somente metas ativas podem ser arquivadas.");
  }

  const metric = row.metric as GoalMetric;
  const metrics = await getDashboardMetrics(organizationId, {
    from: row.periodStart,
    to: row.periodEnd,
  });
  const actual = getGoalActualValue(metric, metrics);

  await withTenantContext(organizationId, async (tx) => {
    const archivedRows = await tx
      .update(goals)
      .set({
        resolvedAt: new Date(),
        resolvedValue: toResolvedDecimalString(metric, actual),
        status: "archived",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(goals.id, goalId),
          eq(goals.organizationId, organizationId),
          eq(goals.status, "active")
        )
      )
      .returning({ id: goals.id });

    if (archivedRows.length === 0) {
      throw new Error("Meta nao encontrada.");
    }

    await writeGoalAuditEvent(tx, {
      actorUserId,
      organizationId,
      subjectId: goalId,
      type: "goal.archived",
    });
  });
};

export const unarchiveGoal = async (
  organizationId: string,
  goalId: string,
  actorUserId: string
): Promise<void> => {
  const row = await withTenantContext(organizationId, (tx) =>
    tx.query.goals.findFirst({
      where: and(
        eq(goals.id, goalId),
        eq(goals.organizationId, organizationId)
      ),
    })
  );

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

  await withTenantContext(organizationId, async (tx) => {
    await assertActiveGoalCapacity(
      tx,
      organizationId,
      row.metric as GoalMetric,
      unarchiveCapacityErrorMessage
    );

    const unarchivedRows = await tx
      .update(goals)
      .set({
        resolvedAt: null,
        resolvedValue: null,
        status: "active",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(goals.id, goalId),
          eq(goals.organizationId, organizationId),
          eq(goals.status, "archived")
        )
      )
      .returning({ id: goals.id });

    if (unarchivedRows.length === 0) {
      throw new Error("Meta nao encontrada.");
    }

    await writeGoalAuditEvent(tx, {
      actorUserId,
      organizationId,
      subjectId: goalId,
      type: "goal.unarchived",
    });
  });
};
