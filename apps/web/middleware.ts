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

  const isPublicEventPath = pathname.match(/^\/events\/[^/]+\/display/);

  const isAdminProtectedPath =
    (pathname.startsWith("/dashboard") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/audit")) &&
    !isPublicEventPath;
  const isParticipantProtectedPath =
    pathname.startsWith("/profile") || pathname.startsWith("/user");

  if (!isAdminProtectedPath && !isParticipantProtectedPath) {
    return NextResponse.next();
  }

  let hasAdminSessionCookie = false;
  let hasParticipantSessionCookie = false;

  try {
    hasAdminSessionCookie = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
    hasParticipantSessionCookie = Boolean(
      request.cookies.get(PARTICIPANT_COOKIE_NAME)?.value,
    );
  } catch {
    hasAdminSessionCookie = Boolean(request.cookies.get("session")?.value);
    hasParticipantSessionCookie = Boolean(
      request.cookies.get("participant_session")?.value,
    );
  }

  if (
    (isAdminProtectedPath && hasAdminSessionCookie) ||
    (isParticipantProtectedPath && hasParticipantSessionCookie)
  ) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/events/:path*",
    "/audit/:path*",
    "/profile/:path*",
    "/user/:path*",
  ],
};
