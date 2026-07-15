import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const PLATFORM_ADMIN_ROLES = new Set(["owner", "operator", "support"]);
const MINIMUM_REASON_LENGTH = 16;
const DEFAULT_ENROLLMENT_TTL_DAYS = 7;
const DEFAULT_GRANT_TTL_DAYS = 90;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

const getPositiveInteger = (name: string, fallback: number): number => {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
};

const getRole = (): string => {
  const role = process.env.PLATFORM_ADMIN_ROLE?.trim() || "owner";

  if (!PLATFORM_ADMIN_ROLES.has(role)) {
    throw new Error("PLATFORM_ADMIN_ROLE must be owner, operator, or support.");
  }

  return role;
};

const normalizeEmail = (email: string): string => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new Error("PLATFORM_ADMIN_EMAIL must be a valid email address.");
  }

  return normalizedEmail;
};

const main = async (): Promise<void> => {
  const databaseUrl = getRequiredEnv("DATABASE_URL_DIRECT");
  const email = normalizeEmail(getRequiredEnv("PLATFORM_ADMIN_EMAIL"));
  const reason = getRequiredEnv("PLATFORM_ADMIN_BOOTSTRAP_REASON");
  const role = getRole();

  if (reason.length < MINIMUM_REASON_LENGTH) {
    throw new Error(
      `PLATFORM_ADMIN_BOOTSTRAP_REASON must have at least ${MINIMUM_REASON_LENGTH} characters.`
    );
  }

  const enrollmentTtlDays = getPositiveInteger(
    "PLATFORM_ADMIN_ENROLLMENT_TTL_DAYS",
    DEFAULT_ENROLLMENT_TTL_DAYS
  );
  const grantTtlDays = getPositiveInteger(
    "PLATFORM_ADMIN_GRANT_TTL_DAYS",
    DEFAULT_GRANT_TTL_DAYS
  );
  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 5_000,
    max: 1,
    ssl: true,
  });
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("set local app.internal_job = 'platform_admin_bootstrap'");
    await client.query("select pg_advisory_xact_lock(hashtext('platform_admin_bootstrap'))");

    const existing = await client.query<{ platform_admins: string; enrollments: string }>(
      `
        select
          (select count(*)::text from public.platform_admins) as platform_admins,
          (select count(*)::text from public.platform_admin_enrollments) as enrollments
      `
    );
    const state = existing.rows[0];

    if (!state || state.platform_admins !== "0" || state.enrollments !== "0") {
      throw new Error(
        "Initial admin bootstrap has already been used. Manage access from the admin console."
      );
    }

    const enrollmentId = randomUUID();
    const enrollment = await client.query<{ grant_expires_at: Date; enrollment_expires_at: Date }>(
      `
        insert into public.platform_admin_enrollments (
          id,
          email,
          role,
          reason,
          enrollment_expires_at,
          grant_expires_at
        ) values (
          $1,
          $2,
          $3::public.platform_admin_role,
          $4,
          now() + ($5 * interval '1 day'),
          now() + ($6 * interval '1 day')
        )
        returning enrollment_expires_at, grant_expires_at
      `,
      [enrollmentId, email, role, reason, enrollmentTtlDays, grantTtlDays]
    );
    const dates = enrollment.rows[0];

    await client.query(
      `
        insert into public.platform_audit_events (
          action,
          subject_type,
          subject_id,
          metadata
        ) values ($1, $2, $3, $4::jsonb)
      `,
      [
        "platform_admin.enrollment_bootstrapped",
        "platform_admin_enrollment",
        enrollmentId,
        JSON.stringify({ email, grantTtlDays, reason, role, source: "bootstrap-platform-admin" }),
      ]
    );
    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          email,
          enrollmentExpiresAt: dates?.enrollment_expires_at.toISOString(),
          grantExpiresAt: dates?.grant_expires_at.toISOString(),
          role,
          status: "platform-admin-enrollment-bootstrap-ok",
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
