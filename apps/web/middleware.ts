import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPath = pathname.startsWith("/dashboard") || pathname.startsWith("/events");

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  if (hasSessionCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/events/:path*"],
};
