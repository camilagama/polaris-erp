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

  vi.doMock("@polaris/auth/env", () => ({
    serverEnv: {
      ALLOW_PLAYWRIGHT_BOOTSTRAP: allowBootstrap,
      INTERNAL_BOOTSTRAP_SECRET: bootstrapSecret,
      NODE_ENV: nodeEnv,
      VERCEL_ENV: vercelEnv,
    },
  }));
  vi.doMock("@polaris/db", () => ({ db: {} }));
  vi.doMock("@polaris/platform/admin", () => ({ bootstrapPlatformAdmin }));
  vi.doMock("@/lib/auth", () => ({
    auth: {
      $context: Promise.resolve({
        internalAdapter: {
          createSession: vi.fn(() => {
            throw new Error("createSession should not be used");
          }),
          createUser: vi.fn(() => {
            throw new Error("createUser should not be used");
          }),
          findUserByEmail: vi.fn(() => {
            throw new Error("findUserByEmail should not be used");
          }),
        },
      }),
    },
  }));

  const route = await import("./route");

  return {
    bootstrapPlatformAdmin,
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
    const { bootstrapPlatformAdmin, POST } = await importRoute();

    const response = await POST(
      createRequest({ hostname: "admin.example.com" })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error:
        "Bootstrap admin disponivel apenas para Playwright local/CI com E2E_DATABASE_URL isolado.",
    });
    expect(bootstrapPlatformAdmin).not.toHaveBeenCalled();
  });

  it("requires an internal bootstrap secret", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://e2e");
    vi.stubEnv("E2E_DATABASE_URL", "postgres://e2e");
    const { bootstrapPlatformAdmin, POST } = await importRoute({
      bootstrapSecret: "",
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Bootstrap admin indisponivel neste ambiente.",
    });
    expect(bootstrapPlatformAdmin).not.toHaveBeenCalled();
  });

  it("rejects invalid authorization", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://e2e");
    vi.stubEnv("E2E_DATABASE_URL", "postgres://e2e");
    const { bootstrapPlatformAdmin, POST } = await importRoute();

    const response = await POST(
      createRequest({ authorization: "Bearer wrong" })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Nao autorizado." });
    expect(bootstrapPlatformAdmin).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads before creating admin records", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://e2e");
    vi.stubEnv("E2E_DATABASE_URL", "postgres://e2e");
    const { bootstrapPlatformAdmin, POST } = await importRoute();

    const response = await POST(createRequest({ body: { email: "invalid" } }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Payload invalido." });
    expect(bootstrapPlatformAdmin).not.toHaveBeenCalled();
  });
});
