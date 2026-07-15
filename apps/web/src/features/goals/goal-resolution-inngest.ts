import "server-only";

import { resolveActiveGoals } from "@/features/goals/goal-resolution";
import { inngest } from "@/lib/inngest-client";

const resolveActiveGoalsFunction = inngest.createFunction(
  {
    concurrency: { limit: 1 },
    id: "resolve-active-goals",
    name: "Resolve active goals",
    retries: 3,
    // The resolver always calculates the business date in America/Sao_Paulo.
    // Running hourly avoids relying on an infrastructure-specific cron timezone.
    triggers: [{ cron: "5 * * * *" }],
  },
  async ({ step }) => {
    const summary = await step.run("resolve-active-goals", () =>
      resolveActiveGoals()
    );

    return { summary };
  }
);

export const goalResolutionInngestFunctions = [resolveActiveGoalsFunction];
