import { toNumber } from "@/lib/domain/calculations";

export const formatCurrency = (value: number | string) =>
  toNumber(value).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });

export const formatDateTime = (value: Date | string | null) => {
  if (!value) {
    return "-";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export const formatDate = (value: Date | string | null) => {
  if (!value) {
    return "-";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
};
