import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  decimal,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const tz = { withTimezone: true } as const;

export const timestamps = {
  createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", tz)
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
};

// ---------------------------------------------------------------------------
// Auth tables (Better Auth managed – IDs kept as TEXT)
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  ...timestamps,
});

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  status: text("status").default("active").notNull(),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").notNull(),
    expiresAt: timestamp("expires_at", tz).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id").references(
      () => organization.id,
      { onDelete: "set null" }
    ),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sessions_id_unique_idx").on(table.id),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_active_organization_id_idx").on(table.activeOrganizationId),
  ]
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", tz),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", tz),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
    uniqueIndex("accounts_provider_account_unique_idx").on(
      table.providerId,
      table.accountId
    ),
  ]
);

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", tz).notNull(),
  ...timestamps,
});

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("owner").notNull(),
    createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  },
  (table) => [
    index("member_organization_id_idx").on(table.organizationId),
    index("member_user_id_idx").on(table.userId),
    uniqueIndex("member_user_unique_idx").on(table.userId),
    uniqueIndex("member_organization_unique_idx").on(table.organizationId),
    uniqueIndex("member_organization_user_unique_idx").on(
      table.organizationId,
      table.userId
    ),
    check("member_role_known_check", sql`${table.role} = 'owner'`),
  ]
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", tz),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  },
  (table) => [
    index("invitation_organization_id_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
    index("invitation_status_idx").on(table.status),
    foreignKey({
      columns: [table.organizationId, table.inviterId],
      foreignColumns: [member.organizationId, member.userId],
      name: "invitation_organization_inviter_member_fk",
    }),
  ]
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  },
  (table) => [
    index("audit_events_organization_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
    index("audit_events_actor_user_id_idx").on(table.actorUserId),
    foreignKey({
      columns: [table.organizationId, table.actorUserId],
      foreignColumns: [member.organizationId, member.userId],
      name: "audit_events_organization_actor_member_fk",
    }),
  ]
);

// ---------------------------------------------------------------------------
// Platform admin tables (internal SaaS operations, not tenant membership)
// ---------------------------------------------------------------------------

export const platformAdminRoleEnum = pgEnum("platform_admin_role", [
  "owner",
  "operator",
  "support",
]);

export const platformSupportCaseKindEnum = pgEnum(
  "platform_support_case_kind",
  ["support", "data_subject_request"]
);

export const platformSupportCaseStatusEnum = pgEnum(
  "platform_support_case_status",
  ["open", "in_review", "closed"]
);

export const platformAdmins = pgTable(
  "platform_admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("platform_admins_user_id_unique_idx").on(table.userId),
    index("platform_admins_status_idx").on(table.status),
    check(
      "platform_admins_status_known_check",
      sql`${table.status} in ('active', 'disabled')`
    ),
  ]
);

export const platformAdminGrants = pgTable(
  "platform_admin_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    platformAdminId: uuid("platform_admin_id")
      .notNull()
      .references(() => platformAdmins.id, { onDelete: "cascade" }),
    role: platformAdminRoleEnum("role").notNull(),
    grantedByPlatformAdminId: uuid("granted_by_platform_admin_id").references(
      () => platformAdmins.id,
      { onDelete: "set null" }
    ),
    reason: text("reason").notNull(),
    expiresAt: timestamp("expires_at", tz),
    revokedAt: timestamp("revoked_at", tz),
    ...timestamps,
  },
  (table) => [
    index("platform_admin_grants_platform_admin_id_idx").on(
      table.platformAdminId
    ),
    index("platform_admin_grants_role_idx").on(table.role),
    index("platform_admin_grants_active_idx").on(
      table.platformAdminId,
      table.revokedAt,
      table.expiresAt
    ),
    check(
      "platform_admin_grants_expiry_required_check",
      sql`${table.expiresAt} is not null`
    ),
  ]
);

export const platformAuditEvents = pgTable(
  "platform_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorPlatformAdminId: uuid("actor_platform_admin_id").references(
      () => platformAdmins.id,
      { onDelete: "set null" }
    ),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  },
  (table) => [
    index("platform_audit_events_created_at_idx").on(table.createdAt),
    index("platform_audit_events_actor_platform_admin_id_idx").on(
      table.actorPlatformAdminId
    ),
    index("platform_audit_events_action_idx").on(table.action),
  ]
);

