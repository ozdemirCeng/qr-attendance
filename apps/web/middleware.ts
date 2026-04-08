import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function resolveSessionCookieName() {
  const configuredName = process.env.AUTH_COOKIE_NAME?.trim();

  if (!configuredName) {
    return "session";
  }

  if (!COOKIE_NAME_PATTERN.test(configuredName)) {
    return "session";
  }

  return configuredName;
}

const AUTH_COOKIE_NAME = resolveSessionCookieName();

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPath = pathname.startsWith("/dashboard") || pathname.startsWith("/events");

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  let hasSessionCookie = false;

  try {
    hasSessionCookie = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  } catch {
    hasSessionCookie = Boolean(request.cookies.get("session")?.value);
  }

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
