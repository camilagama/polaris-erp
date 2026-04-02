import { normalizeMoney } from "@/lib/domain/currency";

export interface CardInstallmentRule {
  feePercent: number;
  installments: number;
}

export const MAX_CARD_INSTALLMENTS = 12;
export const MIN_CARD_INSTALLMENTS = 1;

const normalizeInstallments = (value: number) => {
  if (!Number.isInteger(value)) {
    return 0;
  }

  if (value < MIN_CARD_INSTALLMENTS) {
    return 0;
  }

  if (value > MAX_CARD_INSTALLMENTS) {
    return MAX_CARD_INSTALLMENTS;
  }

  return value;
};

const toCardInstallmentRule = (
  rawRule: unknown
): CardInstallmentRule | undefined => {
  if (!(rawRule && typeof rawRule === "object")) {
    return undefined;
  }

  const maybeRule = rawRule as Partial<{
    feePercent: number;
    installments: number;
    paymentMethod: "card" | "pix";
  }>;

  if (maybeRule.paymentMethod === "pix") {
    return undefined;
  }

  const installments = normalizeInstallments(Number(maybeRule.installments));

  if (installments === 0) {
    return undefined;
  }

  return {
    feePercent: normalizeMoney(Number(maybeRule.feePercent)),
    installments,
  };
};

export const buildDefaultCardInstallmentRules = (
  maxInstallments = MIN_CARD_INSTALLMENTS
): CardInstallmentRule[] => {
  const normalizedMaxInstallments = normalizeInstallments(maxInstallments);
  const effectiveMaxInstallments =
    normalizedMaxInstallments === 0
      ? MIN_CARD_INSTALLMENTS
      : normalizedMaxInstallments;

  const rules: CardInstallmentRule[] = [];

  for (
    let installments = MIN_CARD_INSTALLMENTS;
    installments <= effectiveMaxInstallments;
    installments += 1
  ) {
    rules.push({
      feePercent: 0,
      installments,
    });
  }

  return rules;
};

export const normalizeCardInstallmentRules = (
  rawRules: unknown
): CardInstallmentRule[] => {
  if (!Array.isArray(rawRules)) {
    return buildDefaultCardInstallmentRules();
  }

  const rulesByInstallments = new Map<number, CardInstallmentRule>();

  for (const rawRule of rawRules) {
    const candidate = toCardInstallmentRule(rawRule);

    if (!candidate) {
      continue;
    }

    rulesByInstallments.set(candidate.installments, candidate);
  }

  const maxInstallments = Math.max(
    ...rulesByInstallments.keys(),
    MIN_CARD_INSTALLMENTS
  );
  const normalizedRules = buildDefaultCardInstallmentRules(maxInstallments);

  return normalizedRules.map((rule) => ({
    feePercent: rulesByInstallments.get(rule.installments)?.feePercent ?? 0,
    installments: rule.installments,
  }));
};

export const syncCardInstallmentRulesMax = (
  currentRules: CardInstallmentRule[],
  maxInstallments: number
): CardInstallmentRule[] => {
  const currentRulesByInstallments = new Map(
    normalizeCardInstallmentRules(currentRules).map((rule) => [
      rule.installments,
      rule.feePercent,
    ])
  );

  return buildDefaultCardInstallmentRules(maxInstallments).map((rule) => ({
    feePercent: currentRulesByInstallments.get(rule.installments) ?? 0,
    installments: rule.installments,
  }));
};

export const findCardInstallmentRule = (
  rules: CardInstallmentRule[],
  installments: number
): CardInstallmentRule | undefined =>
  normalizeCardInstallmentRules(rules).find(
    (rule) => rule.installments === installments
  );

export const getCardInstallmentRuleLabel = (installments: number) =>
  `${installments}x`;
