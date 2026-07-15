import { serve } from "inngest/next";
import { goalResolutionInngestFunctions } from "@/features/goals/goal-resolution-inngest";
import { productImageInngestFunctions } from "@/features/products/image-reconcile-inngest";
import { stockLedgerInngestFunctions } from "@/features/products/ledger-reconciliation-inngest";
import { billingLifecycleInngestFunctions } from "@/integrations/billing/lifecycle-inngest";
import { inngest } from "@/lib/inngest-client";
import { inngestFunctions } from "@/lib/inngest-functions";

export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    ...inngestFunctions,
    ...goalResolutionInngestFunctions,
    ...productImageInngestFunctions,
    ...stockLedgerInngestFunctions,
    ...billingLifecycleInngestFunctions,
  ],
});
