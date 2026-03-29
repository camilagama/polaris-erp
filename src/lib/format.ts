const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const formatCurrency = (value: number | string | null | undefined) =>
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
