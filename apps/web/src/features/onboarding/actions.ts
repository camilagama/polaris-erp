"use server";

import { redirect } from "next/navigation";
import { sendWelcomeEmailIfConfigured } from "@/integrations/resend/email-service";
import {
  createInitialOrganizationForUser,
  getAppContext,
} from "@/lib/app-session";
import { requireSession } from "@/lib/session";
import type { OnboardingActionState } from "./state";

export async function completeOnboardingAction(
  _state: OnboardingActionState,
  _formData: FormData
): Promise<OnboardingActionState> {
  const session = await requireSession();
  const existingContext = await getAppContext();

  if (existingContext) {
    redirect("/");
  }

  await createInitialOrganizationForUser({
    billingEmail: session.user.email,
    userId: session.user.id,
  });
  await sendWelcomeEmailIfConfigured({
    name: session.user.name,
    to: session.user.email,
    userId: session.user.id,
  });

  redirect("/");
}
