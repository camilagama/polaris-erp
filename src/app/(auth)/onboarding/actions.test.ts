import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeOnboardingAction } from "@/app/(auth)/onboarding/actions";

const onboardingMocks = vi.hoisted(() => ({
  createInitialOrganizationForUser: vi.fn(),
  getAppContext: vi.fn(),
  redirect: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: onboardingMocks.redirect,
}));

vi.mock("@/lib/app-session", () => ({
  createInitialOrganizationForUser:
    onboardingMocks.createInitialOrganizationForUser,
  getAppContext: onboardingMocks.getAppContext,
}));

vi.mock("@/lib/session", () => ({
  requireSession: onboardingMocks.requireSession,
}));

const buildFormData = (organizationName: string) => {
  const formData = new FormData();
  formData.set("organizationName", organizationName);
  return formData;
};

describe("completeOnboardingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onboardingMocks.requireSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    onboardingMocks.getAppContext.mockResolvedValue(null);
  });

  it("returns a recoverable validation error without creating an organization", async () => {
    const result = await completeOnboardingAction(
      { error: null },
      buildFormData(" ")
    );

    expect(result).toEqual({
      error: "Informe um nome valido para a organizacao.",
    });
    expect(
      onboardingMocks.createInitialOrganizationForUser
    ).not.toHaveBeenCalled();
    expect(onboardingMocks.redirect).not.toHaveBeenCalled();
  });
});
