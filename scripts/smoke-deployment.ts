import { runDeploymentSmoke } from "@/lib/deployment-smoke";

const deploymentSmokeUrl = process.env.DEPLOYMENT_SMOKE_URL;
const cronSecret = process.env.CRON_SECRET;

const main = async () => {
  if (!deploymentSmokeUrl) {
    throw new Error("DEPLOYMENT_SMOKE_URL ausente.");
  }

  const result = await runDeploymentSmoke({
    appUrl: deploymentSmokeUrl,
    cronSecret,
    fetcher: fetch,
  });

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
