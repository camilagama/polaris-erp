import {
  normalizeMoney,
  normalizeNonNegativeNumber,
  roundCurrency,
} from "@/lib/domain/currency";

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

const normalizePercent = (value: number) => normalizeNonNegativeNumber(value);

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
