import {
  isTruthySmokeEnv,
  runAdminDeploymentSmoke,
} from "../apps/admin/src/lib/deployment-smoke";

const main = async (): Promise<void> => {
  const result = await runAdminDeploymentSmoke({
    baseUrl:
      process.env.ADMIN_DEPLOYMENT_SMOKE_URL ?? process.env.ADMIN_APP_URL,
    expectProtected: isTruthySmokeEnv(
      process.env.ADMIN_DEPLOYMENT_SMOKE_PROTECTED
    ),
  });

  console.log(JSON.stringify(result, null, 2));
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
