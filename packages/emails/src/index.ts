export interface TransactionalEmailTemplate {
  html: string;
  subject: string;
  template: string;
  templateVersion: string;
  text: string;
}

export interface WelcomeEmailInput {
  appUrl: string;
  name: string;
}

export interface SendTransactionalEmailInput {
  idempotencyKey: string;
  template: TransactionalEmailTemplate;
  to: string;
}

export interface SendTransactionalEmailResult {
  providerMessageId: string;
}

interface ResendSendResult {
  data?: { id?: string } | null;
  error?: { message?: string } | null;
}

interface ResendEmailPayload {
  from: string;
  html: string;
  subject: string;
  text: string;
  to: string[];
}

interface ResendLikeClient {
  emails: {
    send: (
      payload: ResendEmailPayload,
      options?: { idempotencyKey: string }
    ) => Promise<ResendSendResult>;
  };
}

export interface ResendEmailSenderOptions {
  from: string;
  resend: ResendLikeClient;
}

const WELCOME_TEMPLATE_VERSION = "2026-07-09";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const renderWelcomeEmail = ({
  appUrl,
  name,
}: WelcomeEmailInput): TransactionalEmailTemplate => {
  const safeName = escapeHtml(name);

  return {
    html: `<main><h1>Bem-vindo ao Polaris, ${safeName}</h1><p>Acesse sua conta em <a href="${appUrl}">${appUrl}</a>.</p></main>`,
    subject: "Bem-vindo ao Polaris",
    template: "welcome",
    templateVersion: WELCOME_TEMPLATE_VERSION,
    text: `Bem-vindo ao Polaris, ${name}. Acesse sua conta em ${appUrl}.`,
  };
};

export const createResendEmailSender = ({
  from,
  resend,
}: ResendEmailSenderOptions) => ({
  send: async ({
    idempotencyKey,
    template,
    to,
  }: SendTransactionalEmailInput): Promise<SendTransactionalEmailResult> => {
    const { data, error } = await resend.emails.send(
      {
        from,
        html: template.html,
        subject: template.subject,
        text: template.text,
        to: [to],
      },
      { idempotencyKey }
    );

    if (error) {
      throw new Error(error.message ?? "Resend failed to send email.");
    }

    if (!data?.id) {
      throw new Error("Resend did not return an email id.");
    }

    return { providerMessageId: data.id };
  },
});
