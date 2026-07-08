import { describe, expect, it } from "vitest";
import { runDeploymentSmoke } from "@/lib/deployment-smoke";

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });

describe("deployment smoke", () => {
  it("passes when health is ok and internal bootstrap is forbidden", async () => {
    const calls: Array<{
      body?: string;
      method: string;
      redirect?: RequestRedirect;
      url: string;
    }> = [];
    const fetcher = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      calls.push({
        body: typeof init?.body === "string" ? init.body : undefined,
        method: init?.method ?? "GET",
        redirect: init?.redirect,
        url,
      });

      if (url.endsWith("/api/health")) {
        return Promise.resolve(
          jsonResponse({
            checks: { database: { ok: true } },
            ok: true,
          })
        );
      }

      if (url.endsWith("/api/auth/dev/bootstrap-session")) {
        return Promise.resolve(
          jsonResponse({ error: "forbidden" }, { status: 403 })
        );
      }

      if (url.endsWith("/sign-in")) {
        return Promise.resolve(new Response("<html>sign-in</html>"));
      }

      if (url.endsWith("/api/auth/google")) {
        return Promise.resolve(
          Response.redirect("https://accounts.google.com/o/oauth2/v2/auth")
        );
      }

      return Promise.resolve(
        jsonResponse({ error: "unexpected" }, { status: 404 })
      );
    };

    await expect(
      runDeploymentSmoke({
        appUrl: "https://polaris.example.com/",
        fetcher,
      })
    ).resolves.toEqual({
      checks: [
        { name: "health", ok: true, status: 200 },
        { name: "sign-in-page", ok: true, status: 200 },
        { name: "google-oauth-redirect", ok: true, status: 302 },
        { name: "bootstrap-forbidden", ok: true, status: 403 },
      ],
      ok: true,
    });
    expect(calls).toEqual([
      {
        method: "GET",
        redirect: undefined,
        url: "https://polaris.example.com/api/health",
      },
      {
        method: "GET",
        redirect: undefined,
        url: "https://polaris.example.com/sign-in",
      },
      {
        method: "GET",
        redirect: "manual",
        url: "https://polaris.example.com/api/auth/google",
      },
      {
        body: JSON.stringify({
          email: "deployment-smoke@example.invalid",
          name: "Deployment Smoke",
        }),
        method: "POST",
        redirect: undefined,
        url: "https://polaris.example.com/api/auth/dev/bootstrap-session",
      },
    ]);
  });

  it("checks R2 health when a cron secret is provided", async () => {
    const calls: Array<{
      authorization?: string;
      method: string;
      url: string;
    }> = [];
    const fetcher = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      calls.push({
        authorization:
          init?.headers instanceof Headers
            ? (init.headers.get("authorization") ?? undefined)
            : (init?.headers as Record<string, string> | undefined)
                ?.authorization,
        method: init?.method ?? "GET",
        url,
      });

      if (url.endsWith("/api/health")) {
        return Promise.resolve(
          jsonResponse({ checks: { database: { ok: true } }, ok: true })
        );
      }

      if (url.endsWith("/api/auth/dev/bootstrap-session")) {
        return Promise.resolve(
          jsonResponse({ error: "forbidden" }, { status: 403 })
        );
      }

      if (url.endsWith("/sign-in")) {
        return Promise.resolve(new Response("<html>sign-in</html>"));
      }

      if (url.endsWith("/api/auth/google")) {
        return Promise.resolve(
          Response.redirect("https://accounts.google.com/o/oauth2/v2/auth")
        );
      }

      if (url.endsWith("/api/internal/health/r2")) {
        return Promise.resolve(jsonResponse({ ok: true }));
      }

      return Promise.resolve(
        jsonResponse({ error: "unexpected" }, { status: 404 })
      );
    };

    await expect(
      runDeploymentSmoke({
        appUrl: "https://polaris.example.com",
        cronSecret: "cron-secret",
        fetcher,
      })
    ).resolves.toEqual({
      checks: [
        { name: "health", ok: true, status: 200 },
        { name: "sign-in-page", ok: true, status: 200 },
        { name: "google-oauth-redirect", ok: true, status: 302 },
        { name: "bootstrap-forbidden", ok: true, status: 403 },
        { name: "r2-health", ok: true, status: 200 },
      ],
      ok: true,
    });
    expect(calls.at(-1)).toEqual({
      authorization: "Bearer cron-secret",
      method: "GET",
      url: "https://polaris.example.com/api/internal/health/r2",
    });
  });

  it("fails when the health endpoint is unhealthy", async () => {
    const fetcher = () =>
      Promise.resolve(
        jsonResponse({ checks: { database: { ok: false } }, ok: false })
      );

    await expect(
      runDeploymentSmoke({
        appUrl: "https://polaris.example.com",
        fetcher,
      })
    ).resolves.toMatchObject({
      checks: [
        {
          name: "health",
          ok: false,
          status: 200,
        },
      ],
      ok: false,
    });
  });

  it("rejects invalid deployment URLs", async () => {
    await expect(
      runDeploymentSmoke({
        appUrl: "not a url",
        fetcher: fetch,
      })
    ).rejects.toThrow("DEPLOYMENT_SMOKE_URL precisa ser uma URL http(s).");
  });
});
