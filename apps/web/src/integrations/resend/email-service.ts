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

const RESEND_TEST_DOMAIN_PATTERN = /@resend\.dev\b/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (
  record: Record<string, unknown>,
  key: string
): string | null => {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const getResendEventDetails = (event: unknown) => {
  const eventRecord = isRecord(event) ? event : {};
  const data = isRecord(eventRecord.data) ? eventRecord.data : {};
  const providerMessageId =
    getString(data, "email_id") ?? getString(data, "emailId");

  return {
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

const markEmailSent = async (
  queryableDb: QueryableDb,
  idempotencyKey: string,
  providerMessageId: string
): Promise<void> => {
  await queryableDb.execute(sql`
    update email_messages
    set status = 'sent',
        provider_message_id = ${providerMessageId},
        sent_at = now(),
        last_error = null,
        updated_at = now()
    where idempotency_key = ${idempotencyKey}
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
        last_error = ${message},
        updated_at = now()
    where idempotency_key = ${idempotencyKey}
  `);
};

export const recordResendEmailEvent = async (
  queryableDb: QueryableDb,
  { event, providerEventId }: RecordedEmailEventInput
): Promise<void> => {
  const { payload, providerMessageId, type } = getResendEventDetails(event);

  await queryableDb.execute(sql`
    insert into email_events (
      provider,
      provider_event_id,
      provider_message_id,
      type,
      payload,
      occurred_at
    )
    values (
      'resend',
      ${providerEventId},
      ${providerMessageId},
      ${type},
      ${JSON.stringify(payload)}::jsonb,
      now()
    )
    on conflict (provider, provider_event_id) do nothing
  `);
};

export const redactResendWebhookPayload = (
  event: unknown
): Record<string, unknown> => {
  const { payload, type } = getResendEventDetails(event);

  return {
    data: payload,
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

  try {
    const sender = createResendEmailSender({
      from: serverEnv.RESEND_FROM_EMAIL,
      resend: new Resend(serverEnv.RESEND_API_KEY),
    });
    const result = await sender.send({ idempotencyKey, template, to });

    await markEmailSent(db, idempotencyKey, result.providerMessageId);

    return result;
  } catch (error) {
    await markEmailFailed(db, idempotencyKey, error);
    throw error;
  }
};

export const sendWelcomeEmailIfConfigured = async (
  input: SendWelcomeEmailInput
): Promise<{
  providerMessageId?: string;
  status: "failed" | "sent" | "skipped";
}> => {
  if (!(serverEnv.RESEND_API_KEY && serverEnv.RESEND_FROM_EMAIL)) {
    return { status: "skipped" };
  }

  try {
    const result = await sendWelcomeEmail(input);
    return { providerMessageId: result.providerMessageId, status: "sent" };
  } catch {
    return { status: "failed" };
  }
};
