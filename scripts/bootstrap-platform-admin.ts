import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

const PLATFORM_ADMIN_ROLES = new Set(["owner", "operator", "support"]);
const MINIMUM_REASON_LENGTH = 16;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

const getRole = (): string => {
  const role = process.env.PLATFORM_ADMIN_ROLE?.trim() || "owner";

  if (!PLATFORM_ADMIN_ROLES.has(role)) {
    throw new Error(
      `PLATFORM_ADMIN_ROLE must be one of: ${Array.from(PLATFORM_ADMIN_ROLES).join(", ")}.`
    );
  }

  return role;
};

const getReason = (): string => {
  const reason = getRequiredEnv("PLATFORM_ADMIN_BOOTSTRAP_REASON");

  if (reason.length < MINIMUM_REASON_LENGTH) {
    throw new Error(
      `PLATFORM_ADMIN_BOOTSTRAP_REASON must have at least ${MINIMUM_REASON_LENGTH} characters.`
    );
  }

  return reason;
};

const normalizeEmail = (email: string): string => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new Error("PLATFORM_ADMIN_EMAIL must be a valid email address.");
  }

  return normalizedEmail;
};

const getOptionalName = (email: string): string =>
  process.env.PLATFORM_ADMIN_NAME?.trim() || email;

const findOrCreateUser = async (
  client: PoolClient,
  input: { email: string; name: string }
): Promise<string> => {
  const existingUser = await client.query<{ id: string }>(
    "select id from public.users where email = $1 limit 1",
    [input.email]
  );

  if (existingUser.rowCount && existingUser.rows[0]) {
    return existingUser.rows[0].id;
  }

  const userId = `platform_${randomUUID()}`;

  await client.query(
    `
      insert into public.users (id, name, email, email_verified)
      values ($1, $2, $3, true)
    `,
    [userId, input.name, input.email]
  );

  return userId;
};

const findOrCreatePlatformAdmin = async (
  client: PoolClient,
  userId: string
): Promise<string> => {
  const existingAdmin = await client.query<{ id: string; status: string }>(
    "select id, status from public.platform_admins where user_id = $1 limit 1",
    [userId]
  );

  if (existingAdmin.rowCount && existingAdmin.rows[0]) {
    const admin = existingAdmin.rows[0];

    if (admin.status !== "active") {
      throw new Error(
        "Existing platform admin is not active. Re-enable it through an audited admin mutation instead."
      );
    }

    return admin.id;
  }

  const platformAdminId = randomUUID();

  await client.query(
    "insert into public.platform_admins (id, user_id, status) values ($1, $2, 'active')",
    [platformAdminId, userId]
  );

  return platformAdminId;
};

const ensureGrant = async (
  client: PoolClient,
  input: { platformAdminId: string; reason: string; role: string }
): Promise<void> => {
  const existingGrant = await client.query<{ id: string }>(
    `
      select id
      from public.platform_admin_grants
      where platform_admin_id = $1
        and role = $2
        and revoked_at is null
        and expires_at is null
      limit 1
    `,
    [input.platformAdminId, input.role]
  );

  if (existingGrant.rowCount) {
    return;
  }

  await client.query(
    `
      insert into public.platform_admin_grants (
        platform_admin_id,
        role,
        reason
      )
      values ($1, $2, $3)
    `,
    [input.platformAdminId, input.role, input.reason]
  );
};

const recordBootstrapAudit = async (
  client: PoolClient,
  input: {
    email: string;
    platformAdminId: string;
    reason: string;
    role: string;
    userId: string;
  }
): Promise<void> => {
  await client.query(
    `
      insert into public.platform_audit_events (
        actor_user_id,
        action,
        subject_type,
        subject_id,
        metadata
      )
      values ($1, 'platform_admin.bootstrap', 'platform_admin', $2, $3::jsonb)
    `,
    [
      input.userId,
      input.platformAdminId,
      JSON.stringify({
        email: input.email,
        reason: input.reason,
        role: input.role,
        source: "scripts/bootstrap-platform-admin.ts",
      }),
    ]
  );
};

const main = async (): Promise<void> => {
  const databaseUrl = getRequiredEnv("DATABASE_URL_DIRECT");
  const runtimeDatabaseUrl = process.env.DATABASE_URL?.trim();

  if (runtimeDatabaseUrl && runtimeDatabaseUrl === databaseUrl) {
    throw new Error(
      "DATABASE_URL_DIRECT must be distinct from DATABASE_URL for audited platform admin bootstrap."
    );
  }

  const email = normalizeEmail(getRequiredEnv("PLATFORM_ADMIN_EMAIL"));
  const name = getOptionalName(email);
  const reason = getReason();
  const role = getRole();
  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 5000,
    max: 1,
    ssl: true,
  });
  const client = await pool.connect();

  try {
    await client.query("begin");

    const userId = await findOrCreateUser(client, { email, name });
    const platformAdminId = await findOrCreatePlatformAdmin(client, userId);

    await ensureGrant(client, { platformAdminId, reason, role });
    await recordBootstrapAudit(client, {
      email,
      platformAdminId,
      reason,
      role,
      userId,
    });

    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          email,
          platformAdminId,
          role,
          status: "platform-admin-bootstrap-ok",
          userId,
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
