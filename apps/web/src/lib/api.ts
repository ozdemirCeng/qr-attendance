export type ApiErrorPayload = {
  success?: false;
  code?: string;
  message?: string;
  statusCode?: number;
};

export type ApiErrorCode =
  | "EXPIRED_TOKEN"
  | "INVALID_SIGNATURE"
  | "REPLAY_ATTACK"
  | "SESSION_NOT_FOUND"
  | "SESSION_INACTIVE"
  | "LOCATION_OUT_OF_RANGE"
  | "NO_LOCATION_DATA"
  | "ALREADY_CHECKED_IN"
  | "MALFORMED_TOKEN"
  | "REGISTRATION_REQUIRED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "TOO_MANY_REQUESTS"
  | "BAD_REQUEST"
  | "INTERNAL_SERVER_ERROR"
  | "NETWORK_ERROR"
  | "HTTP_EXCEPTION";

const errorMessageMap: Partial<Record<ApiErrorCode, string>> = {
  EXPIRED_TOKEN: "QR kodun suresi dolmus. Yeni kodu tarayin.",
  INVALID_SIGNATURE: "Gecersiz QR kodu.",
  MALFORMED_TOKEN: "Gecersiz QR kodu.",
  REPLAY_ATTACK: "Bu QR zaten kullanilmis.",
  SESSION_NOT_FOUND: "Etkinlik bulunamadi.",
  SESSION_INACTIVE: "Bu oturum henuz baslamadi veya sona erdi.",
  LOCATION_OUT_OF_RANGE: "Etkinlik alaninin disindasiniz.",
  NO_LOCATION_DATA: "Konum bilgisi alinamadi. Izin verip tekrar deneyin.",
  ALREADY_CHECKED_IN: "Bu etkinlige zaten katildiniz.",
  REGISTRATION_REQUIRED: "Kayit bulunamadi. Lutfen bilgilerinizi girin.",
  UNAUTHORIZED: "Oturumunuz gecersiz. Lutfen tekrar giris yapin.",
  FORBIDDEN: "Bu islem icin yetkiniz yok.",
  NOT_FOUND: "Istenen kaynak bulunamadi.",
  TOO_MANY_REQUESTS: "Cok fazla istek gonderdiniz. Lutfen biraz bekleyin.",
  BAD_REQUEST: "Gonderilen bilgiler gecersiz.",
  INTERNAL_SERVER_ERROR: "Sunucuda beklenmeyen bir hata olustu.",
  NETWORK_ERROR: "Baglanti sorunu. Internet baglantinizi kontrol edin.",
};

const statusCodeToFallbackCode: Partial<Record<number, ApiErrorCode>> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
};

export class ApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function resolveApiErrorCode(statusCode: number, code?: string): string {
  if (typeof code === "string" && code.trim()) {
    return code;
  }

  return statusCodeToFallbackCode[statusCode] ?? "HTTP_EXCEPTION";
}

export function resolveApiErrorMessage(input: {
  code?: string;
  statusCode?: number;
  fallbackMessage?: string;
}) {
  const normalizedCode =
    typeof input.code === "string" && input.code.trim()
      ? input.code.trim().toUpperCase()
      : undefined;

  if (normalizedCode && errorMessageMap[normalizedCode as ApiErrorCode]) {
    return errorMessageMap[normalizedCode as ApiErrorCode] ?? "Istek basarisiz oldu.";
  }

  if (input.statusCode === 0) {
    return errorMessageMap.NETWORK_ERROR ?? "Baglanti sorunu olustu.";
  }

  if (input.fallbackMessage?.trim()) {
    return input.fallbackMessage;
  }

  const fallbackCode =
    input.statusCode !== undefined ? statusCodeToFallbackCode[input.statusCode] : undefined;

  if (fallbackCode && errorMessageMap[fallbackCode]) {
    return errorMessageMap[fallbackCode] ?? "Istek basarisiz oldu.";
  }

  return "Istek basarisiz oldu.";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is required");
  }

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      resolveApiErrorMessage({ code: "NETWORK_ERROR", statusCode: 0 }),
      0,
      "NETWORK_ERROR",
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    const code = resolveApiErrorCode(response.status, payload.code);
    const message = resolveApiErrorMessage({
      code,
      statusCode: response.status,
      fallbackMessage: payload.message,
    });

    throw new ApiError(message, response.status, code);
  }

  return (await response.json()) as T;
}