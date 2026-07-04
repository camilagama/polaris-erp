"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createInitialOrganizationForUser,
  getAppContext,
} from "@/lib/app-session";
import { requireSession } from "@/lib/session";

const onboardingSchema = z.object({
  organizationName: z.string().trim().min(2, "Informe o nome da organizacao."),
});

export async function completeOnboardingAction(formData: FormData) {
  const session = await requireSession();
  const existingContext = await getAppContext();

  if (existingContext) {
    redirect("/");
  }

  const parsed = onboardingSchema.safeParse({
    organizationName: formData.get("organizationName"),
  });

  if (!parsed.success) {
    throw new Error("Informe um nome valido para a organizacao.");
  }

  await createInitialOrganizationForUser({
    name: parsed.data.organizationName,
    userId: session.user.id,
  });

  redirect("/");
}
