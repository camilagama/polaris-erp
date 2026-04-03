import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signUpEmail: vi.fn(),
    },
  },
}));

const importRoute = (serverEnv: {
  ENABLE_INTERNAL_BOOTSTRAP?: "false" | "true";
  INTERNAL_BOOTSTRAP_SECRET?: string;
  NODE_ENV: "development" | "production" | "test";
}) => {
  vi.resetModules();
  vi.doMock("@/lib/env", () => ({
    serverEnv,
  }));

  return import("@/app/api/internal/auth/bootstrap-user/route");
};

describe("POST /api/internal/auth/bootstrap-user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 outside development and test", async () => {
    const { POST } = await importRoute({
      ENABLE_INTERNAL_BOOTSTRAP: "false",
      INTERNAL_BOOTSTRAP_SECRET: "bootstrap-secret",
      NODE_ENV: "production",
    });

    const response = await POST(
      new Request("http://localhost/api/internal/auth/bootstrap-user", {
        body: JSON.stringify({
          email: "user@example.com",
          name: "User",
          password: "password-123",
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
    const { POST } = await importRoute({
      ENABLE_INTERNAL_BOOTSTRAP: "false",
      INTERNAL_BOOTSTRAP_SECRET: "bootstrap-secret",
      NODE_ENV: "test",
    });

    const response = await POST(
      new Request("http://localhost/api/internal/auth/bootstrap-user", {
        body: JSON.stringify({
          email: "user@example.com",
          name: "User",
          password: "password-123",
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
    const { POST } = await importRoute({
      ENABLE_INTERNAL_BOOTSTRAP: "false",
      INTERNAL_BOOTSTRAP_SECRET: undefined,
      NODE_ENV: "test",
    });

    const response = await POST(
      new Request("http://localhost/api/internal/auth/bootstrap-user", {
        body: JSON.stringify({
          email: "user@example.com",
          name: "User",
          password: "password-123",
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(503);
  });

  it("creates the user when the environment and secret are valid", async () => {
    const { POST } = await importRoute({
      ENABLE_INTERNAL_BOOTSTRAP: "false",
      INTERNAL_BOOTSTRAP_SECRET: "bootstrap-secret",
      NODE_ENV: "test",
    });
    const { auth } = await import("@/lib/auth");

    const response = await POST(
      new Request("http://localhost/api/internal/auth/bootstrap-user", {
        body: JSON.stringify({
          email: "user@example.com",
          name: "User",
          password: "password-123",
        }),
        headers: {
          Authorization: "Bearer bootstrap-secret",
        },
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    expect(auth.api.signUpEmail).toHaveBeenCalledWith({
      body: {
        email: "user@example.com",
        name: "User",
        password: "password-123",
      },
    });
  });
});
