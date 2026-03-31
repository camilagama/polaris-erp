export type PaymentRuleMethod = "card" | "pix";

export interface PaymentFeeRule {
  code: string;
  feePercent: number;
  installments: number;
  paymentMethod: PaymentRuleMethod;
}

export const MAX_CARD_INSTALLMENTS = 12;
export const PIX_RULE_CODE = "pix";
export const ONE_TIME_CARD_RULE_CODE = "1x";

const roundToTwo = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const normalizeFeePercent = (value: number) =>
  roundToTwo(Math.max(0, Number.isFinite(value) ? value : 0));

const normalizeInstallments = (value: number) => {
  if (!Number.isInteger(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > MAX_CARD_INSTALLMENTS) {
    return MAX_CARD_INSTALLMENTS;
  }

  return value;
};

const buildPixRule = (feePercent = 0): PaymentFeeRule => ({
  code: PIX_RULE_CODE,
  feePercent: normalizeFeePercent(feePercent),
  installments: 0,
  paymentMethod: "pix",
});

const buildCardRule = (
  installments: number,
  feePercent = 0
): PaymentFeeRule => ({
  code: `${installments}x`,
  feePercent: normalizeFeePercent(feePercent),
  installments,
  paymentMethod: "card",
});

export const buildDefaultPaymentFeeRules = (
  oneTimeCardFeePercent = 0
): PaymentFeeRule[] => [
  buildPixRule(0),
  buildCardRule(1, oneTimeCardFeePercent),
];

const isValidPixRule = (rule: PaymentFeeRule) =>
  rule.paymentMethod === "pix" &&
  rule.code === PIX_RULE_CODE &&
  rule.installments === 0;

const isValidCardRule = (rule: PaymentFeeRule) =>
  rule.paymentMethod === "card" &&
  rule.installments >= 1 &&
  rule.installments <= MAX_CARD_INSTALLMENTS &&
  rule.code === `${rule.installments}x`;

const isValidRule = (rule: PaymentFeeRule) =>
  isValidPixRule(rule) || isValidCardRule(rule);

const toCandidateRule = (rawRule: unknown): PaymentFeeRule | null => {
  if (!(rawRule && typeof rawRule === "object")) {
    return null;
  }

  const maybeRule = rawRule as Partial<PaymentFeeRule>;
  const installments = normalizeInstallments(Number(maybeRule.installments));

  const paymentMethod: PaymentRuleMethod =
    maybeRule.paymentMethod === "card" ? "card" : "pix";

  if (paymentMethod === "pix") {
    return buildPixRule(Number(maybeRule.feePercent));
  }

  if (installments < 1) {
    return null;
  }

  return buildCardRule(installments, Number(maybeRule.feePercent));
};

export const sortPaymentFeeRules = (
  rules: PaymentFeeRule[]
): PaymentFeeRule[] =>
  [...rules].sort((left, right) => {
    if (left.paymentMethod === "pix" && right.paymentMethod !== "pix") {
      return -1;
    }

    if (left.paymentMethod !== "pix" && right.paymentMethod === "pix") {
      return 1;
    }

    return left.installments - right.installments;
  });

export const normalizePaymentFeeRules = (
  rawRules: unknown,
  fallbackCardFeePercent = 0
): PaymentFeeRule[] => {
  const defaultRules = buildDefaultPaymentFeeRules(fallbackCardFeePercent);

  if (!Array.isArray(rawRules)) {
    return defaultRules;
  }

  const byCode = new Map<string, PaymentFeeRule>();

  for (const rawRule of rawRules) {
    const candidate = toCandidateRule(rawRule);

    if (!(candidate && isValidRule(candidate))) {
      continue;
    }

    byCode.set(candidate.code, candidate);
  }

  if (!byCode.has(PIX_RULE_CODE)) {
    byCode.set(PIX_RULE_CODE, buildPixRule(0));
  }

  if (!byCode.has(ONE_TIME_CARD_RULE_CODE)) {
    byCode.set(
      ONE_TIME_CARD_RULE_CODE,
      buildCardRule(1, fallbackCardFeePercent)
    );
  }

  return sortPaymentFeeRules([...byCode.values()]);
};

export const getPaymentRuleLabel = (rule: PaymentFeeRule) => {
  if (rule.paymentMethod === "pix") {
    return "Pix";
  }

  return `${rule.installments}x`;
};

export const getAvailableCardInstallments = (rules: PaymentFeeRule[]) => {
  const configuredCardInstallments = new Set(
    rules
      .filter((rule) => rule.paymentMethod === "card")
      .map((rule) => rule.installments)
  );

  const available: number[] = [];

  for (
    let installments = 2;
    installments <= MAX_CARD_INSTALLMENTS;
    installments += 1
  ) {
    if (!configuredCardInstallments.has(installments)) {
      available.push(installments);
    }
  }

  return available;
};

export const findPaymentRuleByCode = (
  rules: PaymentFeeRule[],
  code: string
): PaymentFeeRule | undefined => rules.find((rule) => rule.code === code);
