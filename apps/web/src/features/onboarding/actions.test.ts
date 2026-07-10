import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeOnboardingAction } from "@/features/onboarding/actions";

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

describe("completeOnboardingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onboardingMocks.requireSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    onboardingMocks.getAppContext.mockResolvedValue(null);
  });

  it("creates the initial tenant with billing email before redirecting", async () => {
    onboardingMocks.requireSession.mockResolvedValue({
      user: {
        email: "owner@example.com",
        id: "user-1",
        name: "Owner",
      },
    });

    await completeOnboardingAction({ error: null }, new FormData());

    expect(
      onboardingMocks.createInitialOrganizationForUser
    ).toHaveBeenCalledWith({
      billingEmail: "owner@example.com",
      userId: "user-1",
    });
    expect(onboardingMocks.redirect).toHaveBeenCalledWith("/");
  });
});
