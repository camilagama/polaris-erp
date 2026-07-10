"use server";

import { redirect } from "next/navigation";
import { sendWelcomeEmailIfConfigured } from "@/integrations/resend/email-service";
import {
  createInitialOrganizationForUser,
  getAppContext,
} from "@/lib/app-session";
import { requireSession } from "@/lib/session";
import type { OnboardingActionState } from "./state";

const MAX_WORKSPACE_NAME_LENGTH = 80;

const parseWorkspaceName = (formData: FormData): string => {
  const workspaceName = String(formData.get("workspaceName") ?? "").trim();

  if (!workspaceName) {
    throw new Error("Informe o nome da workspace.");
  }

  if (workspaceName.length > MAX_WORKSPACE_NAME_LENGTH) {
    throw new Error("Use no maximo 80 caracteres para a workspace.");
  }

  return workspaceName;
};

export async function completeOnboardingAction(
  _state: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const session = await requireSession();
  const existingContext = await getAppContext();

  if (existingContext) {
    redirect("/");
  }

  let workspaceName: string;

  try {
    workspaceName = parseWorkspaceName(formData);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel validar a workspace.",
    };
  }

  await createInitialOrganizationForUser({
    billingEmail: session.user.email,
    organizationName: workspaceName,
    userId: session.user.id,
  });
  await sendWelcomeEmailIfConfigured({
    name: session.user.name,
    to: session.user.email,
    userId: session.user.id,
  });

  redirect("/");
}
