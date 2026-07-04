import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const getSafeCallbackUrl = (callbackUrl: string | null) =>
  callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
    ? callbackUrl
    : "/";

const copySetCookieHeaders = ({
  from,
  to,
}: {
  from: Response;
  to: NextResponse;
}) => {
  const headers = from.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookieHeaders = headers.getSetCookie?.() ?? [];

  if (setCookieHeaders.length > 0) {
    for (const setCookieHeader of setCookieHeaders) {
      to.headers.append("set-cookie", setCookieHeader);
    }
    return;
  }

  const setCookieHeader = from.headers.get("set-cookie");

  if (setCookieHeader) {
    to.headers.append("set-cookie", setCookieHeader);
  }
};

export const GET = async (request: NextRequest) => {
  const callbackURL = getSafeCallbackUrl(
    request.nextUrl.searchParams.get("callbackUrl")
  );
  const authRequest = new Request(
    new URL("/api/auth/sign-in/social", request.url),
    {
      body: JSON.stringify({
        callbackURL,
        errorCallbackURL: "/sign-in?error=google",
        newUserCallbackURL: "/onboarding",
        provider: "google",
        requestSignUp: true,
      }),
      headers: {
        "content-type": "application/json",
        origin: request.nextUrl.origin,
      },
      method: "POST",
    }
  );
  const authResponse = await auth.handler(authRequest);
  const body = (await authResponse.json().catch(() => null)) as {
    message?: string;
    url?: string;
  } | null;

  if (!(authResponse.ok && body?.url)) {
    const errorUrl = new URL("/sign-in", request.url);
    errorUrl.searchParams.set(
      "error",
      body?.message ?? "google_oauth_unavailable"
    );

    return NextResponse.redirect(errorUrl);
  }

  const response = NextResponse.redirect(body.url);
  copySetCookieHeaders({ from: authResponse, to: response });

  return response;
};
