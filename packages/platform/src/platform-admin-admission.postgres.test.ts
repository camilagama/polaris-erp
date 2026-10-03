import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import { admitPlatformAdminSession } from "@polaris/platform/admin";

interface TestIdentity {
  email: string;
  userId: string;
}

interface EnrollmentInput {
  enrollmentExpiresAt?: Date;
  grantExpiresAt: Date;
  reason?: string;
  role?: "operator" | "owner" | "support";
}

const databaseUrl = process.env.DATABASE_URL;
const behaviorDatabaseUrl = process.env.POSTGRES_BEHAVIOR_DATABASE_URL;
const PLATFORM_TEST_DATABASE_PATTERN =
  /^polaris_platform_behavior_[0-9a-f]{32}$/;
const postgresDescribe =
  databaseUrl && behaviorDatabaseUrl ? describe : describe.skip;

postgresDescribe("platform admin admission on PostgreSQL", () => {
  const identities: TestIdentity[] = [];
  let pool: Pool | undefined;

  const getPool = (): Pool => {
    if (!pool) {
      throw new Error(
        "The isolated platform PostgreSQL database is unavailable."
      );
    }
    return pool;
  };

  const createIdentity = async (): Promise<TestIdentity> => {
    const identity = {
      email: `platform-admin-${randomUUID()}@example.test`,
      userId: `platform-admin-${randomUUID()}`,
    };
    identities.push(identity);
    await getPool().query(
      "INSERT INTO admin_users (id, name, email) VALUES ($1, $2, $3)",
      [identity.userId, "PostgreSQL behavior test", identity.email]
    );
    return identity;
  };

  const createEnrollment = async (
    identity: TestIdentity,
    input: EnrollmentInput
  ): Promise<void> => {
    await getPool().query(
      `INSERT INTO platform_admin_enrollments (
        email,
        role,
        reason,
        enrollment_expires_at,
        grant_expires_at
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        identity.email,
        input.role ?? "support",
        input.reason ?? "PostgreSQL admission integration test",
        input.enrollmentExpiresAt ?? new Date(Date.now() + 5 * 60_000),
        input.grantExpiresAt,
      ]
    );
  };

  const expectNoAdmissionWrites = async (
    identity: TestIdentity,
    expectedGrantExpiration: Date
  ): Promise<void> => {
    const result = await getPool().query<{
      admin_count: number;
      audit_count: number;
      claimed_at: Date | null;
      grant_count: number;
      grant_expires_at: Date;
    }>(
      `SELECT
        pae.claimed_at,
        pae.grant_expires_at,
        (SELECT count(*)::int FROM platform_admins pa WHERE pa.admin_user_id = $1) AS admin_count,
        (SELECT count(*)::int FROM platform_admin_grants pag
          INNER JOIN platform_admins pa ON pa.id = pag.platform_admin_id
          WHERE pa.admin_user_id = $1) AS grant_count,
        (SELECT count(*)::int FROM platform_audit_events pae2
          WHERE pae2.actor_admin_user_id = $1) AS audit_count
      FROM platform_admin_enrollments pae
      WHERE pae.email = $2`,
      [identity.userId, identity.email]
    );
    const row = result.rows[0];

    expect(row).toBeDefined();
    expect(row?.claimed_at).toBeNull();
    expect(row?.grant_expires_at.getTime()).toBe(
      expectedGrantExpiration.getTime()
    );
    expect(row?.admin_count).toBe(0);
    expect(row?.grant_count).toBe(0);
    expect(row?.audit_count).toBe(0);
  };

  beforeAll(async () => {
    if (!(databaseUrl && behaviorDatabaseUrl)) {
      throw new Error("The PostgreSQL behavior test URLs are required.");
    }

    pool = new Pool({ connectionString: databaseUrl, max: 3 });
    const result = await getPool().query<{
      database_name: string;
      server_version_num: string;
    }>(
      `SELECT current_database() AS database_name,
        current_setting('server_version_num') AS server_version_num`
    );
    const database = result.rows[0];

    expect(database?.database_name).toMatch(PLATFORM_TEST_DATABASE_PATTERN);
    expect(Math.floor(Number(database?.server_version_num) / 10_000)).toBe(18);
    expect(new URL(databaseUrl).pathname).not.toBe(
      new URL(behaviorDatabaseUrl).pathname
    );
  });

  afterEach(async () => {
    const currentPool = getPool();
    for (const identity of identities.splice(0)) {
      await currentPool.query(
        "DELETE FROM platform_audit_events WHERE actor_admin_user_id = $1",
        [identity.userId]
      );
      await currentPool.query(
        `DELETE FROM platform_admin_grants
         WHERE platform_admin_id IN (
           SELECT id FROM platform_admins WHERE admin_user_id = $1
         )`,
        [identity.userId]
      );
      await currentPool.query(
        "DELETE FROM platform_admins WHERE admin_user_id = $1",
        [identity.userId]
      );
      await currentPool.query(
        "DELETE FROM platform_admin_enrollments WHERE email = $1",
        [identity.email]
      );
      await currentPool.query("DELETE FROM admin_users WHERE id = $1", [
        identity.userId,
      ]);
    }
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("claims a valid enrollment and persists its grant and audit event", async () => {
    const identity = await createIdentity();
    const expiresAt = new Date(Date.now() + 60_000);
    await createEnrollment(identity, { grantExpiresAt: expiresAt });

    await admitPlatformAdminSession(identity.userId);

    const result = await getPool().query<{
      audit_count: number;
      claimed_at: Date | null;
      expires_at: Date;
      grant_id: string;
    }>(
      `SELECT pae.claimed_at, pag.id AS grant_id, pag.expires_at,
        (SELECT count(*)::int FROM platform_audit_events paev
          WHERE paev.actor_admin_user_id = au.id
            AND paev.action = 'platform_admin.enrollment_claimed') AS audit_count
      FROM admin_users au
      INNER JOIN platform_admin_enrollments pae ON pae.email = au.email
      INNER JOIN platform_admins pa ON pa.admin_user_id = au.id
      INNER JOIN platform_admin_grants pag ON pag.platform_admin_id = pa.id
      WHERE au.id = $1`,
      [identity.userId]
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.claimed_at).toBeInstanceOf(Date);
    expect(result.rows[0]?.grant_id).toBeTruthy();
    expect(result.rows[0]?.expires_at.getTime()).toBe(expiresAt.getTime());
    expect(result.rows[0]?.audit_count).toBe(1);
  });

  it("rejects an expired grant without claiming its enrollment", async () => {
    const identity = await createIdentity();
    const expiresAt = new Date(Date.now() - 60_000);
    await createEnrollment(identity, { grantExpiresAt: expiresAt });

    await expect(admitPlatformAdminSession(identity.userId)).rejects.toThrow(
      "does not have an active enrollment"
    );

    await expectNoAdmissionWrites(identity, expiresAt);
  });

  it("rejects an overlong legacy grant before claiming its enrollment", async () => {
    const identity = await createIdentity();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60_000);
    await createEnrollment(identity, { grantExpiresAt: expiresAt });

    await expect(admitPlatformAdminSession(identity.userId)).rejects.toThrow(
      "support grant expiration exceeds its allowed window"
    );

    await expectNoAdmissionWrites(identity, expiresAt);
  });

  it("rolls back the claim and admin when the grant expires during admission", async () => {
    const identity = await createIdentity();
    const expiresAt = new Date(Date.now() + 60_000);
    await createEnrollment(identity, { grantExpiresAt: expiresAt });

    const suffix = randomUUID().replaceAll("-", "");
    const functionName = `expire_claim_${suffix}`;
    const triggerName = `expire_claim_${suffix}`;

    await getPool().query(`
      CREATE FUNCTION "${functionName}"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        NEW.grant_expires_at := clock_timestamp() - INTERVAL '1 second';
        RETURN NEW;
      END;
      $$
    `);
    await getPool().query(`
      CREATE TRIGGER "${triggerName}"
      BEFORE UPDATE OF claimed_at ON platform_admin_enrollments
      FOR EACH ROW EXECUTE FUNCTION "${functionName}"()
    `);

    try {
      await expect(admitPlatformAdminSession(identity.userId)).rejects.toThrow(
        "expired before its grant could be created"
      );
    } finally {
      await getPool().query(
        `DROP TRIGGER IF EXISTS "${triggerName}" ON platform_admin_enrollments`
      );
      await getPool().query(`DROP FUNCTION IF EXISTS "${functionName}"()`);
    }

    await expectNoAdmissionWrites(identity, expiresAt);
  });
});
