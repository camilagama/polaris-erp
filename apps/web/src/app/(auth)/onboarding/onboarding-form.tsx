"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboardingAction } from "@/features/onboarding/actions";
import { initialOnboardingActionState } from "@/features/onboarding/state";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initialOnboardingActionState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workspaceName">Nome da workspace</Label>
        <Input
          aria-describedby="onboarding-error"
          autoComplete="organization"
          id="workspaceName"
          maxLength={80}
          name="workspaceName"
          placeholder="Ex: DG Imports"
          required
        />
      </div>

      <p
        aria-live="polite"
        className="min-h-5 text-destructive text-sm"
        id="onboarding-error"
      >
        {state.error}
      </p>

      <Button className="h-11 w-full" disabled={pending} type="submit">
        {pending ? "Criando..." : "Comecar"}
      </Button>
    </form>
  );
}
