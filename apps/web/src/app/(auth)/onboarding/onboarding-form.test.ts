// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { join } from "node:path";
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

vi.mock("@/features/onboarding/actions", () => ({
  completeOnboardingAction: vi.fn(),
  initialOnboardingActionState: { error: null },
}));

const DISABLED_BUTTON_ATTRIBUTE_PATTERN = /<button[^>]*\sdisabled(?:=|>|\s)/;

describe("OnboardingForm", () => {
  afterEach(() => {
    reactMocks.useActionState.mockReset();
  });

  it("collects an organization name before creating the Free workspace", async () => {
    const { OnboardingForm } = await import(
      "@/app/(auth)/onboarding/onboarding-form"
    );
    const formAction = vi.fn();
    reactMocks.useActionState.mockReturnValue([
      { error: "Nao foi possivel iniciar sua conta." },
      formAction,
      true,
    ]);

    const markup = renderToStaticMarkup(createElement(OnboardingForm));

    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('name="organizationName"');
    expect(markup).toContain('autoComplete="organization"');
    expect(markup).toContain("Nome da organização");
    expect(markup).toContain("Nao foi possivel iniciar sua conta.");
    expect(markup).toContain("Criando espaço...");
    expect(markup).toMatch(DISABLED_BUTTON_ATTRIBUTE_PATTERN);
  });

  it("keeps onboarding server actions outside the route tree", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "(auth)",
        "onboarding",
        "onboarding-form.tsx"
      ),
      "utf8"
    );

    expect(source).toContain('from "@/features/onboarding/actions"');
    expect(source).not.toContain('from "./actions"');
  });
});