export const platformSupportNotes = pgTable(
  "platform_support_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorPlatformAdminId: uuid("author_platform_admin_id").references(
      () => platformAdmins.id,
      { onDelete: "set null" }
    ),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    customerUserId: text("customer_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    ...timestamps,
  },
  (table) => [
    index("platform_support_notes_author_platform_admin_id_idx").on(
      table.authorPlatformAdminId
    ),
    index("platform_support_notes_organization_id_idx").on(
      table.organizationId
    ),
    index("platform_support_notes_customer_user_id_idx").on(
      table.customerUserId
    ),
    index("platform_support_notes_created_at_idx").on(table.createdAt),
  ]
);

export const platformSupportCases = pgTable(
  "platform_support_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdByPlatformAdminId: uuid("created_by_platform_admin_id").references(
      () => platformAdmins.id,
      { onDelete: "set null" }
    ),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    customerUserId: text("customer_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    kind: platformSupportCaseKindEnum("kind").notNull(),
    status: platformSupportCaseStatusEnum("status").default("open").notNull(),
    reason: text("reason").notNull(),
    requesterVerifiedAt: timestamp("requester_verified_at", tz),
    resolution: text("resolution"),
    closedAt: timestamp("closed_at", tz),
    ...timestamps,
  },
  (table) => [
    index("platform_support_cases_created_by_platform_admin_id_idx").on(
      table.createdByPlatformAdminId
    ),
    index("platform_support_cases_organization_id_idx").on(
      table.organizationId
    ),
    index("platform_support_cases_customer_user_id_idx").on(
      table.customerUserId
    ),
    index("platform_support_cases_status_created_at_idx").on(
      table.status,
      table.createdAt
    ),
  ]
);

// ---------------------------------------------------------------------------
// Durable event foundation for webhooks, outbox and provider integrations
// ---------------------------------------------------------------------------

export const eventOutbox = pgTable(
  "event_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topic: text("topic").notNull(),
    eventType: text("event_type").notNull(),
    correlationId: text("correlation_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    claimToken: text("claim_token"),
    claimedAt: timestamp("claimed_at", tz),
    leaseExpiresAt: timestamp("lease_expires_at", tz),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    availableAt: timestamp("available_at", tz).defaultNow().notNull(),
    processedAt: timestamp("processed_at", tz),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("event_outbox_idempotency_key_unique_idx").on(
      table.idempotencyKey
    ),
    index("event_outbox_status_available_at_idx").on(
      table.status,
      table.availableAt
    ),
    index("event_outbox_status_lease_expires_at_idx").on(
      table.status,
      table.leaseExpiresAt
    ),
    index("event_outbox_correlation_id_idx").on(table.correlationId),
    check(
      "event_outbox_status_known_check",
      sql`${table.status} in ('pending', 'processing', 'processed', 'observed', 'failed', 'dead_letter')`
    ),
    check("event_outbox_attempts_non_negative", sql`${table.attempts} >= 0`),
  ]
);

export const commandExecutions = pgTable(
  "command_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    commandType: text("command_type").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    correlationId: text("correlation_id").notNull(),
    status: text("status").default("processing").notNull(),
    result: jsonb("result")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    errorCode: text("error_code"),
    completedAt: timestamp("completed_at", tz),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("command_executions_organization_type_key_unique_idx").on(
      table.organizationId,
      table.commandType,
      table.idempotencyKey
    ),
    index("command_executions_organization_status_idx").on(
      table.organizationId,
      table.status,
      table.createdAt
    ),
    index("command_executions_correlation_id_idx").on(table.correlationId),
    check(
      "command_executions_status_known_check",
      sql`${table.status} in ('processing', 'succeeded', 'failed')`
    ),
  ]
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    correlationId: text("correlation_id").notNull(),
    status: text("status").default("received").notNull(),
    rawBodySha256: text("raw_body_sha256").notNull(),
    redactedHeaders: jsonb("redacted_headers")
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    processedAt: timestamp("processed_at", tz),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("webhook_events_idempotency_key_unique_idx").on(
      table.idempotencyKey
    ),
    uniqueIndex("webhook_events_provider_event_unique_idx").on(
      table.provider,
      table.providerEventId
    ),
    index("webhook_events_status_created_at_idx").on(
      table.status,
      table.createdAt
    ),
    index("webhook_events_correlation_id_idx").on(table.correlationId),
    check(
      "webhook_events_status_known_check",
      sql`${table.status} in ('received', 'processing', 'processed', 'failed', 'duplicate')`
    ),
  ]
);

// ---------------------------------------------------------------------------
// Transactional email logs
// ---------------------------------------------------------------------------

