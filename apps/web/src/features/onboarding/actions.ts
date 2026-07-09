"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createInitialOrganizationForUser,
  getAppContext,
} from "@/lib/app-session";
import { sendWelcomeEmailIfConfigured } from "@/lib/email-service";
import { requireSession } from "@/lib/session";
import type { OnboardingActionState } from "./state";

const onboardingSchema = z.object({
  organizationName: z.string().trim().min(2, "Informe o nome da organizacao."),
});

export async function completeOnboardingAction(
  _state: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const session = await requireSession();
  const existingContext = await getAppContext();

  if (existingContext) {
    redirect("/");
  }

  const parsed = onboardingSchema.safeParse({
    organizationName: formData.get("organizationName"),
  });

  if (!parsed.success) {
    return {
      error: "Informe um nome valido para a organizacao.",
    };
  }

  await createInitialOrganizationForUser({
    name: parsed.data.organizationName,
    userId: session.user.id,
  });
  await sendWelcomeEmailIfConfigured({
    name: session.user.name,
    to: session.user.email,
    userId: session.user.id,
  });

  redirect("/");
}
