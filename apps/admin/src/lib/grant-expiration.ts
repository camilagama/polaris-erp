import "server-only";

import { Temporal } from "@js-temporal/polyfill";

const LOCAL_MINUTE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const ENROLLMENT_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const parseGrantExpiration = (formData: FormData): Date => {
  const values = formData.getAll("expiresAt");
  const value = values[0];
  if (
    values.length !== 1 ||
    typeof value !== "string" ||
    !LOCAL_MINUTE_PATTERN.test(value)
  ) {
    throw new Error(
      "Informe uma única data e hora de expiração no fuso de São Paulo."
    );
  }

  let expiresAt: Date;
  try {
    const local = Temporal.PlainDateTime.from(value, { overflow: "reject" });
    const zoned = local.toZonedDateTime("America/Sao_Paulo", {
      disambiguation: "reject",
    });
    expiresAt = new Date(zoned.epochMilliseconds);
  } catch {
    throw new Error(
      "Data ou horário inválido, inexistente ou repetido no fuso de São Paulo. Escolha outro horário."
    );
  }

  if (expiresAt.getTime() <= Date.now()) {
    throw new Error("Platform admin grant requires a future expiration.");
  }
  return expiresAt;
};

export const getEnrollmentExpiration = (grantExpiresAt: Date): Date =>
  new Date(
    Math.min(Date.now() + ENROLLMENT_DURATION_MS, grantExpiresAt.getTime())
  );