export const emailMessages = pgTable(
  "email_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    to: text("to").notNull(),
    from: text("from").notNull(),
    subject: text("subject").notNull(),
    template: text("template").notNull(),
    templateVersion: text("template_version").notNull(),
    provider: text("provider").default("resend").notNull(),
    providerMessageId: text("provider_message_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").default("pending").notNull(),
    lastError: text("last_error"),
    attemptCount: integer("attempt_count").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", tz),
    acceptedAt: timestamp("accepted_at", tz),
    providerOccurredAt: timestamp("provider_occurred_at", tz),
    sentAt: timestamp("sent_at", tz),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("email_messages_idempotency_key_unique_idx").on(
      table.idempotencyKey
    ),
    uniqueIndex("email_messages_provider_message_id_unique_idx")
      .on(table.providerMessageId)
      .where(sql`provider_message_id IS NOT NULL`),
    index("email_messages_status_created_at_idx").on(
      table.status,
      table.createdAt
    ),
    index("email_messages_retry_idx").on(table.status, table.nextAttemptAt),
    check(
      "email_messages_status_known_check",
      sql`${table.status} in ('pending', 'accepted', 'failed', 'delivered', 'bounced', 'suppressed')`
    ),
    check(
      "email_messages_attempt_count_non_negative",
      sql`${table.attemptCount} >= 0`
    ),
  ]
);

export const emailEvents = pgTable(
  "email_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailMessageId: uuid("email_message_id").references(
      () => emailMessages.id,
      { onDelete: "set null" }
    ),
    provider: text("provider").default("resend").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    providerMessageId: text("provider_message_id"),
    type: text("type").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    occurredAt: timestamp("occurred_at", tz),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("email_events_provider_event_unique_idx").on(
      table.provider,
      table.providerEventId
    ),
    index("email_events_email_message_id_idx").on(table.emailMessageId),
    index("email_events_type_created_at_idx").on(table.type, table.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// Billing foundation (canonical state before provider adapters)
// ---------------------------------------------------------------------------

export const billingPlans = pgTable(
  "billing_plans",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    status: text("status").default("active").notNull(),
    interval: text("interval").notNull(),
    currency: text("currency").default("BRL").notNull(),
    amountCents: integer("amount_cents").notNull(),
    entitlements: jsonb("entitlements")
      .$type<Array<{ key: string; value: boolean | number | string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    ...timestamps,
  },
  (table) => [
    index("billing_plans_status_idx").on(table.status),
    check(
      "billing_plans_status_known_check",
      sql`${table.status} in ('active', 'archived')`
    ),
    check(
      "billing_plans_interval_known_check",
      sql`${table.interval} in ('month', 'year')`
    ),
    check(
      "billing_plans_amount_cents_non_negative",
      sql`${table.amountCents} >= 0`
    ),
  ]
);

export const billingCustomers = pgTable(
  "billing_customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    billingEmail: text("billing_email"),
    taxIdLast4: text("tax_id_last4"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("billing_customers_organization_unique_idx").on(
      table.organizationId
    ),
  ]
);

export const billingSubscriptions = pgTable(
  "billing_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    billingCustomerId: uuid("billing_customer_id").references(
      () => billingCustomers.id,
      { onDelete: "set null" }
    ),
    planId: text("plan_id")
      .notNull()
      .references(() => billingPlans.id),
    status: text("status").default("incomplete").notNull(),
    currentPeriodStart: timestamp("current_period_start", tz),
    currentPeriodEnd: timestamp("current_period_end", tz),
    gracePeriodEndsAt: timestamp("grace_period_ends_at", tz),
    lastProviderEventAt: timestamp("last_provider_event_at", tz),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    canceledAt: timestamp("canceled_at", tz),
    ...timestamps,
  },
  (table) => [
    index("billing_subscriptions_organization_id_idx").on(table.organizationId),
    index("billing_subscriptions_status_idx").on(table.status),
    index("billing_subscriptions_grace_period_ends_at_idx").on(
      table.gracePeriodEndsAt
    ),
    uniqueIndex("billing_subscriptions_active_organization_unique_idx")
      .on(table.organizationId)
      .where(sql`status in ('trialing', 'active', 'past_due', 'paused')`),
    check(
      "billing_subscriptions_status_known_check",
      sql`${table.status} in ('trialing', 'active', 'past_due', 'paused', 'canceled', 'incomplete')`
    ),
  ]
);

