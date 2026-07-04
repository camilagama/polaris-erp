"use server";

import { refresh } from "next/cache";
import {
  archiveGoalSchema,
  createGoalSchema,
  unarchiveGoalSchema,
  updateGoalSchema,
} from "@/features/goals/schema";
import {
  archiveGoal,
  createGoal,
  unarchiveGoal,
  updateGoal,
} from "@/features/goals/server";
import { requireAppContext } from "@/lib/app-session";
import { recordAuditEvent } from "@/lib/audit-log";

const revalidateDashboard = () => {
  refresh();
};

export async function createGoalAction(data: unknown) {
  const context = await requireAppContext("settings:write");
  const parsed = createGoalSchema.parse(data);
  await createGoal(context.organizationId, parsed, context.userId);
  revalidateDashboard();
  await recordAuditEvent({
    context,
    metadata: { metric: parsed.metric, name: parsed.name },
    subjectType: "goal",
    type: "goal.created",
  });
}

export async function updateGoalAction(data: unknown) {
  const context = await requireAppContext("settings:write");
  const parsed = updateGoalSchema.parse(data);
  await updateGoal(context.organizationId, parsed);
  revalidateDashboard();
  await recordAuditEvent({
    context,
    subjectId: parsed.id,
    subjectType: "goal",
    type: "goal.updated",
  });
}

export async function archiveGoalAction(data: unknown) {
  const context = await requireAppContext("settings:write");
  const parsed = archiveGoalSchema.parse(data);
  await archiveGoal(context.organizationId, parsed.id);
  revalidateDashboard();
  await recordAuditEvent({
    context,
    subjectId: parsed.id,
    subjectType: "goal",
    type: "goal.archived",
  });
}

export async function unarchiveGoalAction(data: unknown) {
  const context = await requireAppContext("settings:write");
  const parsed = unarchiveGoalSchema.parse(data);
  await unarchiveGoal(context.organizationId, parsed.id);
  revalidateDashboard();
  await recordAuditEvent({
    context,
    subjectId: parsed.id,
    subjectType: "goal",
    type: "goal.unarchived",
  });
}
