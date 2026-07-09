import { describe, expect, it } from "vitest";
import { getSentrySamplingConfig } from "@/lib/sentry-config";

describe("getSentrySamplingConfig", () => {
  it("enables low production tracing and error-only replay by default", () => {
    expect(
      getSentrySamplingConfig({
        nodeEnv: "production",
      })
    ).toEqual({
      replaysOnErrorSampleRate: 1,
      replaysSessionSampleRate: 0,
      tracesSampleRate: 0.1,
    });
  });

  it("uses full tracing in development without recording normal sessions", () => {
    expect(
      getSentrySamplingConfig({
        nodeEnv: "development",
      })
    ).toEqual({
      replaysOnErrorSampleRate: 1,
      replaysSessionSampleRate: 0,
      tracesSampleRate: 1,
    });
  });

  it("accepts bounded numeric overrides", () => {
    expect(
      getSentrySamplingConfig({
        nodeEnv: "production",
        replaysOnErrorSampleRate: "0.5",
        replaysSessionSampleRate: "0.05",
        tracesSampleRate: "0.25",
      })
    ).toEqual({
      replaysOnErrorSampleRate: 0.5,
      replaysSessionSampleRate: 0.05,
      tracesSampleRate: 0.25,
    });
  });

  it("ignores invalid overrides", () => {
    expect(
      getSentrySamplingConfig({
        nodeEnv: "production",
        replaysOnErrorSampleRate: "2",
        replaysSessionSampleRate: "-1",
        tracesSampleRate: "banana",
      })
    ).toEqual({
      replaysOnErrorSampleRate: 1,
      replaysSessionSampleRate: 0,
      tracesSampleRate: 0.1,
    });
  });
});
