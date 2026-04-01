import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseIsoDate } from "@/lib/domain/date";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
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

export const formatDate = (value: string) =>
  format(parseIsoDate(value), "dd/MM/yyyy", { locale: ptBR });

export const formatDateTime = (value: Date | null) => {
  if (!value) {
    return "-";
  }

  return dateTimeFormatter.format(value);
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
