import {
  getPlatformOrganizationDetail,
  getPlatformUserDetail,
  listPlatformOrganizations,
  listPlatformUsers,
  redactEmail,
} from "@polaris/platform/directory";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sensitiveValues = [
  "session-token-secret",
  "access-token-secret",
  "refresh-token-secret",
  "id-token-secret",
  "password-secret",
  "raw-secret",
] as const;

describe("platform directory redaction", () => {
  it("redacts customer emails", () => {
    expect(redactEmail("junior@example.com")).toBe("j***@example.com");
    expect(redactEmail("invalid-email")).toBe("[redacted]");
  });

  it("lists users without returning auth tokens or raw email addresses", async () => {
    const execute = vi.fn().mockResolvedValueOnce({
      rows: [
        {
          access_token: "access-token-secret",
          created_at: new Date("2026-07-09T12:00:00.000Z"),
          email: "customer@example.com",
          id: "user-1",
          id_token: "id-token-secret",
          latest_session_at: new Date("2026-07-09T12:30:00.000Z"),
          name: "Customer One",
          organization_count: "2",
          password: "password-secret",
          provider_ids: ["google"],
          refresh_token: "refresh-token-secret",
          secret: "raw-secret",
          session_count: "3",
          token: "session-token-secret",
        },
      ],
    });

    const users = await listPlatformUsers("customer@example.com", { execute });
    const serialized = JSON.stringify(users);

    expect(users).toEqual([
      {
        createdAt: "2026-07-09T12:00:00.000Z",
        email: "c***@example.com",
        id: "user-1",
        latestSessionAt: "2026-07-09T12:30:00.000Z",
        name: "Customer One",
        organizationCount: 2,
        providerIds: ["google"],
        sessionCount: 3,
      },
    ]);
    expect(serialized).not.toContain("customer@example.com");
    for (const value of sensitiveValues) {
      expect(serialized).not.toContain(value);
    }
  });

  it("lists organizations by tenant identity without returning customer names or slugs", async () => {
    const execute = vi.fn().mockResolvedValueOnce({
      rows: [
        {
          created_at: new Date("2026-07-09T10:00:00.000Z"),
          fallback_member_email: "operator@example.com",
          id: "org-1",
          member_count: "1",
          name: "Importadora",
          owner_email: "owner@example.com",
          product_count: "5",
          sale_count: "8",
          slug: "importadora",
          status: "active",
          updated_at: new Date("2026-07-09T11:00:00.000Z"),
        },
      ],
    });

    const organizations = await listPlatformOrganizations("owner@example.com", {
      execute,
    });
    const serialized = JSON.stringify(organizations);

    expect(organizations).toEqual([
      {
        counts: {
          members: 1,
          products: 5,
          sales: 8,
        },
        createdAt: "2026-07-09T10:00:00.000Z",
        id: "org-1",
        primaryMemberEmail: "o***@example.com",
        status: "active",
        updatedAt: "2026-07-09T11:00:00.000Z",
      },
    ]);
    expect(serialized).not.toContain("Importadora");
    expect(serialized).not.toContain("importadora");
    expect(serialized).not.toContain("owner@example.com");
  });

  it("returns organization details with redacted members and session summary only", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            created_at: "2026-07-09T10:00:00.000Z",
            fallback_member_email: "operator@example.com",
            id: "org-1",
            member_count: "1",
            name: "Importadora",
            owner_email: "owner@example.com",
            product_count: "5",
            sale_count: "8",
            slug: "importadora",
            status: "active",
            updated_at: "2026-07-09T11:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            access_token: "access-token-secret",
            created_at: "2026-07-09T10:30:00.000Z",
            email: "owner@example.com",
            id_token: "id-token-secret",
            name: "Owner",
            password: "password-secret",
            provider_ids: ["google"],
            refresh_token: "refresh-token-secret",
            role: "owner",
            token: "session-token-secret",
            user_id: "user-1",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            latest_created_at: "2026-07-09T12:00:00.000Z",
            latest_expires_at: "2026-08-09T12:00:00.000Z",
            session_count: "2",
            token: "session-token-secret",
          },
        ],
      });

    const organization = await getPlatformOrganizationDetail("org-1", {
      execute,
    });
    const serialized = JSON.stringify(organization);

    expect(organization?.members[0]?.email).toBe("o***@example.com");
    expect(organization?.sessionSummary).toEqual({
      count: 2,
      latestCreatedAt: "2026-07-09T12:00:00.000Z",
      latestExpiresAt: "2026-08-09T12:00:00.000Z",
    });
    expect(serialized).not.toContain("owner@example.com");
    expect(serialized).not.toContain("Importadora");
    expect(serialized).not.toContain("importadora");
    for (const value of sensitiveValues) {
      expect(serialized).not.toContain(value);
    }
  });

  it("returns user details without session token material", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            created_at: "2026-07-09T10:00:00.000Z",
            email: "operator@example.com",
            id: "user-2",
            latest_session_at: "2026-07-09T12:00:00.000Z",
            name: "Operator",
            organization_count: "1",
            provider_ids: ["google", "github"],
            session_count: "4",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            created_at: "2026-07-09T10:30:00.000Z",
            id: "org-1",
            name: "Importadora",
            role: "operator",
            slug: "importadora",
            status: "active",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            latest_created_at: "2026-07-09T12:00:00.000Z",
            latest_expires_at: "2026-08-09T12:00:00.000Z",
            session_count: "4",
            token: "session-token-secret",
          },
        ],
      });

    const user = await getPlatformUserDetail("user-2", { execute });
    const serialized = JSON.stringify(user);

    expect(user?.email).toBe("o***@example.com");
    expect(user?.providerIds).toEqual(["google", "github"]);
    expect(user?.organizations).toHaveLength(1);
    expect(serialized).not.toContain("operator@example.com");
    expect(serialized).not.toContain("Importadora");
    expect(serialized).not.toContain("importadora");
    for (const value of sensitiveValues) {
      expect(serialized).not.toContain(value);
    }
  });
});
