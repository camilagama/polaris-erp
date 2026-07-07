"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  completeOnboardingAction,
  initialOnboardingActionState,
} from "@/features/onboarding/actions";

interface OnboardingFormProps {
  defaultOrganizationName: string;
}

export function OnboardingForm({
  defaultOrganizationName,
}: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initialOnboardingActionState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="organizationName">Nome da organizacao</Label>
        <Input
          aria-describedby={state.error ? "onboarding-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          autoComplete="organization"
          defaultValue={defaultOrganizationName}
          disabled={pending}
          id="organizationName"
          minLength={2}
          name="organizationName"
          placeholder="Minha loja"
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
