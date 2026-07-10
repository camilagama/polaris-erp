import "server-only";

import { reconcileProductImages } from "@/features/products/image-reconcile";
import { inngest } from "@/lib/inngest-client";

const reconcileProductImagesFunction = inngest.createFunction(
  {
    id: "reconcile-product-images",
    name: "Reconcile product images",
    triggers: { cron: "0 4 * * *" },
  },
  async ({ step }) => {
    const result = await step.run("reconcile-product-images", () =>
      reconcileProductImages()
    );

    return { result };
  }
);

export const productImageInngestFunctions = [reconcileProductImagesFunction];
