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
  | "PHOTO_REQUIRED"
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
  EXPIRED_TOKEN: "QR kodun süresi doldu. Yeni kodu tarayın.",
  INVALID_SIGNATURE: "Geçersiz QR kodu.",
  MALFORMED_TOKEN: "Geçersiz QR kodu.",
  REPLAY_ATTACK: "Bu QR kod daha önce kullanıldı.",
  SESSION_NOT_FOUND: "Etkinlik veya oturum bulunamadı.",
  SESSION_INACTIVE: "Bu oturum henüz başlamadı veya sona erdi.",
  LOCATION_OUT_OF_RANGE: "Etkinlik alanının dışındasınız.",
  NO_LOCATION_DATA: "Konum bilgisi alınamadı. İzin verip tekrar deneyin.",
  PHOTO_REQUIRED: "Selfie gerekli. Lütfen fotoğraf çekin.",
  ALREADY_CHECKED_IN: "Bu oturum için yoklamanız zaten alınmış.",
  REGISTRATION_REQUIRED: "Kayıt bulunamadı. Bilgilerinizi girerek devam edin.",
  UNAUTHORIZED: "Oturumunuz geçersiz. Tekrar giriş yapın.",
  FORBIDDEN: "Bu işlem için yetkiniz yok.",
  NOT_FOUND: "İstenen kaynak bulunamadı.",
  TOO_MANY_REQUESTS: "Çok fazla istek gönderdiniz. Biraz bekleyip tekrar deneyin.",
  BAD_REQUEST: "Gönderilen bilgiler geçersiz.",
  INTERNAL_SERVER_ERROR: "Sunucuda beklenmeyen bir hata oluştu.",
  NETWORK_ERROR: "Bağlantı sorunu. İnternet bağlantınızı kontrol edin.",
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

export const WEB_API_PROXY_PREFIX = "/api/backend";

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
    return (
      errorMessageMap[normalizedCode as ApiErrorCode] ??
      "İstek başarısız oldu."
    );
  }

  if (input.statusCode === 0) {
    return errorMessageMap.NETWORK_ERROR ?? "Bağlantı sorunu oluştu.";
  }

  if (input.fallbackMessage?.trim()) {
    return input.fallbackMessage;
  }

  const fallbackCode =
    input.statusCode !== undefined
      ? statusCodeToFallbackCode[input.statusCode]
      : undefined;

  if (fallbackCode && errorMessageMap[fallbackCode]) {
    return errorMessageMap[fallbackCode] ?? "İstek başarısız oldu.";
  }

  return "İstek başarısız oldu.";
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${WEB_API_PROXY_PREFIX}${path}`, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
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
    const payload = (await response
      .json()
      .catch(() => ({}))) as ApiErrorPayload;
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
