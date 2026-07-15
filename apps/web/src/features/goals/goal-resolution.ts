import "server-only";

import { auditEvents, goals } from "@polaris/db/schema";
import { withInternalJobContext } from "@polaris/db/tenant-context";
import { and, eq } from "drizzle-orm";
import { getDashboardMetrics } from "@/features/dashboard/server";
import type { GoalMetric } from "@/features/goals/contracts";
import { getGoalActualValue, goalTargetMet } from "@/features/goals/progress";
import { roundCurrency } from "@/lib/domain/currency";
import { formatDateInputValue } from "@/lib/domain/date";

export interface GoalResolutionSummary {
  completed: number;
  conflicted: number;
  expired: number;
}

const toResolvedDecimalString = (metric: GoalMetric, actual: number): string =>
  metric === "sales_count"
    ? `${Math.round(actual)}.00`
    : roundCurrency(actual).toFixed(2);

const resolveGoalStatus = ({
  actual,
  metric,
  periodEnd,
  target,
  today,
}: {
  actual: number;
  metric: GoalMetric;
  periodEnd: string;
  target: number;
  today: string;
}): "completed" | "expired" | null => {
  if (goalTargetMet(metric, actual, target)) {
    return "completed";
  }

  return today > periodEnd ? "expired" : null;
};

export const resolveActiveGoals = async (
  now = new Date()
): Promise<GoalResolutionSummary> => {
  const today = formatDateInputValue(now);
  const activeGoals = await withInternalJobContext("goal_resolution", (tx) =>
    tx.select().from(goals).where(eq(goals.status, "active"))
  );
  const summary: GoalResolutionSummary = {
    completed: 0,
    conflicted: 0,
    expired: 0,
  };

  for (const goal of activeGoals) {
    const metric = goal.metric as GoalMetric;
    const metrics = await getDashboardMetrics(goal.organizationId, {
      from: goal.periodStart,
      to: goal.periodEnd,
    });
    const actual = getGoalActualValue(metric, metrics);
    const nextStatus = resolveGoalStatus({
      actual,
      metric,
      periodEnd: goal.periodEnd,
      target: Number(goal.targetValue),
      today,
    });

    if (!nextStatus) {
      continue;
    }

    const resolved = await withInternalJobContext(
      "goal_resolution",
      async (tx) => {
        const updated = await tx
          .update(goals)
          .set({
            resolvedAt: now,
            resolvedValue: toResolvedDecimalString(metric, actual),
            status: nextStatus,
            updatedAt: now,
          })
          .where(
            and(
              eq(goals.id, goal.id),
              eq(goals.organizationId, goal.organizationId),
              eq(goals.status, "active")
            )
          )
          .returning({ id: goals.id });

        if (updated.length === 0) {
          return false;
        }

        await tx.insert(auditEvents).values({
          metadata: {
            actualValue: toResolvedDecimalString(metric, actual),
            source: "scheduled_goal_resolution",
            targetValue: goal.targetValue,
          },
          organizationId: goal.organizationId,
          subjectId: goal.id,
          subjectType: "goal",
          type: `goal.${nextStatus}`,
        });

        return true;
      }
    );

    if (!resolved) {
      summary.conflicted += 1;
      continue;
    }

    summary[nextStatus] += 1;
  }

  return summary;
};