export const billingCheckoutSessions = pgTable(
  "billing_checkout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    billingSubscriptionId: uuid("billing_subscription_id")
      .notNull()
      .references(() => billingSubscriptions.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalReference: text("external_reference").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").default("pending").notNull(),
    providerCheckoutId: text("provider_checkout_id"),
    checkoutUrl: text("checkout_url"),
    expiresAt: timestamp("expires_at", tz),
    providerRequestStartedAt: timestamp("provider_request_started_at", tz),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("billing_checkout_sessions_external_reference_unique_idx").on(
      table.externalReference
    ),
    uniqueIndex(
      "billing_checkout_sessions_organization_idempotency_unique_idx"
    ).on(table.organizationId, table.idempotencyKey),
    uniqueIndex("billing_checkout_sessions_provider_checkout_unique_idx")
      .on(table.provider, table.providerCheckoutId)
      .where(sql`${table.providerCheckoutId} is not null`),
    uniqueIndex("billing_checkout_sessions_one_open_per_organization_idx")
      .on(table.organizationId)
      .where(sql`${table.status} in ('pending', 'ready', 'review')`),
    index("billing_checkout_sessions_subscription_id_idx").on(
      table.billingSubscriptionId
    ),
    index("billing_checkout_sessions_status_idx").on(table.status),
    check(
      "billing_checkout_sessions_provider_known_check",
      sql`${table.provider} in ('asaas')`
    ),
    check(
      "billing_checkout_sessions_status_known_check",
      sql`${table.status} in ('pending', 'ready', 'review', 'expired')`
    ),
  ]
);

export const billingInvoices = pgTable(
  "billing_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    billingSubscriptionId: uuid("billing_subscription_id").references(
      () => billingSubscriptions.id,
      { onDelete: "set null" }
    ),
    status: text("status").default("draft").notNull(),
    currency: text("currency").default("BRL").notNull(),
    subtotalCents: integer("subtotal_cents").default(0).notNull(),
    discountCents: integer("discount_cents").default(0).notNull(),
    totalCents: integer("total_cents").default(0).notNull(),
    dueAt: timestamp("due_at", tz),
    paidAt: timestamp("paid_at", tz),
    ...timestamps,
  },
  (table) => [
    index("billing_invoices_organization_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
    index("billing_invoices_status_idx").on(table.status),
    check(
      "billing_invoices_status_known_check",
      sql`${table.status} in ('draft', 'open', 'paid', 'void', 'uncollectible')`
    ),
    check(
      "billing_invoices_amounts_non_negative",
      sql`${table.subtotalCents} >= 0 and ${table.discountCents} >= 0 and ${table.totalCents} >= 0`
    ),
  ]
);

export const billingPaymentAttempts = pgTable(
  "billing_payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    billingInvoiceId: uuid("billing_invoice_id")
      .notNull()
      .references(() => billingInvoices.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id"),
    status: text("status").default("pending").notNull(),
    amountCents: integer("amount_cents").notNull(),
    attemptedAt: timestamp("attempted_at", tz).defaultNow().notNull(),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => [
    index("billing_payment_attempts_invoice_id_idx").on(table.billingInvoiceId),
    index("billing_payment_attempts_status_idx").on(table.status),
    uniqueIndex("billing_payment_attempts_provider_event_unique_idx")
      .on(table.provider, table.providerEventId)
      .where(sql`provider_event_id IS NOT NULL`),
    check(
      "billing_payment_attempts_provider_known_check",
      sql`${table.provider} in ('woovi', 'asaas', 'manual')`
    ),
    check(
      "billing_payment_attempts_status_known_check",
      sql`${table.status} in ('pending', 'processing', 'succeeded', 'failed')`
    ),
    check(
      "billing_payment_attempts_amount_cents_non_negative",
      sql`${table.amountCents} >= 0`
    ),
  ]
);

export const billingProviderLinks = pgTable(
  "billing_provider_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    entityType: text("entity_type").notNull(),
    externalId: text("external_id").notNull(),
    billingCustomerId: uuid("billing_customer_id").references(
      () => billingCustomers.id,
      { onDelete: "set null" }
    ),
    billingSubscriptionId: uuid("billing_subscription_id").references(
      () => billingSubscriptions.id,
      { onDelete: "set null" }
    ),
    billingInvoiceId: uuid("billing_invoice_id").references(
      () => billingInvoices.id,
      { onDelete: "set null" }
    ),
    cardBrand: text("card_brand"),
    cardLast4: text("card_last4"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex(
      "billing_provider_links_provider_entity_external_unique_idx"
    ).on(table.provider, table.entityType, table.externalId),
    index("billing_provider_links_organization_id_idx").on(
      table.organizationId
    ),
    index("billing_provider_links_subscription_id_idx").on(
      table.billingSubscriptionId
    ),
    index("billing_provider_links_invoice_id_idx").on(table.billingInvoiceId),
    check(
      "billing_provider_links_provider_known_check",
      sql`${table.provider} in ('woovi', 'asaas', 'manual')`
    ),
    check(
      "billing_provider_links_entity_type_known_check",
      sql`${table.entityType} in ('customer', 'subscription', 'invoice', 'payment_attempt', 'payment_method')`
    ),
    check(
      "billing_provider_links_card_last4_safe_check",
      sql`${table.cardLast4} is null or length(${table.cardLast4}) <= 4`
    ),
  ]
);

// ---------------------------------------------------------------------------
// Domain enums
// ---------------------------------------------------------------------------

export const saleStatusEnum = pgEnum("sale_status", ["completed", "cancelled"]);
export const salePaymentMethodEnum = pgEnum("sale_payment_method", [
  "pix",
  "card",
]);
export const salePaymentFeePayerEnum = pgEnum("sale_payment_fee_payer", [
  "not_applicable",
  "seller",
  "customer",
]);

export const productWriteOffReasonEnum = pgEnum("product_write_off_reason", [
  "adjustment",
  "operational",
]);
export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "entry",
  "write_off",
  "sale",
  "sale_reversal",
]);

