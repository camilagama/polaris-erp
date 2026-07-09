import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const publicAuthRoutes = ["/register", "/sign-in"];

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;
  const isAuthRoute = publicAuthRoutes.includes(pathname);

  if (!(sessionCookie || isAuthRoute)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (sessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Proxy remains an optimistic edge barrier only.
  // Route-level auth is still enforced in layouts and server actions.
  matcher: [
    "/",
    "/sign-in",
    "/onboarding",
    "/produtos/:path*",
    "/vendas/:path*",
    "/configuracoes/:path*",
  ],
};
