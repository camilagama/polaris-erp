import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/dev/bootstrap-session/route";

const { authContext, serverEnvMock } = vi.hoisted(() => ({
  authContext: {
    authCookies: {
      sessionToken: {
        attributes: {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
          secure: false,
        },
        name: "better-auth.session_token",
      },
    },
    baseURL: "http://127.0.0.1:3001/api/auth",
    internalAdapter: {
      createSession: vi.fn(),
      createUser: vi.fn(),
      findUserByEmail: vi.fn(),
    },
    secret: "better-auth-secret",
  },
  serverEnvMock: {
    ALLOW_PLAYWRIGHT_BOOTSTRAP: undefined as "false" | "true" | undefined,
    INTERNAL_BOOTSTRAP_SECRET: "bootstrap-secret" as string | undefined,
    NODE_ENV: "test" as "development" | "production" | "test",
    VERCEL_ENV: undefined as
      | "development"
      | "preview"
      | "production"
      | undefined,
  },
}));

const { rateLimitMocks } = vi.hoisted(() => ({
  rateLimitMocks: {
    checkRateLimit: vi.fn(),
  },
}));

vi.mock("@/lib/env", () => ({
  serverEnv: serverEnvMock,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    $context: Promise.resolve(authContext),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: rateLimitMocks.checkRateLimit,
  getRateLimitKeyFromRequest: vi.fn(() => "bootstrap:127.0.0.1"),
}));

describe("POST /api/auth/dev/bootstrap-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverEnvMock.ALLOW_PLAYWRIGHT_BOOTSTRAP = undefined;
    serverEnvMock.INTERNAL_BOOTSTRAP_SECRET = "bootstrap-secret";
    serverEnvMock.NODE_ENV = "test";
    serverEnvMock.VERCEL_ENV = undefined;
    authContext.internalAdapter.findUserByEmail.mockResolvedValue(null);
    authContext.internalAdapter.createUser.mockResolvedValue({
      email: "user@example.com",
      id: "user-1",
      name: "User",
    });
    authContext.internalAdapter.createSession.mockResolvedValue({
      id: "session-1",
      token: "session-token",
    });
    rateLimitMocks.checkRateLimit.mockReset();
    rateLimitMocks.checkRateLimit.mockResolvedValue({
      ok: true,
      remaining: 10,
      resetAt: Date.now() + 60_000,
    });
  });

  it("returns 403 in production without ALLOW_PLAYWRIGHT_BOOTSTRAP", async () => {
    serverEnvMock.NODE_ENV = "production";
    serverEnvMock.ALLOW_PLAYWRIGHT_BOOTSTRAP = undefined;

    const response = await POST(
      new Request("http://localhost/api/auth/dev/bootstrap-session", {
        body: JSON.stringify({
          email: "user@example.com",
          name: "User",
        }),
        headers: {
          Authorization: "Bearer bootstrap-secret",
        },
        method: "POST",
      })
    );

    expect(response.status).toBe(403);
  });

  it("returns 403 in production previews even when ALLOW_PLAYWRIGHT_BOOTSTRAP is true", async () => {
    serverEnvMock.NODE_ENV = "production";
    serverEnvMock.ALLOW_PLAYWRIGHT_BOOTSTRAP = "true";
    serverEnvMock.VERCEL_ENV = "preview";

    const response = await POST(
      new Request("http://localhost/api/auth/dev/bootstrap-session", {
        body: JSON.stringify({
          email: "user@example.com",
          name: "User",
        }),
        headers: {
          Authorization: "Bearer bootstrap-secret",
        },
        method: "POST",
      })
    );

    expect(response.status).toBe(403);
    expect(authContext.internalAdapter.createSession).not.toHaveBeenCalled();
  });

  it("returns 403 in production deployments even when ALLOW_PLAYWRIGHT_BOOTSTRAP is true", async () => {
    serverEnvMock.NODE_ENV = "production";
    serverEnvMock.ALLOW_PLAYWRIGHT_BOOTSTRAP = "true";
    serverEnvMock.VERCEL_ENV = "production";

    const response = await POST(
      new Request("http://localhost/api/auth/dev/bootstrap-session", {
        body: JSON.stringify({
          email: "user@example.com",
          name: "User",
        }),
        headers: {
          Authorization: "Bearer bootstrap-secret",
        },
        method: "POST",
      })
    );

    expect(response.status).toBe(403);
  });

  it("returns 401 when the bearer token is invalid", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/dev/bootstrap-session", {
        body: JSON.stringify({
          email: "user@example.com",
          name: "User",
        }),
        headers: {
          Authorization: "Bearer wrong",
        },
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns 503 when the bootstrap secret is not configured", async () => {
    serverEnvMock.INTERNAL_BOOTSTRAP_SECRET = undefined;

    const response = await POST(
      new Request("http://localhost/api/auth/dev/bootstrap-session", {
        body: JSON.stringify({
          email: "user@example.com",
          name: "User",
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(503);
  });

  it("returns 429 with Retry-After when the bootstrap rate limit is exceeded", async () => {
    rateLimitMocks.checkRateLimit.mockResolvedValueOnce({
      ok: false,
      resetAt: Date.now() + 20_000,
      retryAfterSeconds: 20,
    });

    const response = await POST(
      new Request("http://localhost/api/auth/dev/bootstrap-session", {
        body: JSON.stringify({
          email: "user@example.com",
          name: "User",
        }),
        headers: {
          Authorization: "Bearer wrong",
        },
        method: "POST",
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: "Muitas tentativas. Tente novamente em instantes.",
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("20");
    expect(authContext.internalAdapter.findUserByEmail).not.toHaveBeenCalled();
  });

  it("creates a session cookie when the environment and secret are valid", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/dev/bootstrap-session", {
        body: JSON.stringify({
          email: "user@example.com",
          name: "User",
        }),
        headers: {
          Authorization: "Bearer bootstrap-secret",
        },
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    expect(authContext.internalAdapter.createUser).toHaveBeenCalledWith({
      email: "user@example.com",
      emailVerified: true,
      name: "User",
    });
    expect(authContext.internalAdapter.createSession).toHaveBeenCalledWith(
      "user-1"
    );
    expect(response.headers.get("set-cookie")).toContain(
      "better-auth.session_token="
    );
  });
});
