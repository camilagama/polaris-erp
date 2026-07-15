"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { completeOnboardingAction } from "@/features/onboarding/actions";
import { initialOnboardingActionState } from "@/features/onboarding/state";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initialOnboardingActionState
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <p
        aria-live="polite"
        className="min-h-5 text-destructive text-sm"
        id="onboarding-error"
      >
        {state.error}
      </p>

      <FieldGroup>
        <Field data-invalid={Boolean(state.organizationNameError)}>
          <FieldLabel htmlFor="organizationName">
            Nome da organização
          </FieldLabel>
          <Input
            aria-describedby={
              state.organizationNameError
                ? "organization-name-error"
                : undefined
            }
            aria-invalid={Boolean(state.organizationNameError)}
            autoComplete="organization"
            autoFocus
            id="organizationName"
            maxLength={80}
            name="organizationName"
            placeholder="Ex.: Loja da Ana"
            required
          />
          <p className="text-muted-foreground text-xs">
            Você poderá alterar esse nome depois.
          </p>
          {state.organizationNameError ? (
            <FieldError id="organization-name-error">
              {state.organizationNameError}
            </FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      <Button className="h-11 w-full" disabled={pending} type="submit">
        {pending ? "Criando espaço..." : "Continuar"}
      </Button>
    </form>
  );
}
