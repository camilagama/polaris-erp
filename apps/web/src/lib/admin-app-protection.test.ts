import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const adminPageSource = readFileSync(
  join(process.cwd(), "..", "admin", "src", "app", "page.tsx"),
  "utf8"
);
const adminForbiddenSource = readFileSync(
  join(process.cwd(), "..", "admin", "src", "app", "forbidden.tsx"),
  "utf8"
);

describe("admin app protection", () => {
  it("guards the admin root route with platform admin authorization", () => {
    expect(adminPageSource).toContain("requirePlatformAdmin");
    expect(adminPageSource).toContain("getPlatformDashboardData");
    expect(adminPageSource).toContain("forbidden()");
    expect(adminPageSource).toContain("await connection()");
    expect(adminPageSource).not.toContain("notFound()");
  });

  it("renders a dedicated forbidden state for denied internal access", () => {
    expect(adminForbiddenSource).toContain("Acesso negado");
    expect(adminForbiddenSource).toContain("platform admin");
    expect(adminForbiddenSource).toContain("Cloudflare Access");
  });
});