export const goalMetricEnum = pgEnum("goal_metric", [
  "revenue",
  "profit",
  "sales_count",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "completed",
  "expired",
  "archived",
]);

export const goalDisplayModeEnum = pgEnum("goal_display_mode", [
  "percentage",
  "absolute",
]);

// ---------------------------------------------------------------------------
// Domain tables (IDs as native UUID, timestamps with timezone)
// ---------------------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isSystem: boolean("is_system").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("categories_organization_key_unique_idx").on(
      table.organizationId,
      table.key
    ),
    uniqueIndex("categories_organization_name_unique_idx").on(
      table.organizationId,
      table.name
    ),
    uniqueIndex("categories_organization_id_unique_idx").on(
      table.organizationId,
      table.id
    ),
    index("categories_name_trgm_idx").using(
      "gin",
      table.name.op("gin_trgm_ops")
    ),
  ]
);

export const systemSettings = pgTable(
  "system_settings",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    minimumMarkupPercent: decimal("minimum_markup_percent", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    idealMarkupPercent: decimal("ideal_markup_percent", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    paymentFeeRules: jsonb("payment_fee_rules")
      .$type<
        Array<{
          installments: number;
          feePercent: number;
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      columns: [table.organizationId, table.id],
      name: "system_settings_organization_id_id_pk",
    }),
    check(
      "system_settings_minimum_markup_percent_non_negative",
      sql`${table.minimumMarkupPercent} >= 0`
    ),
    check(
      "system_settings_ideal_markup_percent_non_negative",
      sql`${table.idealMarkupPercent} >= 0`
    ),
  ]
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    purchasedOn: date("purchased_on").default(sql`CURRENT_DATE`).notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    costPrice: decimal("cost_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    price: decimal("price", { precision: 12, scale: 2 }).notNull().default("0"),
    stock: integer("stock").default(0).notNull(),
    imageVersion: integer("image_version"),
    imageWidth: integer("image_width"),
    imageHeight: integer("image_height"),
    imageBlurDataUrl: text("image_blur_data_url"),
    imageUploadedAt: timestamp("image_uploaded_at", tz),
    archivedAt: timestamp("archived_at", tz),
    softDeletedAt: timestamp("soft_deleted_at", tz),
    softDeletedByUserId: text("soft_deleted_by_user_id").references(
      () => users.id
    ),
    softDeleteReason: text("soft_delete_reason"),
    ...timestamps,
  },
  (table) => [
    check("products_cost_price_non_negative", sql`${table.costPrice} >= 0`),
    check("products_price_non_negative", sql`${table.price} >= 0`),
    check("products_stock_non_negative", sql`${table.stock} >= 0`),
    check(
      "products_soft_delete_metadata_consistent",
      sql`(
        ${table.softDeletedAt} is null
        and ${table.softDeletedByUserId} is null
        and ${table.softDeleteReason} is null
      ) or (
        ${table.softDeletedAt} is not null
        and ${table.softDeletedByUserId} is not null
        and length(btrim(${table.softDeleteReason})) > 0
      )`
    ),
    check(
      "products_image_version_positive",
      sql`${table.imageVersion} is null or ${table.imageVersion} > 0`
    ),
    check(
      "products_image_width_positive",
      sql`${table.imageWidth} is null or ${table.imageWidth} > 0`
    ),
    check(
      "products_image_height_positive",
      sql`${table.imageHeight} is null or ${table.imageHeight} > 0`
    ),
    index("products_organization_category_id_idx").on(
      table.organizationId,
      table.categoryId
    ),
    uniqueIndex("products_organization_id_unique_idx").on(
      table.organizationId,
      table.id
    ),
    foreignKey({
      columns: [table.organizationId, table.categoryId],
      foreignColumns: [categories.organizationId, categories.id],
      name: "products_organization_category_fk",
    }),
    index("products_active_list_idx")
      .on(table.organizationId, table.name, table.createdAt, table.id)
      .where(sql`archived_at IS NULL AND soft_deleted_at IS NULL`),
    index("products_archived_list_idx")
      .on(table.organizationId, table.name, table.createdAt, table.id)
      .where(sql`archived_at IS NOT NULL AND soft_deleted_at IS NULL`),
    index("products_active_name_idx")
      .on(table.name)
      .where(sql`archived_at IS NULL AND soft_deleted_at IS NULL`),
    index("products_active_name_trgm_idx")
      .using("gin", table.name.op("gin_trgm_ops"))
      .where(sql`archived_at IS NULL AND soft_deleted_at IS NULL`),
    index("products_archived_name_trgm_idx")
      .using("gin", table.name.op("gin_trgm_ops"))
      .where(sql`archived_at IS NOT NULL AND soft_deleted_at IS NULL`),
    index("products_archived_idx")
      .on(table.archivedAt)
      .where(sql`archived_at IS NOT NULL AND soft_deleted_at IS NULL`),
    index("products_soft_deleted_idx")
      .on(table.organizationId, table.softDeletedAt)
      .where(sql`soft_deleted_at IS NOT NULL`),
  ]
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    position: integer("position").notNull(),
    version: integer("version").notNull(),
    blurDataUrl: text("blur_data_url").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    uploadedAt: timestamp("uploaded_at", tz).defaultNow().notNull(),
    removedAt: timestamp("removed_at", tz),
  },
  (table) => [
    check("product_images_position_non_negative", sql`${table.position} >= 0`),
    check("product_images_version_positive", sql`${table.version} > 0`),
    check("product_images_width_positive", sql`${table.width} > 0`),
    check("product_images_height_positive", sql`${table.height} > 0`),
    uniqueIndex("product_images_organization_id_unique_idx").on(
      table.organizationId,
      table.id
    ),
    uniqueIndex("product_images_active_position_unique_idx")
      .on(table.organizationId, table.productId, table.position)
      .where(sql`removed_at IS NULL`),
    uniqueIndex("product_images_product_version_unique_idx").on(
      table.organizationId,
      table.productId,
      table.version
    ),
    index("product_images_active_list_idx")
      .on(table.organizationId, table.productId, table.position)
      .where(sql`removed_at IS NULL`),
    foreignKey({
      columns: [table.organizationId, table.productId],
      foreignColumns: [products.organizationId, products.id],
      name: "product_images_organization_product_fk",
    }),
  ]
);

