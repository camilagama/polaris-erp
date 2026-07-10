interface RestoreDrillEnv {
  RESTORE_DRILL_CONFIRMED_AT?: string;
  RESTORE_DRILL_RESTORE_BRANCH?: string;
  RESTORE_DRILL_SOURCE_BRANCH?: string;
  RESTORE_DRILL_VALIDATED_BY?: string;
}

const REQUIRED_ENV_NAMES = [
  "RESTORE_DRILL_CONFIRMED_AT",
  "RESTORE_DRILL_SOURCE_BRANCH",
  "RESTORE_DRILL_RESTORE_BRANCH",
  "RESTORE_DRILL_VALIDATED_BY",
] as const;

export const validateRestoreDrillEnv = (env: RestoreDrillEnv): void => {
  const missing = REQUIRED_ENV_NAMES.filter((name) => !env[name]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Restore drill evidence is incomplete. Missing: ${missing.join(", ")}.`
    );
  }

  const confirmedAt = new Date(env.RESTORE_DRILL_CONFIRMED_AT as string);
  if (Number.isNaN(confirmedAt.getTime())) {
    throw new Error("RESTORE_DRILL_CONFIRMED_AT must be an ISO timestamp.");
  }

  if (env.RESTORE_DRILL_SOURCE_BRANCH === env.RESTORE_DRILL_RESTORE_BRANCH) {
    throw new Error(
      "RESTORE_DRILL_RESTORE_BRANCH must be a restored validation branch, not the source branch."
    );
  }
};

if (import.meta.main) {
  try {
    validateRestoreDrillEnv(process.env as RestoreDrillEnv);
    console.log(
      JSON.stringify(
        {
          confirmedAt: process.env.RESTORE_DRILL_CONFIRMED_AT,
          restoreBranch: process.env.RESTORE_DRILL_RESTORE_BRANCH,
          sourceBranch: process.env.RESTORE_DRILL_SOURCE_BRANCH,
          validatedBy: process.env.RESTORE_DRILL_VALIDATED_BY,
        },
        null,
        2
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}
