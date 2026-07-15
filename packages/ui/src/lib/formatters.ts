import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const compactNumberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  notation: "compact",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const formatCurrency = (value: number | string | null | undefined) =>
  currencyFormatter.format(Number(value) || 0);

export const formatCompactCurrency = (
  value: number | string | null | undefined
) => {
  const normalizedValue = Number(value) || 0;
  const prefix = normalizedValue < 0 ? "-R$ " : "R$ ";

  return `${prefix}${compactNumberFormatter.format(Math.abs(normalizedValue))}`;
};

export const formatDate = (value: Date | string | null) => {
  if (!value) {
    return "-";
  }

  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};

export const formatDateTime = (value: Date | string | null) => {
  if (!value) {
    return "-";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return dateTimeFormatter.format(date);
};

export const formatPercent = (
  value: number,
  {
    maximumFractionDigits = 2,
    minimumFractionDigits = 0,
  }: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  } = {}
) =>
  new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(value || 0);

export const formatCurrencyInput = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value || 0);

export const parseCurrencyInput = (value: string) => {
  const rawValue = value.replace(/\D/g, "");
  return Number(rawValue) / 100;
};

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR").format(value);
