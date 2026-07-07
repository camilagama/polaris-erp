interface E2eDatabaseEnv {
  ALLOW_E2E_SHARED_DATABASE?: string;
  CI?: string;
  E2E_DATABASE_URL?: string;
}

export const E2E_DATABASE_URL_REQUIRED_MESSAGE =
  "CI exige E2E_DATABASE_URL apontando para uma branch Neon dedicada (nao use o banco de producao). Veja docs/database-environments.md.";

export const validateE2eDatabaseEnv = (env: E2eDatabaseEnv): void => {
  const isCi = env.CI === "true";
  const e2eDatabaseUrl = env.E2E_DATABASE_URL;

  if (isCi && !e2eDatabaseUrl) {
    throw new Error(E2E_DATABASE_URL_REQUIRED_MESSAGE);
  }
};
