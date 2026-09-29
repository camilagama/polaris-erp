import { describe, expect, it } from "vitest";
import { validateLocalDbPushTarget } from "./local-db-push-target";

describe("validateLocalDbPushTarget", () => {
  it("fails closed when its dedicated URL is missing or malformed", () => {
    expect(() => validateLocalDbPushTarget({})).toThrow(
      "DATABASE_URL_PUSH_LOCAL is required"
    );
    expect(() =>
      validateLocalDbPushTarget({ DATABASE_URL_PUSH_LOCAL: "not-a-url" })
    ).toThrow("must be a valid PostgreSQL URL");
    expect(() =>
      validateLocalDbPushTarget({
        DATABASE_URL_PUSH_LOCAL:
          "mysql://postgres:synthetic-password@localhost/polaris_push_scratch",
      })
    ).toThrow("must be a valid PostgreSQL URL");
  });

  it("accepts a dedicated loopback PostgreSQL scratch database", () => {
    expect(() =>
      validateLocalDbPushTarget({
        DATABASE_URL_PUSH_LOCAL:
          "postgresql://postgres:synthetic-password@localhost:5432/polaris_push_scratch",
      })
    ).not.toThrow();
  });

  it.each(["127.0.0.1", "[::1]"])("accepts the loopback address %s", (host) => {
    expect(() =>
      validateLocalDbPushTarget({
        DATABASE_URL_PUSH_LOCAL: `postgresql://postgres:synthetic-password@${host}:5432/polaris_push_scratch`,
      })
    ).not.toThrow();
  });

  it("rejects a remote Neon endpoint", () => {
    expect(() =>
      validateLocalDbPushTarget({
        DATABASE_URL_PUSH_LOCAL:
          "postgresql://postgres:synthetic-password@ep-test-123.sa-east-1.aws.neon.tech/polaris_push_scratch",
      })
    ).toThrow("must use localhost, 127.0.0.1, or ::1");
  });

  it("rejects reusing the runtime database even when the credentials differ", () => {
    expect(() =>
      validateLocalDbPushTarget({
        DATABASE_URL:
          "postgresql://polaris_app:runtime-password@localhost:5432/polaris_push_scratch",
        DATABASE_URL_PUSH_LOCAL:
          "postgresql://postgres:synthetic-password@localhost/polaris_push_scratch",
      })
    ).toThrow("must be separate from DATABASE_URL");
  });

  it("normalizes loopback aliases when checking the runtime target", () => {
    expect(() =>
      validateLocalDbPushTarget({
        DATABASE_URL:
          "postgresql://polaris_app:runtime-password@127.0.0.1:5432/polaris_push_scratch",
        DATABASE_URL_PUSH_LOCAL:
          "postgresql://postgres:synthetic-password@localhost/polaris_push_scratch",
      })
    ).toThrow("must be separate from DATABASE_URL");
  });

  it("rejects reusing the migration database", () => {
    expect(() =>
      validateLocalDbPushTarget({
        DATABASE_URL_DIRECT:
          "postgresql://migrator:another-password@[::1]:5432/polaris_push_scratch",
        DATABASE_URL_PUSH_LOCAL:
          "postgresql://postgres:synthetic-password@localhost/polaris_push_scratch",
      })
    ).toThrow("must be separate from DATABASE_URL_DIRECT");
  });

  it("requires the reserved scratch database name", () => {
    expect(() =>
      validateLocalDbPushTarget({
        DATABASE_URL_PUSH_LOCAL:
          "postgresql://postgres:synthetic-password@localhost:5432/polaris_behavior",
      })
    ).toThrow("must target polaris_push_scratch");
  });

  it("does not echo a rejected URL or credentials", () => {
    const secret = "synthetic-password";
    const remoteUrl =
      "postgresql://postgres:synthetic-password@ep-test-123.sa-east-1.aws.neon.tech/polaris_push_scratch";
    let message = "";

    try {
      validateLocalDbPushTarget({ DATABASE_URL_PUSH_LOCAL: remoteUrl });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("localhost, 127.0.0.1, or ::1");
    expect(message).not.toContain(secret);
    expect(message).not.toContain("postgresql://");
  });
});
