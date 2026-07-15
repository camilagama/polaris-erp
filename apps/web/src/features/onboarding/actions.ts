"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createInitialOrganizationForUser } from "@/features/onboarding/server";
import { sendWelcomeEmailIfConfigured } from "@/integrations/resend/email-service";
import { getAppAccess } from "@/lib/app-session";
import { requireSession } from "@/lib/session";
import type { OnboardingActionState } from "./state";

const onboardingWorkspaceSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres.")
    .max(80, "Use no máximo 80 caracteres."),
});

export async function completeOnboardingAction(
  _state: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const parsed = onboardingWorkspaceSchema.safeParse({
    organizationName: formData.get("organizationName"),
  });

  if (!parsed.success) {
    return {
      error: "Revise o nome da organização.",
      organizationNameError:
        parsed.error.issues[0]?.message ?? "Nome da organização inválido.",
    };
  }

  const session = await requireSession();
  const access = await getAppAccess();

  if (access.kind === "suspended") {
    redirect("/restricted-access");
    return _state;
  }

  if (access.kind === "active") {
    redirect("/");
    return _state;
  }

  await createInitialOrganizationForUser({
    billingEmail: session.user.email,
    organizationName: parsed.data.organizationName,
    userId: session.user.id,
  });
  await sendWelcomeEmailIfConfigured({
    name: session.user.name,
    to: session.user.email,
    userId: session.user.id,
  });

  redirect("/onboarding?step=plan");
}
