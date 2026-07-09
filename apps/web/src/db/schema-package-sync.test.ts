import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = join(process.cwd(), "..", "..");

describe("@polaris/db schema sync", () => {
  it("keeps the shared package schema identical to the current web schema", () => {
    const webSchema = readFileSync(
      join(workspaceRoot, "apps/web/src/db/schema.ts"),
      "utf8"
    );
    const packageSchema = readFileSync(
      join(workspaceRoot, "packages/db/src/schema.ts"),
      "utf8"
    );

    expect(packageSchema).toBe(webSchema);
  });
});
