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

describe("POST /api/auth/dev/bootstrap-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverEnvMock.ALLOW_PLAYWRIGHT_BOOTSTRAP = undefined;
    serverEnvMock.INTERNAL_BOOTSTRAP_SECRET = "bootstrap-secret";
    serverEnvMock.NODE_ENV = "test";
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

  it("allows bootstrap in production when ALLOW_PLAYWRIGHT_BOOTSTRAP is true", async () => {
    serverEnvMock.NODE_ENV = "production";
    serverEnvMock.ALLOW_PLAYWRIGHT_BOOTSTRAP = "true";

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
