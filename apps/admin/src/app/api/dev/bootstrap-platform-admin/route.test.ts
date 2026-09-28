import { afterEach, describe, expect, it, vi } from "vitest";

const importRoute = async ({
  allowBootstrap = "true",
  bootstrapSecret = "bootstrap-secret",
  nodeEnv = "production",
  vercelEnv,
}: {
  allowBootstrap?: string;
  bootstrapSecret?: string;
  nodeEnv?: string;
  vercelEnv?: string;
} = {}) => {
  vi.resetModules();

  const bootstrapPlatformAdmin = vi.fn();
  const callOrder: string[] = [];
  const createPlaywrightPlatformAdminEnrollment = vi.fn(() => {
    callOrder.push("enrollment");
    return Promise.resolve("enrollment-1");
  });
  const internalAdapter = {
    createSession: vi.fn(() => {
      callOrder.push("session");
      return Promise.resolve({ token: "admin-e2e-session" });
    }),
    createUser: vi.fn(
      (user: { email: string; emailVerified: boolean; name: string }) => {
        callOrder.push("user");
        return Promise.resolve({ id: "admin-e2e-user", ...user });
      }
    ),
    findUserByEmail: vi.fn(() => {
      callOrder.push("find-user");
      return Promise.resolve({ user: null });
    }),
  };

  vi.doMock("@polaris/auth/env", () => ({
    serverEnv: {
      ALLOW_PLAYWRIGHT_BOOTSTRAP: allowBootstrap,
      INTERNAL_BOOTSTRAP_SECRET: bootstrapSecret,
      NODE_ENV: nodeEnv,
      VERCEL_ENV: vercelEnv,
    },
  }));
  vi.doMock("@polaris/db", () => ({ db: {} }));
  vi.doMock("@polaris/platform/admin", () => ({
    bootstrapPlatformAdmin,
    createPlaywrightPlatformAdminEnrollment,
  }));
  vi.doMock("@/lib/auth", () => ({
    auth: {
      $context: Promise.resolve({
        authCookies: {
          sessionToken: {
            attributes: {
              httpOnly: true,
              maxAge: 60,
              path: "/",
              sameSite: "lax",
              secure: false,
            },
            name: "polaris_admin.session_token",
          },
        },
        internalAdapter,
        secret: "admin-e2e-unit-test-secret-at-least-32-chars",
      }),
    },
  }));

  const route = await import("./route");

  return {
    bootstrapPlatformAdmin,
    callOrder,
    createPlaywrightPlatformAdminEnrollment,
    internalAdapter,
    POST: route.POST as (request: Request) => Promise<Response>,
  };
};

const createRequest = ({
  authorization = "Bearer bootstrap-secret",
  body = { email: "admin@example.com" },
  hostname = "127.0.0.1",
}: {
  authorization?: string;
  body?: unknown;
  hostname?: string;
} = {}) =>
  new Request(`https://${hostname}/api/dev/bootstrap-platform-admin`, {
    body: JSON.stringify(body),
    headers: { authorization },
    method: "POST",
  });

describe("POST /api/dev/bootstrap-platform-admin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests outside local isolated E2E bootstrap", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://main");
    vi.stubEnv("E2E_DATABASE_URL", "postgres://e2e");
    const {
      bootstrapPlatformAdmin,
      createPlaywrightPlatformAdminEnrollment,
      POST,
    } = await importRoute();

    const response = await POST(
      createRequest({ hostname: "admin.example.com" })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error:
        "Bootstrap admin disponivel apenas para Playwright local/CI com E2E_DATABASE_URL isolado.",
    });
    expect(bootstrapPlatformAdmin).not.toHaveBeenCalled();
    expect(createPlaywrightPlatformAdminEnrollment).not.toHaveBeenCalled();
  });

  it("requires an internal bootstrap secret", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://e2e");
    vi.stubEnv("E2E_DATABASE_URL", "postgres://e2e");
    const {
      bootstrapPlatformAdmin,
      createPlaywrightPlatformAdminEnrollment,
      POST,
    } = await importRoute({ bootstrapSecret: "" });

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Bootstrap admin indisponivel neste ambiente.",
    });
    expect(bootstrapPlatformAdmin).not.toHaveBeenCalled();
    expect(createPlaywrightPlatformAdminEnrollment).not.toHaveBeenCalled();
  });

  it("rejects invalid authorization", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://e2e");
    vi.stubEnv("E2E_DATABASE_URL", "postgres://e2e");
    const {
      bootstrapPlatformAdmin,
      createPlaywrightPlatformAdminEnrollment,
      POST,
    } = await importRoute();

    const response = await POST(
      createRequest({ authorization: "Bearer wrong" })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Nao autorizado." });
    expect(bootstrapPlatformAdmin).not.toHaveBeenCalled();
    expect(createPlaywrightPlatformAdminEnrollment).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads before creating admin records", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://e2e");
    vi.stubEnv("E2E_DATABASE_URL", "postgres://e2e");
    const {
      bootstrapPlatformAdmin,
      createPlaywrightPlatformAdminEnrollment,
      POST,
    } = await importRoute();

    const response = await POST(createRequest({ body: { email: "invalid" } }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Payload invalido." });
    expect(bootstrapPlatformAdmin).not.toHaveBeenCalled();
    expect(createPlaywrightPlatformAdminEnrollment).not.toHaveBeenCalled();
  });

  it("creates an E2E enrollment before creating and admitting a new admin identity", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://e2e");
    vi.stubEnv("E2E_DATABASE_URL", "postgres://e2e");
    const {
      callOrder,
      createPlaywrightPlatformAdminEnrollment,
      internalAdapter,
      POST,
    } = await importRoute();

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(createPlaywrightPlatformAdminEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "admin@example.com",
        role: "owner",
        enrollmentExpiresAt: expect.any(Date),
        grantExpiresAt: expect.any(Date),
      })
    );
    expect(callOrder).toEqual(["find-user", "enrollment", "user", "session"]);
    expect(internalAdapter.createSession).toHaveBeenCalledOnce();
    expect(response.headers.get("set-cookie")).toContain(
      "polaris_admin.session_token="
    );
  });
});
