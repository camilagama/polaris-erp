import { config } from "dotenv";
import type { LocalDbPushTargetEnv } from "../packages/db/src/local-db-push-target";
import { validateLocalDbPushTarget } from "../packages/db/src/local-db-push-target";

config({ path: "../../.env.local" });
config({ path: ".env.local" });

if (import.meta.main) {
  try {
    validateLocalDbPushTarget(process.env as LocalDbPushTargetEnv);
    console.log("Local scratch database target accepted.");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown target validation error.";
    console.error(`db:push blocked: ${message}`);
    process.exitCode = 1;
  }
}
