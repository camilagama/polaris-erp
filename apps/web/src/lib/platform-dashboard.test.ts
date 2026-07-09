import { getPlatformDashboardData } from "@polaris/platform/dashboard";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { healthMock } = vi.hoisted(() => ({
  healthMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@polaris/db", () => ({
  db: {
    execute: healthMock,
  },
}));

const createDbMock = () => {
  const execute = vi
    .fn()
    .mockResolvedValueOnce({
      rows: [
        {
          active_organizations: "8",
          disabled_platform_admins: "1",
          members: "14",
          organizations: "10",
          platform_admins: "2",
          users: "12",
        },
      ],
    })
    .mockResolvedValueOnce({
      rows: [
        {
          action: "should-not-leak",
          actor_user_id: "user-secret",
          count: null,
          label: "platform_admin.bootstrap",
          metadata: { token: "secret" },
          occurred_at: new Date("2026-07-09T12:00:00.000Z"),
          source: "platform",
          subject_id: "subject-secret",
        },
        {
          count: "3",
          label: "sale.created",
          occurred_at: "2026-07-09T10:00:00.000Z",
          source: "tenant",
        },
      ],
    });

  return { execute };
};

describe("getPlatformDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PRODUCT_IMAGE_RECONCILE_SECRET = "reconcile-secret";
    process.env.R2_ACCESS_KEY_ID = "access-key";
    process.env.R2_ACCOUNT_ID = "account-id";
    process.env.R2_BUCKET_PUBLIC = "public-bucket";
    process.env.R2_BUCKET_STAGING = "staging-bucket";
    process.env.R2_SECRET_ACCESS_KEY = "secret-key";
    healthMock.mockResolvedValue(true);
  });

  it("returns aggregate operational data without exposing sensitive event fields", async () => {
    const data = await getPlatformDashboardData(createDbMock());

    expect(data.summary).toEqual({
      activeOrganizations: 8,
      disabledPlatformAdmins: 1,
      members: 14,
      organizations: 10,
      platformAdmins: 2,
      users: 12,
    });
    expect(data.health).toEqual({
      database: true,
      productImageReconcileSecret: true,
      r2: true,
    });
    expect(data.events).toEqual([
      {
        count: undefined,
        label: "platform_admin.bootstrap",
        occurredAt: "2026-07-09T12:00:00.000Z",
        source: "platform",
      },
      {
        count: 3,
        label: "sale.created",
        occurredAt: "2026-07-09T10:00:00.000Z",
        source: "tenant",
      },
    ]);
    expect(JSON.stringify(data)).not.toContain("secret");
    expect(JSON.stringify(data)).not.toContain("actor_user_id");
    expect(JSON.stringify(data)).not.toContain("metadata");
  });
});
