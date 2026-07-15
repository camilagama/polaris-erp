import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const copySetCookieHeaders = (from: Response, to: NextResponse): void => {
  const headers = from.headers as Headers & { getSetCookie?: () => string[] };
  const setCookieHeaders = headers.getSetCookie?.() ?? [];

  for (const setCookieHeader of setCookieHeaders) {
    to.headers.append("set-cookie", setCookieHeader);
  }
};

export const GET = async (request: Request) => {
  const origin = new URL(request.url).origin;
  const authRequest = new Request(new URL("/api/auth/sign-in/social", origin), {
    body: JSON.stringify({
      callbackURL: "/",
      errorCallbackURL: "/sign-in",
      provider: "google",
      requestSignUp: true,
    }),
    headers: {
      "content-type": "application/json",
      origin,
    },
    method: "POST",
  });
  const authResponse = await auth.handler(authRequest);
  const body = (await authResponse.json().catch(() => null)) as {
    url?: string;
  } | null;

  if (!(authResponse.ok && body?.url)) {
    return NextResponse.redirect(new URL("/sign-in?error=google", origin));
  }

  const response = NextResponse.redirect(body.url);
  copySetCookieHeaders(authResponse, response);

  return response;
};
