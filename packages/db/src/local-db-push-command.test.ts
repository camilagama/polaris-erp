import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const DATABASE_PACKAGE_JSON = new URL("../package.json", import.meta.url);
const ROOT_PACKAGE_JSON = new URL("../../../package.json", import.meta.url);
const WEB_PACKAGE_JSON = new URL(
  "../../../apps/web/package.json",
  import.meta.url
);
const TURBO_CONFIG = new URL("../../../turbo.json", import.meta.url);
const PUSH_CONFIG = new URL("../drizzle.push.config.ts", import.meta.url);

describe("local db:push command contract", () => {
  it("validates its dedicated target before invoking Drizzle", () => {
    const databasePackage = JSON.parse(
      readFileSync(DATABASE_PACKAGE_JSON, "utf8")
    ) as { scripts: Record<string, string> };
    const rootPackage = JSON.parse(readFileSync(ROOT_PACKAGE_JSON, "utf8")) as {
      scripts: Record<string, string>;
    };
    const webPackage = JSON.parse(readFileSync(WEB_PACKAGE_JSON, "utf8")) as {
      scripts: Record<string, string>;
    };
    const turboConfig = JSON.parse(readFileSync(TURBO_CONFIG, "utf8")) as {
      tasks: Record<string, { passThroughEnv?: string[] }>;
    };
    const pushConfig = readFileSync(PUSH_CONFIG, "utf8");

    expect(databasePackage.scripts["db:push"]).toBe(
      "bun ../../scripts/check-local-db-push-target.ts && drizzle-kit push --config=drizzle.push.config.ts"
    );
    expect(rootPackage.scripts["db:push"]).toBe(
      "turbo run db:push --filter=@polaris/db"
    );
    expect(webPackage.scripts["db:push"]).toBe(
      "bun run --cwd ../../packages/db db:push"
    );
    expect(turboConfig.tasks["db:push"].passThroughEnv).toContain(
      "DATABASE_URL_PUSH_LOCAL"
    );
    expect(pushConfig).toContain("validateLocalDbPushTarget");
    expect(pushConfig).toContain("DATABASE_URL_PUSH_LOCAL");
    expect(pushConfig).not.toContain("DATABASE_URL_DIRECT");
  });
});
