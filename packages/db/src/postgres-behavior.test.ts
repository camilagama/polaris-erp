import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.POSTGRES_BEHAVIOR_DATABASE_URL;
const migrationsFolder = join(import.meta.dirname, "migrations");
const runtimeRole = "polaris_runtime_behavior_test";
const primaryOrganizationId = "behavior-primary";
const secondaryOrganizationId = "behavior-secondary";
const platformAdminId = "00000000-0000-4000-8000-000000000001";
const inactivePlatformAdminId = "00000000-0000-4000-8000-000000000002";
const revokedPlatformAdminId = "00000000-0000-4000-8000-000000000003";
const expiredPlatformAdminId = "00000000-0000-4000-8000-000000000004";
const outboxLeaseEventId = "00000000-0000-4000-8000-000000000005";
const outboxLeaseIdempotencyKey = "behavior-outbox-lease";
const temporalOrganizationId = "behavior-temporal";
const migrationTimeoutMs = 180_000;
const cleanupTimeoutMs = 30_000;
const rlsPolicyErrorPattern = /row-level security policy/i;

const removeRuntimeRole = async (pool: Pool): Promise<void> => {
  const role = await pool.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists",
    [runtimeRole]
  );

  if (!role.rows[0]?.exists) {
    return;
  }

  await pool.query(`REVOKE ${runtimeRole} FROM CURRENT_USER`);
  await pool.query(`REVOKE USAGE ON SCHEMA public FROM ${runtimeRole}`);
  await pool.query(
    `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${runtimeRole}`
  );
  await pool.query(`DROP ROLE ${runtimeRole}`);
};

const executeAsRuntime = async <T>(
  client: PoolClient,
  callback: () => Promise<T>
): Promise<T> => {
  await client.query("BEGIN");

  try {
    await client.query(`SET LOCAL ROLE ${runtimeRole}`);
    return await callback();
  } finally {
    await client.query("ROLLBACK");
  }
};

const behaviorDescribe = databaseUrl ? describe : describe.skip;

