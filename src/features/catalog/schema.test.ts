import { describe, expect, it } from "vitest";
import { catalogSettingsSchema } from "@/features/catalog/schema";

describe("catalogSettingsSchema", () => {
  it("accepts contiguous installment rules from 1x up to the configured max", () => {
    const result = catalogSettingsSchema.parse({
      cardInstallmentRules: [
        { feePercent: 0, installments: 1 },
        { feePercent: 1.5, installments: 2 },
        { feePercent: 3, installments: 3 },
      ],
      idealMarkupPercent: 40,
      minimumMarkupPercent: 20,
    });

    expect(result.cardInstallmentRules).toHaveLength(3);
  });

  it("rejects gaps in the installment sequence", () => {
    expect(() =>
      catalogSettingsSchema.parse({
        cardInstallmentRules: [
          { feePercent: 0, installments: 1 },
          { feePercent: 3, installments: 3 },
        ],
        idealMarkupPercent: 40,
        minimumMarkupPercent: 20,
      })
    ).toThrowError(
      "As parcelas do cartao devem formar uma sequencia continua de 1x ate o maximo configurado."
    );
  });
});
