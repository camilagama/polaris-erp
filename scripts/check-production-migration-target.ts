import { validateProductionMigrationTarget } from "../packages/db/src/production-migration-target";

if (import.meta.main) {
  try {
    const evidence = validateProductionMigrationTarget(
      process.env as Record<string, string | undefined>
    );

    console.log(
      JSON.stringify({
        status: "production-migration-target-confirmed",
        ...evidence,
      })
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown validation error.";
    console.error(`Production migration blocked: ${message}`);
    process.exitCode = 1;
  }
}
