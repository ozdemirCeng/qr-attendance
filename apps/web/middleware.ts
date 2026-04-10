import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function resolveCookieName(
  configuredName: string | undefined,
  fallback: string,
) {
  const normalizedName = configuredName?.trim();

  if (!normalizedName) {
    return fallback;
  }

  if (!COOKIE_NAME_PATTERN.test(normalizedName)) {
    return fallback;
  }

  return normalizedName;
}

const AUTH_COOKIE_NAME = resolveCookieName(
  process.env.AUTH_COOKIE_NAME,
  "session",
);
const PARTICIPANT_COOKIE_NAME = resolveCookieName(
  process.env.PARTICIPANT_COOKIE_NAME,
  "participant_session",
);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminProtectedPath =
    pathname.startsWith("/dashboard") || pathname.startsWith("/events");
  const isParticipantProtectedPath = pathname.startsWith("/profile");

  if (!isAdminProtectedPath && !isParticipantProtectedPath) {
    return NextResponse.next();
  }

  const requiredCookieName = isAdminProtectedPath
    ? AUTH_COOKIE_NAME
    : PARTICIPANT_COOKIE_NAME;
  const loginRole = isAdminProtectedPath ? "admin" : "participant";
  let hasSessionCookie = false;

  try {
    hasSessionCookie = Boolean(request.cookies.get(requiredCookieName)?.value);
  } catch {
    hasSessionCookie = Boolean(
      request.cookies.get(
        isAdminProtectedPath ? "session" : "participant_session",
      )?.value,
    );
  }

  if (hasSessionCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("role", loginRole);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/events/:path*", "/profile/:path*"],
};
