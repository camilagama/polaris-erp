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
import { requireActionSession } from "@/lib/server-action-auth";

const revalidateDashboard = () => {
  refresh();
};

export async function createGoalAction(data: unknown) {
  const session = await requireActionSession();
  const parsed = createGoalSchema.parse(data);
  await createGoal(parsed, session.user.id);
  revalidateDashboard();
}

export async function updateGoalAction(data: unknown) {
  await requireActionSession();
  const parsed = updateGoalSchema.parse(data);
  await updateGoal(parsed);
  revalidateDashboard();
}

export async function archiveGoalAction(data: unknown) {
  await requireActionSession();
  const parsed = archiveGoalSchema.parse(data);
  await archiveGoal(parsed.id);
  revalidateDashboard();
}

export async function unarchiveGoalAction(data: unknown) {
  await requireActionSession();
  const parsed = unarchiveGoalSchema.parse(data);
  await unarchiveGoal(parsed.id);
  revalidateDashboard();
}
