import "server-only";

import { db } from "@polaris/db";
import {
  createResendEmailSender,
  renderWelcomeEmail,
  type TransactionalEmailTemplate,
} from "@polaris/emails";
import { type SQL, sql } from "drizzle-orm";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env";

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

interface SendWelcomeEmailInput {
  name: string;
  to: string;
  userId: string;
}

export interface RecordedEmailEventInput {
  event: unknown;
  providerEventId: string;
}

export type EmailDeliveryStatus =
  | "accepted"
  | "bounced"
  | "delivered"
  | "failed"
  | "pending"
  | "suppressed";

const RESEND_TEST_DOMAIN_PATTERN = /@resend\.dev\b/i;

export const resolveResendEmailStatus = (
  eventType: string
): EmailDeliveryStatus | null => {
  switch (eventType) {
    case "email.bounced": {
      return "bounced";
    }
    case "email.complained":
    case "email.suppressed": {
      return "suppressed";
    }
    case "email.delivered": {
      return "delivered";
    }
    case "email.sent": {
      return "accepted";
    }
    default: {
      return null;
    }
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (
  record: Record<string, unknown>,
  key: string
): string | null => {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const getNonNegativeInteger = (value: unknown): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;

const getOccurredAt = (record: Record<string, unknown>): Date | null => {
  const createdAt =
    getString(record, "created_at") ?? getString(record, "occurredAt");

  if (!createdAt) {
    return null;
  }

  const occurredAt = new Date(createdAt);

  return Number.isNaN(occurredAt.getTime()) ? null : occurredAt;
};

const getResendEventDetails = (event: unknown) => {
  const eventRecord = isRecord(event) ? event : {};
  const data = isRecord(eventRecord.data) ? eventRecord.data : {};
  const providerMessageId =
    getString(data, "email_id") ?? getString(data, "emailId");
  const occurredAt = getOccurredAt(eventRecord);

  return {
    occurredAt,
    payload: providerMessageId ? { emailId: providerMessageId } : {},
    providerMessageId,
    type: getString(eventRecord, "type") ?? "unknown",
  };
};

const assertResendFromEmailAllowed = ({
  from,
  nodeEnv,
  vercelEnv,
}: {
  from: string;
  nodeEnv: string;
  vercelEnv?: string;
}): void => {
  if (
    nodeEnv === "production" &&
    vercelEnv === "production" &&
    RESEND_TEST_DOMAIN_PATTERN.test(from)
  ) {
    throw new Error(
      "RESEND_FROM_EMAIL must use a verified domain in production."
    );
  }
};

const logPendingEmail = async (
  queryableDb: QueryableDb,
  {
    from,
    idempotencyKey,
    template,
    to,
  }: {
    from: string;
    idempotencyKey: string;
    template: TransactionalEmailTemplate;
    to: string;
  }
): Promise<void> => {
  await queryableDb.execute(sql`
    insert into email_messages (
      "to",
      "from",
      subject,
      template,
      template_version,
      provider,
      idempotency_key,
      status
    )
    values (
      ${to},
      ${from},
      ${template.subject},
      ${template.template},
      ${template.templateVersion},
      'resend',
      ${idempotencyKey},
      'pending'
    )
    on conflict (idempotency_key) do nothing
  `);
};

const getEmailDeliveryState = async (
  queryableDb: QueryableDb,
  idempotencyKey: string
): Promise<{ attemptCount: number; providerMessageId: string | null }> => {
  const result = await queryableDb.execute(sql`
    select attempt_count as "attemptCount",
           provider_message_id as "providerMessageId"
    from email_messages
    where idempotency_key = ${idempotencyKey}
    limit 1
  `);
  const rows =
    isRecord(result) && Array.isArray(result.rows) ? result.rows : [];
  const [row] = rows.filter(isRecord);

  return {
    attemptCount: getNonNegativeInteger(row?.attemptCount),
    providerMessageId: getString(row ?? {}, "providerMessageId"),
  };
};

const markEmailAccepted = async (
  queryableDb: QueryableDb,
  idempotencyKey: string,
  providerMessageId: string
): Promise<void> => {
  await queryableDb.execute(sql`
    update email_messages
    set status = 'accepted',
        provider_message_id = ${providerMessageId},
        accepted_at = now(),
        sent_at = now(),
        last_error = null,
        updated_at = now()
    where idempotency_key = ${idempotencyKey}
      and status in ('pending', 'failed')
  `);
};

const markEmailFailed = async (
  queryableDb: QueryableDb,
  idempotencyKey: string,
  error: unknown
): Promise<void> => {
  const message = error instanceof Error ? error.message : "Email send failed.";

  await queryableDb.execute(sql`
    update email_messages
    set status = 'failed',
        attempt_count = attempt_count + 1,
        last_error = ${message},
        updated_at = now()
    where idempotency_key = ${idempotencyKey}
      and provider_message_id is null
      and status in ('pending', 'failed')
  `);
};

export const recordResendEmailEvent = async (
  queryableDb: QueryableDb,
  { event, providerEventId }: RecordedEmailEventInput
): Promise<void> => {
  const { occurredAt, payload, providerMessageId, type } =
    getResendEventDetails(event);
  const status = resolveResendEmailStatus(type);

  await queryableDb.execute(sql`
    with matching_message as (
      select id
      from email_messages
      where provider = 'resend'
        and provider_message_id = ${providerMessageId}
      limit 1
    ),
    recorded_event as (
      insert into email_events (
        email_message_id,
        provider,
        provider_event_id,
        provider_message_id,
        type,
        payload,
        occurred_at
      )
      select
        matching_message.id,
        'resend',
        ${providerEventId},
        ${providerMessageId},
        ${type},
        ${JSON.stringify(payload)}::jsonb,
        ${occurredAt}
      from (select 1) as input
      left join matching_message on true
      on conflict (provider, provider_event_id) do nothing
    )
    update email_messages as message
    set status = ${status},
        provider_occurred_at = ${occurredAt},
        last_error = case
          when ${status} in ('bounced', 'failed', 'suppressed') then ${type}
          else null
        end,
        updated_at = now()
    where message.provider = 'resend'
      and message.provider_message_id = ${providerMessageId}
      and ${status} is not null
      and ${occurredAt} is not null
      and message.status not in ('delivered', 'bounced', 'suppressed')
      and (
        message.provider_occurred_at is null
        or message.provider_occurred_at <= ${occurredAt}
      )
  `);
};

export const redactResendWebhookPayload = (
  event: unknown
): Record<string, unknown> => {
  const { occurredAt, payload, type } = getResendEventDetails(event);

  return {
    data: payload,
    occurredAt: occurredAt?.toISOString() ?? null,
    type,
  };
};

const sendWelcomeEmail = async ({
  name,
  to,
  userId,
}: SendWelcomeEmailInput): Promise<{ providerMessageId: string }> => {
  if (!(serverEnv.RESEND_API_KEY && serverEnv.RESEND_FROM_EMAIL)) {
    throw new Error("Resend email delivery is not configured.");
  }

  assertResendFromEmailAllowed({
    from: serverEnv.RESEND_FROM_EMAIL,
    nodeEnv: serverEnv.NODE_ENV,
    vercelEnv: serverEnv.VERCEL_ENV,
  });

  const idempotencyKey = `welcome:${userId}`;
  const template = renderWelcomeEmail({
    appUrl: serverEnv.NEXT_PUBLIC_APP_URL,
    name,
  });

  await logPendingEmail(db, {
    from: serverEnv.RESEND_FROM_EMAIL,
    idempotencyKey,
    template,
    to,
  });
  const { attemptCount, providerMessageId } = await getEmailDeliveryState(
    db,
    idempotencyKey
  );

  if (providerMessageId) {
    return { providerMessageId };
  }

  if (attemptCount >= 3) {
    throw new Error("Email delivery retry limit reached before acceptance.");
  }

  const sender = createResendEmailSender({
    from: serverEnv.RESEND_FROM_EMAIL,
    resend: new Resend(serverEnv.RESEND_API_KEY),
  });
  let result: { providerMessageId: string };

  try {
    result = await sender.send({ idempotencyKey, template, to });
  } catch (error) {
    await markEmailFailed(db, idempotencyKey, error);
    throw error;
  }

  await markEmailAccepted(db, idempotencyKey, result.providerMessageId);

  return result;
};

export const sendWelcomeEmailIfConfigured = async (
  input: SendWelcomeEmailInput
): Promise<{
  providerMessageId?: string;
  status: "accepted" | "failed" | "skipped";
}> => {
  if (!(serverEnv.RESEND_API_KEY && serverEnv.RESEND_FROM_EMAIL)) {
    return { status: "skipped" };
  }

  try {
    const result = await sendWelcomeEmail(input);
    return { providerMessageId: result.providerMessageId, status: "accepted" };
  } catch {
    return { status: "failed" };
  }
};
