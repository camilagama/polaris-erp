import type {
  SaleListItem,
  SalePaymentFeePayer,
  SalePaymentMethod,
} from "@/features/sales/contracts";

/** List/detail rows use operational status (confirmed sale vs cancellation). */
export const getOperationalSaleStatusLabel = (
  status: SaleListItem["status"]
): string => {
  if (status === "cancelled") {
    return "Cancelada";
  }

  return "Concluida";
};

export const formatSaleListPaymentMethodLabel = (
  sale: Pick<SaleListItem, "paymentInstallments" | "paymentMethod">
): string => {
  if (sale.paymentMethod === "pix") {
    return "Pix";
  }

  return `Cartao ${sale.paymentInstallments}x`;
};

export const formatSaleDetailPaymentMethodLabel = ({
  paymentFeePayer,
  paymentInstallments,
  paymentMethod,
}: {
  paymentFeePayer: SalePaymentFeePayer;
  paymentInstallments: number;
  paymentMethod: SalePaymentMethod;
}): string => {
  if (paymentMethod === "pix") {
    return "Pix";
  }

  const payerLabel = paymentFeePayer === "seller" ? "vendedor" : "cliente";

  return `Cartao ${paymentInstallments}x (${payerLabel})`;
};
