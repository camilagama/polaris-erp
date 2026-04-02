import { describe, expect, it } from "vitest";
import {
  buildDefaultCardInstallmentRules,
  findCardInstallmentRule,
  normalizeCardInstallmentRules,
  syncCardInstallmentRulesMax,
} from "@/features/catalog/payment-rules";

describe("payment rules", () => {
  it("builds a contiguous default range from 1x to the configured max", () => {
    expect(buildDefaultCardInstallmentRules(3)).toEqual([
      { feePercent: 0, installments: 1 },
      { feePercent: 0, installments: 2 },
      { feePercent: 0, installments: 3 },
    ]);
  });

  it("normalizes legacy rules and removes pix entries", () => {
    expect(
      normalizeCardInstallmentRules([
        {
          code: "pix",
          feePercent: 0,
          installments: 0,
          paymentMethod: "pix",
        },
        {
          code: "1x",
          feePercent: 1,
          installments: 1,
          paymentMethod: "card",
        },
        {
          code: "3x",
          feePercent: 3,
          installments: 3,
          paymentMethod: "card",
        },
      ])
    ).toEqual([
      { feePercent: 1, installments: 1 },
      { feePercent: 0, installments: 2 },
      { feePercent: 3, installments: 3 },
    ]);
  });

  it("expands and trims the configured max installments while preserving existing values", () => {
    const expandedRules = syncCardInstallmentRulesMax(
      [
        { feePercent: 0, installments: 1 },
        { feePercent: 2, installments: 2 },
      ],
      4
    );

    expect(expandedRules).toEqual([
      { feePercent: 0, installments: 1 },
      { feePercent: 2, installments: 2 },
      { feePercent: 0, installments: 3 },
      { feePercent: 0, installments: 4 },
    ]);

    expect(syncCardInstallmentRulesMax(expandedRules, 2)).toEqual([
      { feePercent: 0, installments: 1 },
      { feePercent: 2, installments: 2 },
    ]);
  });

  it("finds rules by installment count", () => {
    const rules = [
      { feePercent: 0, installments: 1 },
      { feePercent: 3, installments: 3 },
    ];

    expect(findCardInstallmentRule(rules, 3)).toEqual({
      feePercent: 3,
      installments: 3,
    });
  });
});
