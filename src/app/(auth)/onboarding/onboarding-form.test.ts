// @vitest-environment jsdom

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
  useActionState: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();

  return {
    ...actual,
    useActionState: reactMocks.useActionState,
  };
});

vi.mock("@/app/(auth)/onboarding/actions", () => ({
  completeOnboardingAction: vi.fn(),
  initialOnboardingActionState: { error: null },
}));

const DISABLED_BUTTON_ATTRIBUTE_PATTERN = /<button[^>]*\sdisabled(?:=|>|\s)/;

describe("OnboardingForm", () => {
  afterEach(() => {
    reactMocks.useActionState.mockReset();
  });

  it("shows recoverable errors and disables submit while pending", async () => {
    const { OnboardingForm } = await import(
      "@/app/(auth)/onboarding/onboarding-form"
    );
    const formAction = vi.fn();
    reactMocks.useActionState.mockReturnValue([
      { error: "Informe um nome valido para a organizacao." },
      formAction,
      true,
    ]);

    const markup = renderToStaticMarkup(
      createElement(OnboardingForm, {
        defaultOrganizationName: "Polaris",
      })
    );

    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Informe um nome valido para a organizacao.");
    expect(markup).toContain("Criando...");
    expect(markup).toMatch(DISABLED_BUTTON_ATTRIBUTE_PATTERN);
  });
});