export const productPriceChanges = pgTable(
  "product_price_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    previousPrice: decimal("previous_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    nextPrice: decimal("next_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    changedByUserId: text("changed_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  },
  (table) => [
    check(
      "product_price_changes_previous_price_non_negative",
      sql`${table.previousPrice} >= 0`
    ),
    check(
      "product_price_changes_next_price_non_negative",
      sql`${table.nextPrice} >= 0`
    ),
    index("product_price_changes_product_created_at_idx").on(
      table.organizationId,
      table.productId,
      table.createdAt
    ),
    index("product_price_changes_changed_by_user_id_idx").on(
      table.changedByUserId
    ),
    foreignKey({
      columns: [table.organizationId, table.productId],
      foreignColumns: [products.organizationId, products.id],
      name: "product_price_changes_organization_product_fk",
    }),
    foreignKey({
      columns: [table.organizationId, table.changedByUserId],
      foreignColumns: [member.organizationId, member.userId],
      name: "product_price_changes_organization_actor_member_fk",
    }),
  ]
);

export const productStockEntries = pgTable(
  "product_stock_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    stockedOn: date("stocked_on").default(sql`CURRENT_DATE`).notNull(),
    quantity: integer("quantity").notNull(),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (table) => [
    check(
      "product_stock_entries_quantity_positive",
      sql`${table.quantity} > 0`
    ),
    check(
      "product_stock_entries_unit_cost_non_negative",
      sql`${table.unitCost} >= 0`
    ),
    index("product_stock_entries_product_stocked_on_idx").on(
      table.organizationId,
      table.productId,
      table.stockedOn
    ),
    foreignKey({
      columns: [table.organizationId, table.productId],
      foreignColumns: [products.organizationId, products.id],
      name: "product_stock_entries_organization_product_fk",
    }),
  ]
);

