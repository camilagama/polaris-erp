import { validateProductionPreflight } from "../apps/web/src/ops/production-preflight";
import { readProductionPreflightEnv } from "../apps/web/src/ops/production-preflight-env";

const result = validateProductionPreflight(
  readProductionPreflightEnv(process.env)
);

if (!result.ok) {
  console.error(
    [
      "Production preflight failed:",
      ...result.errors.map((error) => `- ${error}`),
    ].join("\n")
  );
  process.exit(1);
}

console.log("production-preflight-ok");
