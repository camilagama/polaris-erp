export const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const normalizeNonNegativeNumber = (value: number) =>
  Math.max(0, Number.isFinite(value) ? value : 0);

export const normalizeMoney = (value: number) =>
  roundCurrency(normalizeNonNegativeNumber(value));

export const toCurrencyString = (value: number) =>
  normalizeMoney(value).toFixed(2);