export const productStockWriteOffs = pgTable(
  "product_stock_write_offs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    happenedOn: date("happened_on").default(sql`CURRENT_DATE`).notNull(),
    quantity: integer("quantity").notNull(),
    reason: productWriteOffReasonEnum("reason").notNull(),
    notes: text("notes"),
    unitCostSnapshot: decimal("unit_cost_snapshot", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (table) => [
    check(
      "product_stock_write_offs_quantity_positive",
      sql`${table.quantity} > 0`
    ),
    check(
      "product_stock_write_offs_unit_cost_snapshot_non_negative",
      sql`${table.unitCostSnapshot} >= 0`
    ),
    index("product_stock_write_offs_product_happened_on_idx").on(
      table.organizationId,
      table.productId,
      table.happenedOn
    ),
    foreignKey({
      columns: [table.organizationId, table.productId],
      foreignColumns: [products.organizationId, products.id],
      name: "product_stock_write_offs_organization_product_fk",
    }),
  ]
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    type: stockMovementTypeEnum("type").notNull(),
    sourceId: uuid("source_id").notNull(),
    occurredOn: date("occurred_on").notNull(),
    delta: integer("delta").notNull(),
    unitCostSnapshot: decimal("unit_cost_snapshot", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at", tz).defaultNow().notNull(),
  },
  (table) => [
    check("stock_movements_delta_non_zero", sql`${table.delta} <> 0`),
    check(
      "stock_movements_unit_cost_non_negative",
      sql`${table.unitCostSnapshot} >= 0`
    ),
    uniqueIndex("stock_movements_source_unique_idx").on(
      table.organizationId,
      table.productId,
      table.type,
      table.sourceId
    ),
    index("stock_movements_product_occurred_on_idx").on(
      table.organizationId,
      table.productId,
      table.occurredOn,
      table.createdAt
    ),
    foreignKey({
      columns: [table.organizationId, table.productId],
      foreignColumns: [products.organizationId, products.id],
      name: "stock_movements_organization_product_fk",
    }),
  ]
);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    occurredOn: date("occurred_on").default(sql`CURRENT_DATE`).notNull(),
    status: saleStatusEnum("status").default("completed").notNull(),
    paymentMethod: salePaymentMethodEnum("payment_method")
      .default("pix")
      .notNull(),
    paymentInstallments: integer("payment_installments").default(0).notNull(),
    paymentFeePayer: salePaymentFeePayerEnum("payment_fee_payer")
      .default("not_applicable")
      .notNull(),
    paymentFeePercent: decimal("payment_fee_percent", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    customerName: text("customer_name"),
    notes: text("notes"),
    freightAmount: decimal("freight_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    additionalAmount: decimal("additional_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    discountAmount: decimal("discount_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    feeAmount: decimal("fee_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    chargedAmount: decimal("charged_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    cancelledAt: timestamp("cancelled_at", tz),
    cancelledOn: date("cancelled_on"),
    idempotencyKey: text("idempotency_key"),
    ...timestamps,
  },
  (table) => [
    check(
      "sales_freight_amount_non_negative",
      sql`${table.freightAmount} >= 0`
    ),
    check(
      "sales_additional_amount_non_negative",
      sql`${table.additionalAmount} >= 0`
    ),
    check(
      "sales_discount_amount_non_negative",
      sql`${table.discountAmount} >= 0`
    ),
    check(
      "sales_payment_installments_non_negative",
      sql`${table.paymentInstallments} >= 0`
    ),
    check(
      "sales_payment_fee_percent_non_negative",
      sql`${table.paymentFeePercent} >= 0`
    ),
    check(
      "sales_payment_method_installments_valid",
      sql`(${table.paymentMethod} = 'pix' and ${table.paymentInstallments} = 0) or (${table.paymentMethod} = 'card' and ${table.paymentInstallments} between 1 and 12)`
    ),
    check(
      "sales_payment_method_fee_payer_valid",
      sql`(${table.paymentMethod} = 'pix' and ${table.paymentFeePayer} = 'not_applicable') or (${table.paymentMethod} = 'card' and ${table.paymentFeePayer} in ('not_applicable', 'seller', 'customer'))`
    ),
    check(
      "sales_card_fee_payer_required",
      sql`${table.paymentMethod} <> 'card' or ${table.paymentFeePayer} in ('seller', 'customer')`
    ),
    check("sales_fee_amount_non_negative", sql`${table.feeAmount} >= 0`),
    check("sales_total_amount_non_negative", sql`${table.totalAmount} >= 0`),
    check(
      "sales_charged_amount_non_negative",
      sql`${table.chargedAmount} >= 0`
    ),
    check(
      "sales_charged_amount_gte_total_amount",
      sql`${table.chargedAmount} >= ${table.totalAmount}`
    ),
    check(
      "sales_status_cancelled_at_consistent",
      sql`(${table.status} = 'completed' and ${table.cancelledAt} is null) or (${table.status} = 'cancelled' and ${table.cancelledAt} is not null)`
    ),
    // Composite indexes: equality first, range last
    index("sales_organization_status_occurred_on_idx").on(
      table.organizationId,
      table.status,
      table.occurredOn
    ),
    index("sales_organization_payment_method_occurred_on_idx").on(
      table.organizationId,
      table.paymentMethod,
      table.occurredOn
    ),
    index("sales_organization_occurred_on_created_at_idx").on(
      table.organizationId,
      table.occurredOn,
      table.createdAt
    ),
    index("sales_organization_occurred_on_created_at_id_idx").on(
      table.organizationId,
      table.occurredOn,
      table.createdAt,
      table.id
    ),
    uniqueIndex("sales_organization_id_unique_idx").on(
      table.organizationId,
      table.id
    ),
    uniqueIndex("sales_organization_idempotency_key_unique_idx")
      .on(table.organizationId, table.idempotencyKey)
      .where(sql`idempotency_key IS NOT NULL`),
    index("sales_customer_name_trgm_idx")
      .using("gin", table.customerName.op("gin_trgm_ops"))
      .where(sql`customer_name IS NOT NULL`),
  ]
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceSnapshot: decimal("unit_price_snapshot", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    unitCostSnapshot: decimal("unit_cost_snapshot", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    lineTotal: decimal("line_total", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (table) => [
    check("sale_items_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "sale_items_unit_price_snapshot_non_negative",
      sql`${table.unitPriceSnapshot} >= 0`
    ),
    check(
      "sale_items_unit_cost_snapshot_non_negative",
      sql`${table.unitCostSnapshot} >= 0`
    ),
    check("sale_items_line_total_non_negative", sql`${table.lineTotal} >= 0`),
    index("sale_items_sale_id_idx").on(table.organizationId, table.saleId),
    index("sale_items_product_id_idx").on(
      table.organizationId,
      table.productId
    ),
    uniqueIndex("sale_items_sale_product_unique_idx").on(
      table.organizationId,
      table.saleId,
      table.productId
    ),
    foreignKey({
      columns: [table.organizationId, table.saleId],
      foreignColumns: [sales.organizationId, sales.id],
      name: "sale_items_organization_sale_fk",
    }),
    foreignKey({
      columns: [table.organizationId, table.productId],
      foreignColumns: [products.organizationId, products.id],
      name: "sale_items_organization_product_fk",
    }),
  ]
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    metric: goalMetricEnum("metric").notNull(),
    displayMode: goalDisplayModeEnum("display_mode").notNull(),
    targetValue: decimal("target_value", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    status: goalStatusEnum("status").notNull().default("active"),
    resolvedAt: timestamp("resolved_at", tz),
    resolvedValue: decimal("resolved_value", { precision: 12, scale: 2 }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (table) => [
    check("goals_target_value_positive", sql`${table.targetValue} > 0`),
    check(
      "goals_period_end_gte_start",
      sql`${table.periodEnd} >= ${table.periodStart}`
    ),
    index("goals_status_idx").on(table.organizationId, table.status),
    uniqueIndex("goals_one_active_per_organization_metric_idx")
      .on(table.organizationId, table.metric)
      .where(sql`status = 'active'`),
    index("goals_period_end_idx").on(table.organizationId, table.periodEnd),
    index("goals_created_by_user_id_idx").on(
      table.organizationId,
      table.createdByUserId
    ),
    foreignKey({
      columns: [table.organizationId, table.createdByUserId],
      foreignColumns: [member.organizationId, member.userId],
      name: "goals_organization_actor_member_fk",
    }),
  ]
);
