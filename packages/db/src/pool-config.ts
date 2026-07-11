export const DEFAULT_DATABASE_POOL_MAX = 3;
export const MIN_DATABASE_POOL_MAX = 1;
export const MAX_DATABASE_POOL_MAX = 20;

export const resolveDatabasePoolMax = (
  value: string | undefined = process.env.DATABASE_POOL_MAX
): number => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return DEFAULT_DATABASE_POOL_MAX;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < MIN_DATABASE_POOL_MAX ||
    parsedValue > MAX_DATABASE_POOL_MAX
  ) {
    throw new Error(
      `DATABASE_POOL_MAX must be an integer between ${MIN_DATABASE_POOL_MAX} and ${MAX_DATABASE_POOL_MAX}.`
    );
  }

  return parsedValue;
};
