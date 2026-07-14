const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

export const formatCurrency = (value: number | string | null | undefined) =>
  currencyFormatter.format(Number(value) || 0);
