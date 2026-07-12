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

const revalidateDashboard = () => {
  refresh();
};

export async function createGoalAction(data: unknown) {
  const context = await requireAppContext("settings:write");
  const parsed = createGoalSchema.parse(data);
  await createGoal(context.organizationId, parsed, context.userId);
  revalidateDashboard();
}

export async function updateGoalAction(data: unknown) {
  const context = await requireAppContext("settings:write");
  const parsed = updateGoalSchema.parse(data);
  await updateGoal(context.organizationId, parsed, context.userId);
  revalidateDashboard();
}

export async function archiveGoalAction(data: unknown) {
  const context = await requireAppContext("settings:write");
  const parsed = archiveGoalSchema.parse(data);
  await archiveGoal(context.organizationId, parsed.id, context.userId);
  revalidateDashboard();
}

export async function unarchiveGoalAction(data: unknown) {
  const context = await requireAppContext("settings:write");
  const parsed = unarchiveGoalSchema.parse(data);
  await unarchiveGoal(context.organizationId, parsed.id, context.userId);
  revalidateDashboard();
}
