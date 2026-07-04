import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMocks, serverEnvMock } = vi.hoisted(() => ({
  authMocks: {
    handler: vi.fn(),
  },
  serverEnvMock: {
    BETTER_AUTH_URL: "https://app.example.com",
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    handler: authMocks.handler,
  },
}));

vi.mock("@/lib/env", () => ({
  serverEnv: serverEnvMock,
}));

vi.mock("server-only", () => ({}));

const { GET } = await import("@/app/api/auth/google/route");

const createRequest = (url: string) => new NextRequest(url);

describe("GET /api/auth/google", () => {
  beforeEach(() => {
    authMocks.handler.mockReset();
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
});
