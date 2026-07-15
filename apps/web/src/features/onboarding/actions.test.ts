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
    formData.set("workspaceName", "Cliente nao deve controlar isso");

    await completeOnboardingAction({ error: null }, formData);

    expect(
      onboardingMocks.createInitialOrganizationForUser
    ).toHaveBeenCalledWith({
      billingEmail: "owner@example.com",
      userId: "user-1",
    });
    expect(onboardingMocks.redirect).toHaveBeenCalledWith("/");
  });

  it("does not require a workspace name", async () => {
    const result = await completeOnboardingAction(
      { error: null },
      new FormData()
    );

    expect(
      onboardingMocks.createInitialOrganizationForUser
    ).toHaveBeenCalledWith({
      billingEmail: undefined,
      userId: "user-1",
    });
    expect(onboardingMocks.redirect).toHaveBeenCalledWith("/");
    expect(result).toBeUndefined();
  });

  it("does not create a tenant for a suspended account", async () => {
    onboardingMocks.getAppAccess.mockResolvedValue({ kind: "suspended" });

    await completeOnboardingAction({ error: null }, new FormData());

    expect(
      onboardingMocks.createInitialOrganizationForUser
    ).not.toHaveBeenCalled();
    expect(onboardingMocks.redirect).toHaveBeenCalledWith("/restricted-access");
  });
});