behaviorDescribe("PostgreSQL behavior harness", () => {
  const pool = new Pool({ connectionString: databaseUrl });

  beforeAll(async () => {
    await migrate(drizzle(pool), {
      migrationsFolder,
      migrationsSchema: "drizzle",
      migrationsTable: "__drizzle_migrations__",
    });

    await removeRuntimeRole(pool);
    await pool.query(
      `CREATE ROLE ${runtimeRole} NOLOGIN NOSUPERUSER NOBYPASSRLS`
    );
    await pool.query(`GRANT ${runtimeRole} TO CURRENT_USER`);
    await pool.query(`GRANT USAGE ON SCHEMA public TO ${runtimeRole}`);
    await pool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${runtimeRole}`
    );
  }, migrationTimeoutMs);

  afterAll(async () => {
    await removeRuntimeRole(pool);
    await pool.end();
  }, cleanupTimeoutMs);

  it("applies every migration and enforces tenant isolation for a runtime role", async () => {
    const client = await pool.connect();

    try {
      await client.query(
        "INSERT INTO organization (id, name, slug) VALUES ($1, $2, $3), ($4, $5, $6)",
        [
          primaryOrganizationId,
          "Primary behavior organization",
          "behavior-primary",
          secondaryOrganizationId,
          "Secondary behavior organization",
          "behavior-secondary",
        ]
      );

      const visibleOrganizations = await executeAsRuntime(client, async () => {
        await client.query(
          "SELECT set_config('app.organization_id', $1, true)",
          [primaryOrganizationId]
        );
        const result = await client.query<{ id: string }>(
          "SELECT id FROM organization ORDER BY id"
        );

        return result.rows.map((row) => row.id);
      });

      expect(visibleOrganizations).toEqual([primaryOrganizationId]);

      const crossTenantProviderLinkError = await executeAsRuntime(
        client,
        async () => {
          await client.query(
            "SELECT set_config('app.organization_id', $1, true)",
            [primaryOrganizationId]
          );

          try {
            await client.query(
              `
                INSERT INTO billing_provider_links (
                  organization_id,
                  provider,
                  entity_type,
                  external_id
                )
                VALUES ($1, 'behavior-test', 'payment_attempt', 'cross-tenant-write')
              `,
              [secondaryOrganizationId]
            );
          } catch (error) {
            return error as { code?: string; message?: string };
          }

          throw new Error(
            "Expected the billing provider link policy to reject a cross-tenant write."
          );
        }
      );

      expect(crossTenantProviderLinkError.code).toBe("42501");
      expect(crossTenantProviderLinkError.message).toMatch(
        rlsPolicyErrorPattern
      );
    } finally {
      await client.query("DELETE FROM organization WHERE id = ANY($1)", [
        [primaryOrganizationId, secondaryOrganizationId],
      ]);
      client.release();
    }
  });

  it("enforces the sales idempotency constraint with its database error code", async () => {
    const client = await pool.connect();

    try {
      await client.query(
        "INSERT INTO organization (id, name, slug) VALUES ($1, $2, $3)",
        [
          primaryOrganizationId,
          "Primary behavior organization",
          "behavior-primary",
        ]
      );

      const duplicateError = await executeAsRuntime(client, async () => {
        await client.query(
          "SELECT set_config('app.organization_id', $1, true)",
          [primaryOrganizationId]
        );
        await client.query(
          "INSERT INTO sales (organization_id, idempotency_key) VALUES ($1, $2)",
          [primaryOrganizationId, "behavior-idempotency-key"]
        );

        try {
          await client.query(
            "INSERT INTO sales (organization_id, idempotency_key) VALUES ($1, $2)",
            [primaryOrganizationId, "behavior-idempotency-key"]
          );
        } catch (error) {
          return error as { code?: string; constraint?: string };
        }

        throw new Error(
          "Expected the sales idempotency constraint to reject a duplicate."
        );
      });

      expect(duplicateError.code).toBe("23505");
      expect(duplicateError.constraint).toBe(
        "sales_organization_idempotency_key_unique_idx"
      );
    } finally {
      await client.query("DELETE FROM organization WHERE id = $1", [
        primaryOrganizationId,
      ]);
      client.release();
    }
  });

  it("uses the Sao Paulo business date regardless of the PostgreSQL session timezone", async () => {
    const client = await pool.connect();

    try {
      await client.query(
        "INSERT INTO organization (id, name, slug) VALUES ($1, $2, $3)",
        [
          temporalOrganizationId,
          "Temporal behavior organization",
          "behavior-temporal",
        ]
      );
      await client.query("BEGIN");
      await client.query("SET LOCAL TIME ZONE 'UTC'");
      const utcSession = await client.query<{ occurred_on: string }>(
        "INSERT INTO sales (organization_id, idempotency_key) VALUES ($1, $2) RETURNING occurred_on",
        [temporalOrganizationId, "behavior-temporal-utc"]
      );
      await client.query("ROLLBACK");

      await client.query("BEGIN");
      await client.query("SET LOCAL TIME ZONE 'America/Sao_Paulo'");
      const saoPauloSession = await client.query<{ occurred_on: string }>(
        "INSERT INTO sales (organization_id, idempotency_key) VALUES ($1, $2) RETURNING occurred_on",
        [temporalOrganizationId, "behavior-temporal-sao-paulo"]
      );
      await client.query("ROLLBACK");

      expect(utcSession.rows[0]?.occurred_on).toBe(
        saoPauloSession.rows[0]?.occurred_on
      );
    } finally {
      await client.query("DELETE FROM organization WHERE id = $1", [
        temporalOrganizationId,
      ]);
      client.release();
    }
  });

  it("requires both cancellation fields for a cancelled sale", async () => {
    const client = await pool.connect();

    try {
      await client.query(
        "INSERT INTO organization (id, name, slug) VALUES ($1, $2, $3)",
        [
          temporalOrganizationId,
          "Temporal behavior organization",
          "behavior-temporal",
        ]
      );

      await expect(
        client.query(
          "INSERT INTO sales (organization_id, status, cancelled_at) VALUES ($1, 'cancelled', now())",
          [temporalOrganizationId]
        )
      ).rejects.toMatchObject({ code: "23514" });
    } finally {
      await client.query("DELETE FROM organization WHERE id = $1", [
        temporalOrganizationId,
      ]);
      client.release();
    }
  });

  it("allows only one concurrent webhook claim for an idempotency key", async () => {
    const firstClient = await pool.connect();
    const secondClient = await pool.connect();
    const idempotencyKey = "behavior-concurrent-webhook-claim";
    let firstTransactionOpen = false;
    let secondTransactionOpen = false;

    const claimWebhook = (client: PoolClient) =>
      client.query<{ id: string }>(
        `
          INSERT INTO webhook_events (
            provider,
            provider_event_id,
            idempotency_key,
            correlation_id,
            raw_body_sha256
          )
          VALUES ('behavior-test', 'concurrent-claim', $1, 'behavior-test', 'hash')
          ON CONFLICT (idempotency_key) DO NOTHING
          RETURNING id
        `,
        [idempotencyKey]
      );

    try {
      await firstClient.query("BEGIN");
      firstTransactionOpen = true;
      const firstClaim = await claimWebhook(firstClient);
      expect(firstClaim.rows).toHaveLength(1);

      await secondClient.query("BEGIN");
      secondTransactionOpen = true;
      await secondClient.query("SET LOCAL lock_timeout = '5s'");
      const duplicateClaim = claimWebhook(secondClient);

      await firstClient.query("COMMIT");
      firstTransactionOpen = false;

      await expect(duplicateClaim).resolves.toMatchObject({ rows: [] });
      await secondClient.query("COMMIT");
      secondTransactionOpen = false;
    } finally {
      if (firstTransactionOpen) {
        await firstClient.query("ROLLBACK");
      }
      if (secondTransactionOpen) {
        await secondClient.query("ROLLBACK");
      }
      await pool.query(
        "DELETE FROM webhook_events WHERE idempotency_key = $1",
        [idempotencyKey]
      );
      firstClient.release();
      secondClient.release();
    }
  });

  it("reclaims an expired outbox lease and rejects stale completion", async () => {
    try {
      await pool.query(
        `
          INSERT INTO event_outbox (
            id,
            topic,
            event_type,
            correlation_id,
            idempotency_key,
            payload,
            status,
            attempts,
            claim_token,
            claimed_at,
            lease_expires_at
          )
          VALUES (
            $1,
            'behavior-test',
            'lease-recovery',
            'behavior-test',
            $2,
            '{}'::jsonb,
            'processing',
            1,
            'stale-claim',
            now() - interval '10 minutes',
            now() - interval '5 minutes'
          )
        `,
        [outboxLeaseEventId, outboxLeaseIdempotencyKey]
      );

      const reclaimed = await pool.query<{
        attempts: number;
        claim_token: string;
      }>(
        `
          UPDATE event_outbox
          SET
            status = 'processing',
            attempts = attempts + 1,
            claim_token = 'fresh-claim',
            claimed_at = now(),
            lease_expires_at = now() + interval '5 minutes',
            last_error = null,
            updated_at = now()
          WHERE id = $1
            AND (
              status = 'pending'
              OR (status = 'processing' AND lease_expires_at <= now())
            )
          RETURNING attempts, claim_token
        `,
        [outboxLeaseEventId]
      );

      expect(reclaimed.rows).toEqual([
        { attempts: 2, claim_token: "fresh-claim" },
      ]);

      const staleCompletion = await pool.query(
        `
          UPDATE event_outbox
          SET status = 'processed', processed_at = now()
          WHERE id = $1
            AND status = 'processing'
            AND claim_token = 'stale-claim'
          RETURNING id
        `,
        [outboxLeaseEventId]
      );

      expect(staleCompletion.rows).toEqual([]);
    } finally {
      await pool.query("DELETE FROM event_outbox WHERE id = $1", [
        outboxLeaseEventId,
      ]);
    }
  });

  it("accepts only an active platform-admin grant in the RLS context", async () => {
    const client = await pool.connect();

    try {
      await client.query("DELETE FROM admin_users WHERE id = ANY($1)", [
        [
          "behavior-platform-user",
          "behavior-inactive-platform-user",
          "behavior-revoked-platform-user",
          "behavior-expired-platform-user",
        ],
      ]);
      await client.query(
        "INSERT INTO organization (id, name, slug) VALUES ($1, $2, $3), ($4, $5, $6)",
        [
          primaryOrganizationId,
          "Primary behavior organization",
          "behavior-primary",
          secondaryOrganizationId,
          "Secondary behavior organization",
          "behavior-secondary",
        ]
      );
      await client.query(
        "INSERT INTO admin_users (id, name, email) VALUES ($1, $2, $3)",
        [
          "behavior-platform-user",
          "Behavior platform user",
          "behavior@example.com",
        ]
      );
      await client.query(
        "INSERT INTO platform_admins (id, admin_user_id, status) VALUES ($1, $2, 'active')",
        [platformAdminId, "behavior-platform-user"]
      );
      await client.query(
        "INSERT INTO platform_admin_grants (platform_admin_id, role, reason, expires_at) VALUES ($1, 'owner', $2, $3)",
        [
          platformAdminId,
          "PostgreSQL behavior test",
          new Date(Date.now() + 60_000),
        ]
      );

      const visibleOrganizations = await executeAsRuntime(client, async () => {
        await client.query(
          "SELECT set_config('app.platform_admin_id', $1, true)",
          [platformAdminId]
        );
        const result = await client.query<{ id: string }>(
          "SELECT id FROM organization ORDER BY id"
        );

        return result.rows.map((row) => row.id);
      });

      expect(visibleOrganizations).toEqual([
        primaryOrganizationId,
        secondaryOrganizationId,
      ]);

      const deniedAdmins = [
        {
          id: inactivePlatformAdminId,
          status: "disabled",
          userId: "behavior-inactive-platform-user",
          grant: "active",
        },
        {
          id: revokedPlatformAdminId,
          status: "active",
          userId: "behavior-revoked-platform-user",
          grant: "revoked",
        },
        {
          id: expiredPlatformAdminId,
          status: "active",
          userId: "behavior-expired-platform-user",
          grant: "expired",
        },
      ] as const;

      for (const admin of deniedAdmins) {
        await client.query(
          "INSERT INTO admin_users (id, name, email) VALUES ($1, $2, $3)",
          [admin.userId, admin.userId, `${admin.userId}@example.com`]
        );
        await client.query(
          "INSERT INTO platform_admins (id, admin_user_id, status) VALUES ($1, $2, $3)",
          [admin.id, admin.userId, admin.status]
        );
        await client.query(
          "INSERT INTO platform_admin_grants (platform_admin_id, role, reason, revoked_at, expires_at) VALUES ($1, 'owner', $2, $3, $4)",
          [
            admin.id,
            "PostgreSQL behavior negative grant test",
            admin.grant === "revoked" ? new Date() : null,
            admin.grant === "expired"
              ? new Date(Date.now() - 60_000)
              : new Date(Date.now() + 60_000),
          ]
        );

        const deniedOrganizations = await executeAsRuntime(client, async () => {
          await client.query(
            "SELECT set_config('app.platform_admin_id', $1, true)",
            [admin.id]
          );
          return await client.query<{ id: string }>(
            "SELECT id FROM organization ORDER BY id"
          );
        });

        expect(deniedOrganizations.rows).toEqual([]);
      }
    } finally {
      await client.query("DELETE FROM admin_users WHERE id = ANY($1)", [
        [
          "behavior-platform-user",
          "behavior-inactive-platform-user",
          "behavior-revoked-platform-user",
          "behavior-expired-platform-user",
        ],
      ]);
      await client.query("DELETE FROM organization WHERE id = ANY($1)", [
        [primaryOrganizationId, secondaryOrganizationId],
      ]);
      client.release();
    }
  }, 30_000);
});
