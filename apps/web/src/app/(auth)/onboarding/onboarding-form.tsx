"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { completeOnboardingAction } from "@/features/onboarding/actions";
import { initialOnboardingActionState } from "@/features/onboarding/state";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initialOnboardingActionState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p
        aria-live="polite"
        className="min-h-5 text-destructive text-sm"
        id="onboarding-error"
      >
        {state.error}
      </p>

      <Button className="h-11 w-full" disabled={pending} type="submit">
        {pending ? "Criando..." : "Ativar conta"}
      </Button>
    </form>
  );
}
