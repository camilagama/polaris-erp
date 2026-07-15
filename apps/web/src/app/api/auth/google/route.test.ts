import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authAuditMocks, authMocks, rateLimitMocks, serverEnvMock } = vi.hoisted(
  () => ({
    authAuditMocks: {
      recordAuthLoginFailureAuditEvent: vi.fn(),
    },
    authMocks: {
      handler: vi.fn(),
    },
    rateLimitMocks: {
      checkRateLimit: vi.fn(),
    },
    serverEnvMock: {
      BETTER_AUTH_URL: "https://app.example.com",
    },
  })
);

vi.mock("@/lib/auth", () => ({
  auth: {
    handler: authMocks.handler,
  },
}));

vi.mock("@/lib/auth-audit", () => ({
  recordAuthLoginFailureAuditEvent:
    authAuditMocks.recordAuthLoginFailureAuditEvent,
}));

vi.mock("@/lib/env", () => ({
  serverEnv: serverEnvMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: rateLimitMocks.checkRateLimit,
  getRateLimitKeyFromRequest: vi.fn(() => "auth-google:127.0.0.1"),
}));

vi.mock("server-only", () => ({}));

const { GET } = await import("@/app/api/auth/google/route");

const createRequest = (url: string) => new NextRequest(url);

describe("GET /api/auth/google", () => {
  beforeEach(() => {
    authAuditMocks.recordAuthLoginFailureAuditEvent.mockReset();
    authAuditMocks.recordAuthLoginFailureAuditEvent.mockResolvedValue(
      undefined
    );
    authMocks.handler.mockReset();
    rateLimitMocks.checkRateLimit.mockReset();
    rateLimitMocks.checkRateLimit.mockResolvedValue({
      ok: true,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });
    serverEnvMock.BETTER_AUTH_URL = "https://app.example.com";
  });

  it("redirects to the canonical Better Auth origin before starting OAuth", async () => {
    const response = await GET(
      createRequest("http://localhost:3000/api/auth/google?callbackUrl=%2F")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/api/auth/google?callbackUrl=%2F"
    );
    expect(authMocks.handler).not.toHaveBeenCalled();
  });

  it("starts Google OAuth on the canonical origin and preserves the state cookie", async () => {
    authMocks.handler.mockResolvedValue(
      new Response(
        JSON.stringify({
          url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=google",
        }),
        {
          headers: {
            "content-type": "application/json",
            "set-cookie": "__Secure-better-auth.state=state-token; Path=/",
          },
        }
      )
    );

    const response = await GET(
      createRequest(
        "https://app.example.com/api/auth/google?callbackUrl=%2Fprodutos"
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=google"
    );
    expect(response.headers.get("set-cookie")).toContain(
      "__Secure-better-auth.state=state-token"
    );
    expect(authMocks.handler).toHaveBeenCalledOnce();

    const [authRequest] = authMocks.handler.mock.calls[0] as [Request];
    expect(authRequest.method).toBe("POST");
    expect(authRequest.headers.get("origin")).toBe("https://app.example.com");
    await expect(authRequest.json()).resolves.toMatchObject({
      callbackURL: "/produtos",
      newUserCallbackURL: "/onboarding",
      provider: "google",
      requestSignUp: true,
    });
  });

  it("treats forwarded tunnel headers as the public canonical origin", async () => {
    authMocks.handler.mockResolvedValue(
      Response.json({
        url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=google",
      })
    );

    const response = await GET(
      new NextRequest("http://localhost:3000/api/auth/google?callbackUrl=%2F", {
        headers: {
          "x-forwarded-host": "app.example.com",
          "x-forwarded-proto": "https",
        },
      })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=google"
    );
    expect(authMocks.handler).toHaveBeenCalledOnce();

    const [authRequest] = authMocks.handler.mock.calls[0] as [Request];
    expect(authRequest.url).toBe(
      "https://app.example.com/api/auth/sign-in/social"
    );
    expect(authRequest.headers.get("origin")).toBe("https://app.example.com");
  });

  it("returns 429 before starting OAuth when the route rate limit is exceeded", async () => {
    rateLimitMocks.checkRateLimit.mockResolvedValue({
      ok: false,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
    });

    const response = await GET(
      createRequest(
        "https://app.example.com/api/auth/google?callbackUrl=%2Fprodutos"
      )
    );

    await expect(response.json()).resolves.toEqual({
      error: "Muitas tentativas de login. Tente novamente em instantes.",
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(authMocks.handler).not.toHaveBeenCalled();
    expect(
      authAuditMocks.recordAuthLoginFailureAuditEvent
    ).toHaveBeenCalledWith({
      reason: "rate_limited",
    });
  });

  it("redirects to sign-in with a sanitized error when Better Auth throws", async () => {
    authMocks.handler.mockRejectedValueOnce(
      new Error("google client secret leaked")
    );

    const response = await GET(
      createRequest(
        "https://app.example.com/api/auth/google?callbackUrl=%2Fprodutos"
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/sign-in?error=google_oauth_unavailable"
    );
    expect(
      authAuditMocks.recordAuthLoginFailureAuditEvent
    ).toHaveBeenCalledWith({
      reason: "initiation_failed",
    });
  });
});
