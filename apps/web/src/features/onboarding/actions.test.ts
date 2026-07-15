import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeOnboardingAction } from "@/features/onboarding/actions";

const onboardingMocks = vi.hoisted(() => ({
  createInitialOrganizationForUser: vi.fn(),
  getAppAccess: vi.fn(),
  getAppContext: vi.fn(),
  redirect: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: onboardingMocks.redirect,
}));

vi.mock("@/features/onboarding/server", () => ({
  createInitialOrganizationForUser:
    onboardingMocks.createInitialOrganizationForUser,
}));

vi.mock("@/lib/app-session", () => ({
  getAppAccess: onboardingMocks.getAppAccess,
  getAppContext: onboardingMocks.getAppContext,
}));

vi.mock("@/lib/session", () => ({
  requireSession: onboardingMocks.requireSession,
}));

describe("completeOnboardingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onboardingMocks.requireSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    onboardingMocks.getAppContext.mockResolvedValue(null);
    onboardingMocks.getAppAccess.mockResolvedValue({ kind: "onboarding" });
    onboardingMocks.createInitialOrganizationForUser.mockResolvedValue({
      organizationId: "org-1",
      planId: "polaris-free",
    });
  });

  it("creates the initial tenant with billing email before redirecting", async () => {
    onboardingMocks.requireSession.mockResolvedValue({
      user: {
        email: "owner@example.com",
        id: "user-1",
        name: "Owner",
      },
    });
    const formData = new FormData();
    formData.set("organizationName", "Loja do cliente");

    await completeOnboardingAction(
      { error: null, organizationNameError: null },
      formData
    );

    expect(
      onboardingMocks.createInitialOrganizationForUser
    ).toHaveBeenCalledWith({
      billingEmail: "owner@example.com",
      organizationName: "Loja do cliente",
      userId: "user-1",
    });
    expect(onboardingMocks.redirect).toHaveBeenCalledWith(
      "/onboarding?step=plan"
    );
  });

  it("returns a validation error when organization name is missing", async () => {
    const result = await completeOnboardingAction(
      { error: null, organizationNameError: null },
      new FormData()
    );

    expect(
      onboardingMocks.createInitialOrganizationForUser
    ).not.toHaveBeenCalled();
    expect(onboardingMocks.redirect).not.toHaveBeenCalled();
    expect(result.organizationNameError).toBeTruthy();
  });

  it("skips the plan selection screen when a paid signup intent was claimed", async () => {
    onboardingMocks.createInitialOrganizationForUser.mockResolvedValue({
      organizationId: "org-paid",
      planId: "polaris-paid-monthly",
    });
    const formData = new FormData();
    formData.set("organizationName", "Loja paga");

    await completeOnboardingAction(
      { error: null, organizationNameError: null },
      formData
    );

    expect(onboardingMocks.redirect).toHaveBeenCalledWith("/");
  });

  it("does not create a tenant for a suspended account", async () => {
    onboardingMocks.getAppAccess.mockResolvedValue({ kind: "suspended" });

    const formData = new FormData();
    formData.set("organizationName", "Loja da Ana");
    await completeOnboardingAction(
      { error: null, organizationNameError: null },
      formData
    );

    expect(
      onboardingMocks.createInitialOrganizationForUser
    ).not.toHaveBeenCalled();
    expect(onboardingMocks.redirect).toHaveBeenCalledWith("/restricted-access");
  });
});
