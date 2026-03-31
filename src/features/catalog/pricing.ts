interface PricingSettingsInput {
  idealMarkupPercent: number;
  minimumMarkupPercent: number;
}

interface PricingSuggestion extends PricingSettingsInput {
  costPrice: number;
  currentPrice?: number;
  idealPrice: number;
  isBelowMinimum: boolean;
  minimumPrice: number;
}

const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const normalizePercent = (value: number) => Math.max(0, value);
const normalizeMoney = (value: number) => Math.max(0, value);

export const calculateSuggestedPrices = ({
  costPrice,
  currentPrice,
  idealMarkupPercent,
  minimumMarkupPercent,
}: PricingSettingsInput & {
  costPrice: number;
  currentPrice?: number;
}): PricingSuggestion => {
  const normalizedCost = normalizeMoney(costPrice);
  const normalizedMinimumMarkup = normalizePercent(minimumMarkupPercent);
  const normalizedIdealMarkup = normalizePercent(idealMarkupPercent);
  const normalizedCurrentPrice =
    currentPrice === undefined ? undefined : normalizeMoney(currentPrice);
  const minimumPrice = roundCurrency(
    normalizedCost * (1 + normalizedMinimumMarkup / 100)
  );
  const idealPrice = roundCurrency(
    normalizedCost * (1 + normalizedIdealMarkup / 100)
  );

  return {
    costPrice: normalizedCost,
    currentPrice: normalizedCurrentPrice,
    idealMarkupPercent: normalizedIdealMarkup,
    idealPrice,
    isBelowMinimum:
      normalizedCurrentPrice !== undefined &&
      normalizedCurrentPrice < minimumPrice,
    minimumMarkupPercent: normalizedMinimumMarkup,
    minimumPrice,
  };
};
