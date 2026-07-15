import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { recordAuthLoginFailureAuditEvent } from "@/lib/auth-audit";

const handlers = toNextJsHandler(auth.handler);

const isGoogleCallback = (request: Request) =>
  new URL(request.url).pathname.endsWith("/callback/google");

const responseIndicatesOAuthFailure = (response: Response) => {
  if (response.status >= 400) {
    return true;
  }

  const location = response.headers.get("location");

  return location
    ? new URL(location, "http://localhost").searchParams.has("error")
    : false;
};

const observeAuthResponse = async (request: Request, response: Response) => {
  const requestUrl = new URL(request.url);
  const callbackFailed =
    isGoogleCallback(request) &&
    (requestUrl.searchParams.has("error") ||
      responseIndicatesOAuthFailure(response));

  if (callbackFailed) {
    await recordAuthLoginFailureAuditEvent({ reason: "callback_failed" });
  }

  return response;
};

export const GET = async (request: Request) =>
  observeAuthResponse(request, await handlers.GET(request));

export const POST = async (request: Request) =>
  observeAuthResponse(request, await handlers.POST(request));
