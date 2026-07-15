import { beforeEach, describe, expect, it, vi } from "vitest";

const { authAuditMocks, handlerMocks } = vi.hoisted(() => ({
  authAuditMocks: {
    recordAuthLoginFailureAuditEvent: vi.fn(),
  },
  handlerMocks: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    handler: vi.fn(),
  },
}));

vi.mock("@/lib/auth-audit", () => ({
  recordAuthLoginFailureAuditEvent:
    authAuditMocks.recordAuthLoginFailureAuditEvent,
}));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: vi.fn(() => ({
    GET: handlerMocks.get,
    POST: handlerMocks.post,
  })),
}));

const { GET } = await import("@/app/api/auth/[...all]/route");

describe("Better Auth route audit observation", () => {
  beforeEach(() => {
    authAuditMocks.recordAuthLoginFailureAuditEvent.mockReset();
    authAuditMocks.recordAuthLoginFailureAuditEvent.mockResolvedValue(
      undefined
    );
    handlerMocks.get.mockReset();
    handlerMocks.post.mockReset();
  });

  it("audits a Google callback rejected by the provider without persisting its error", async () => {
    handlerMocks.get.mockResolvedValue(
      Response.redirect("https://app.example.com/sign-in?error=access_denied")
    );

    const response = await GET(
      new Request(
        "https://app.example.com/api/auth/callback/google?error=access_denied"
      )
    );

    expect(response.status).toBe(302);
    expect(
      authAuditMocks.recordAuthLoginFailureAuditEvent
    ).toHaveBeenCalledWith({
      reason: "callback_failed",
    });
  });

  it("does not classify a successful Google callback as a failure", async () => {
    handlerMocks.get.mockResolvedValue(
      Response.redirect("https://app.example.com/onboarding")
    );

    await GET(new Request("https://app.example.com/api/auth/callback/google"));

    expect(
      authAuditMocks.recordAuthLoginFailureAuditEvent
    ).not.toHaveBeenCalled();
  });
});
