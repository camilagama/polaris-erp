import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Inngest route", () => {
  it("serves registered Inngest functions through the App Router", () => {
    const routeSource = readFileSync(
      join(process.cwd(), "src", "app", "api", "inngest", "route.ts"),
      "utf8"
    );

    expect(routeSource).toContain('from "inngest/next"');
    expect(routeSource).toContain("serve({");
    expect(routeSource).toContain("inngestFunctions");
    expect(routeSource).toContain("maxDuration = 300");
  });
});
