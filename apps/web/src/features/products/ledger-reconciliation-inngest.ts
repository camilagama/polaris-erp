import "server-only";

import { reconcileStockLedger } from "@/features/products/ledger-reconciliation";
import { inngest } from "@/lib/inngest-client";

const reconcileStockLedgerFunction = inngest.createFunction(
  {
    concurrency: { limit: 1 },
    id: "reconcile-stock-ledger",
    name: "Reconcile stock ledger",
    retries: 3,
    triggers: { cron: "25 4 * * *" },
  },
  async ({ step }) => {
    const summary = await step.run("reconcile-stock-ledger", () =>
      reconcileStockLedger()
    );

    return { summary };
  }
);

export const stockLedgerInngestFunctions = [reconcileStockLedgerFunction];
