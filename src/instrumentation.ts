import type { Instrumentation } from "next";

export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.info("[dgimports] instrumentation register (nodejs)");
  }
}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context
) => {
  const message = error instanceof Error ? error.message : String(error);
  const digest =
    error !== null &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
      ? (error as { digest: string }).digest
      : undefined;

  console.error(
    JSON.stringify({
      digest,
      message,
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
    })
  );
};
