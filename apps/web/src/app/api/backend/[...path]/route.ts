import { NextRequest, NextResponse } from "next/server";

const HOP_BY_HOP_HEADERS = new Set([
  "accept-encoding",
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveApiOrigin() {
  const internalOrigin = process.env.API_INTERNAL_URL?.trim();
  const publicOrigin = process.env.NEXT_PUBLIC_API_URL?.trim();
  const isDevelopment = process.env.NODE_ENV !== "production";

  if (internalOrigin) {
    return internalOrigin.replace(/\/+$/g, "");
  }

  if (isDevelopment) {
    // In local development, prefer local API unless API_INTERNAL_URL explicitly overrides it.
    return "http://localhost:3001";
  }

  if (publicOrigin) {
    return publicOrigin.replace(/\/+$/g, "");
  }

  throw new Error("API_INTERNAL_URL or NEXT_PUBLIC_API_URL must be configured");
}

function buildTargetUrl(request: NextRequest, pathSegments: string[]) {
  const pathname = pathSegments.join("/");
  return `${resolveApiOrigin()}/${pathname}${request.nextUrl.search}`;
}

function buildProxyRequestHeaders(request: NextRequest) {
  const headers = new Headers();

  for (const [key, value] of request.headers.entries()) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      continue;
    }

    headers.set(key, value);
  }

  headers.set("x-forwarded-host", request.nextUrl.host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  return headers;
}

function buildProxyResponseHeaders(response: Response) {
  const headers = new Headers();

  for (const [key, value] of response.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === "set-cookie" ||
      lowerKey === "content-encoding" ||
      HOP_BY_HOP_HEADERS.has(lowerKey)
    ) {
      continue;
    }

    headers.set(key, value);
  }

  const responseHeaders = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof responseHeaders.getSetCookie === "function") {
    for (const cookie of responseHeaders.getSetCookie()) {
      headers.append("set-cookie", cookie);
    }
    return headers;
  }

  const setCookieHeader = response.headers.get("set-cookie");
  if (setCookieHeader) {
    headers.append("set-cookie", setCookieHeader);
  }

  return headers;
}

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const method = request.method.toUpperCase();
  const backendResponse = await fetch(buildTargetUrl(request, path), {
    method,
    headers: buildProxyRequestHeaders(request),
    body:
      method === "GET" || method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    cache: "no-store",
    redirect: "manual",
  });
  const responseBody =
    method === "HEAD" || backendResponse.status === 204
      ? undefined
      : await backendResponse.arrayBuffer();

  return new NextResponse(responseBody, {
    status: backendResponse.status,
    headers: buildProxyResponseHeaders(backendResponse),
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
