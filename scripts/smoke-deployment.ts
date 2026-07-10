import { runDeploymentSmoke } from "../apps/web/src/ops/deployment-smoke";

const deploymentSmokeUrl = process.env.DEPLOYMENT_SMOKE_URL;
const r2HealthSecret = process.env.INTERNAL_R2_HEALTH_SECRET;

const main = async () => {
  if (!deploymentSmokeUrl) {
    throw new Error("DEPLOYMENT_SMOKE_URL ausente.");
  }

  const result = await runDeploymentSmoke({
    appUrl: deploymentSmokeUrl,
    fetcher: fetch,
    r2HealthSecret,
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
