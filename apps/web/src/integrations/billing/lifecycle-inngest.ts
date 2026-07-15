import { withInternalJobContext } from "@polaris/db/tenant-context";
import { downgradeDuePaidSubscriptions } from "@/integrations/billing/lifecycle";
import { inngest } from "@/lib/inngest-client";

const processBillingLifecycle = async (): Promise<string[]> =>
  withInternalJobContext("billing_lifecycle", (transaction) =>
    downgradeDuePaidSubscriptions(
      {
        transaction: async (callback) => callback(transaction),
      },
      new Date()
    )
  );

const billingLifecycleFunction = inngest.createFunction(
  {
    concurrency: { limit: 1 },
    id: "process-billing-lifecycle",
    retries: 5,
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async ({ step }) => {
    const organizationIds = await step.run("downgrade-due-subscriptions", () =>
      processBillingLifecycle()
    );

    return { downgradedOrganizationIds: organizationIds };
  }
);

export const billingLifecycleInngestFunctions = [billingLifecycleFunction];
