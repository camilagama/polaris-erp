interface SentrySamplingInput {
  nodeEnv?: string;
  replaysOnErrorSampleRate?: string;
  replaysSessionSampleRate?: string;
  tracesSampleRate?: string;
}

interface SentrySamplingConfig {
  replaysOnErrorSampleRate: number;
  replaysSessionSampleRate: number;
  tracesSampleRate: number;
}

const parseSamplingRate = (
  value: string | undefined,
  fallback: number
): number => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : fallback;
};

export const getSentrySamplingConfig = ({
  nodeEnv,
  replaysOnErrorSampleRate,
  replaysSessionSampleRate,
  tracesSampleRate,
}: SentrySamplingInput): SentrySamplingConfig => {
  const defaultTracesSampleRate = nodeEnv === "development" ? 1 : 0.1;

  return {
    replaysOnErrorSampleRate: parseSamplingRate(replaysOnErrorSampleRate, 1),
    replaysSessionSampleRate: parseSamplingRate(replaysSessionSampleRate, 0),
    tracesSampleRate: parseSamplingRate(
      tracesSampleRate,
      defaultTracesSampleRate
    ),
  };
};
