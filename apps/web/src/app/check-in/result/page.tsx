import Link from "next/link";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { resolveApiErrorMessage } from "@/lib/api";

type ResultPageProps = {
  searchParams: {
    status?: string;
    code?: string;
    name?: string;
    event?: string;
    eventId?: string;
  };
};

type ErrorMeta = {
  title: string;
  badge: string;
  hint: string;
  toneColor: string;
  toneBg: string;
};

type ResultAction = {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

const errorMetaMap: Record<string, ErrorMeta> = {
  EXPIRED_TOKEN: {
    title: "QR Süresi Doldu",
    badge: "QR",
    hint: "Güncel kodu tekrar tarayın.",
    toneColor: "var(--warning)",
    toneBg: "var(--warning-soft)",
  },
  INVALID_SIGNATURE: {
    title: "Geçersiz QR",
    badge: "QR",
    hint: "QR kodunu yenileyip tekrar deneyin.",
    toneColor: "var(--error)",
    toneBg: "var(--error-soft)",
  },
  MALFORMED_TOKEN: {
    title: "Geçersiz QR",
    badge: "QR",
    hint: "Kod eksik veya bozuk görünüyor.",
    toneColor: "var(--error)",
    toneBg: "var(--error-soft)",
  },
  REPLAY_ATTACK: {
    title: "QR Zaten Kullanıldı",
    badge: "QR",
    hint: "Aynı kod ikinci kez kullanılamaz.",
    toneColor: "var(--error)",
    toneBg: "var(--error-soft)",
  },
  SESSION_NOT_FOUND: {
    title: "Etkinlik Bulunamadı",
    badge: "404",
    hint: "Etkinlik bilgisini kontrol edip tekrar deneyin.",
    toneColor: "var(--text-secondary)",
    toneBg: "var(--surface-soft)",
  },
  SESSION_INACTIVE: {
    title: "Oturum Aktif Değil",
    badge: "OT",
    hint: "Tarama zamanı dışında işlem yapıldı.",
    toneColor: "var(--primary)",
    toneBg: "var(--surface-soft)",
  },
  LOCATION_OUT_OF_RANGE: {
    title: "Konum Uygun Değil",
    badge: "GPS",
    hint: "Etkinlik alanına yaklaşıp tekrar deneyin.",
    toneColor: "var(--error)",
    toneBg: "var(--error-soft)",
  },
  NO_LOCATION_DATA: {
    title: "Konum Gerekli",
    badge: "GPS",
    hint: "Konum izni olmadan yoklama tamamlanamaz.",
    toneColor: "var(--warning)",
    toneBg: "var(--warning-soft)",
  },
  PHOTO_REQUIRED: {
    title: "Fotoğraf Gerekli",
    badge: "CAM",
    hint: "Selfie ekleyip tekrar deneyin.",
    toneColor: "var(--warning)",
    toneBg: "var(--warning-soft)",
  },
  ALREADY_CHECKED_IN: {
    title: "Yoklama Zaten Alınmış",
    badge: "OK",
    hint: "Aynı oturum için ikinci kez yoklama alınmaz.",
    toneColor: "var(--success)",
    toneBg: "var(--success-soft)",
  },
  REGISTRATION_REQUIRED: {
    title: "Kayıt Gerekli",
    badge: "KYT",
    hint: "Bilgilerinizi girerek devam edin.",
    toneColor: "var(--warning)",
    toneBg: "var(--warning-soft)",
  },
  BAD_REQUEST: {
    title: "Gönderilen Bilgi Geçersiz",
    badge: "ERR",
    hint: "Bilgileri kontrol edip tekrar deneyin.",
    toneColor: "var(--warning)",
    toneBg: "var(--warning-soft)",
  },
  UNAUTHORIZED: {
    title: "Yetkisiz İşlem",
    badge: "401",
    hint: "Oturumunuz kapanmış olabilir.",
    toneColor: "var(--error)",
    toneBg: "var(--error-soft)",
  },
  INTERNAL_SERVER_ERROR: {
    title: "Sunucu Hatası",
    badge: "500",
    hint: "Biraz sonra tekrar deneyin.",
    toneColor: "var(--error)",
    toneBg: "var(--error-soft)",
  },
  NETWORK_ERROR: {
    title: "Bağlantı Hatası",
    badge: "NET",
    hint: "Bağlantı sağlandığında tekrar deneyin.",
    toneColor: "var(--text-secondary)",
    toneBg: "var(--surface-soft)",
  },
  UNKNOWN_ERROR: {
    title: "İşlem Başarısız",
    badge: "ERR",
    hint: "Tekrar deneyin. Sorun devam ederse yöneticiye bildirin.",
    toneColor: "var(--text-secondary)",
    toneBg: "var(--surface-soft)",
  },
};

function resolveAction(
  isSuccess: boolean,
  code: string,
  eventId: string | null,
): ResultAction {
  const scanHref = eventId ? `/check-in/${eventId}` : "/check-in";

  if (isSuccess) {
    return {
      primaryLabel: "Yeni Tarama",
      primaryHref: scanHref,
      secondaryLabel: "Tarama Ekranı",
      secondaryHref: "/scan",
    };
  }

  if (
    code === "NO_LOCATION_DATA" ||
    code === "LOCATION_OUT_OF_RANGE" ||
    code === "PHOTO_REQUIRED"
  ) {
    return {
      primaryLabel: "Tekrar Dene",
      primaryHref: scanHref,
      secondaryLabel: "Tarama Ekranı",
      secondaryHref: "/scan",
    };
  }

  if (code === "ALREADY_CHECKED_IN") {
    return {
      primaryLabel: "Başka Kod Tara",
      primaryHref: "/check-in",
      secondaryLabel: "Tarama Ekranı",
      secondaryHref: "/scan",
    };
  }

  return {
    primaryLabel: "Tekrar Dene",
    primaryHref: scanHref,
    secondaryLabel: "Tarama Ekranı",
    secondaryHref: "/scan",
  };
}

export default function CheckInResultPage({ searchParams }: ResultPageProps) {
  const isSuccess = searchParams.status === "success";
  const name =
    typeof searchParams.name === "string"
      ? decodeURIComponent(searchParams.name)
      : "";
  const eventName =
    typeof searchParams.event === "string"
      ? decodeURIComponent(searchParams.event)
      : "";
  const code =
    typeof searchParams.code === "string"
      ? searchParams.code
      : "UNKNOWN_ERROR";
  const eventId =
    typeof searchParams.eventId === "string" && searchParams.eventId.trim()
      ? decodeURIComponent(searchParams.eventId)
      : null;

  const normalizedCode = code.toUpperCase();
  const errorMeta = errorMetaMap[normalizedCode] ?? errorMetaMap.UNKNOWN_ERROR;
  const action = resolveAction(isSuccess, normalizedCode, eventId);
  const errorMessage = resolveApiErrorMessage({
    code: normalizedCode,
    fallbackMessage: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <section className="glass-elevated w-full max-w-xl rounded-3xl p-8 text-center">
        {isSuccess ? (
          <>
            <div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-lg font-bold"
              style={{ background: "var(--success-soft)" }}
            >
              OK
            </div>
            <h1
              className="mt-4 text-3xl font-extrabold"
              style={{ color: "var(--text-primary)" }}
              data-display="true"
            >
              Yoklama Alındı
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              {(name || "Katılımcı") + " için işlem tamamlandı."}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
              {eventName}
            </p>
          </>
        ) : (
          <>
            <div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-lg font-bold"
              style={{ background: errorMeta.toneBg, color: errorMeta.toneColor }}
            >
              {errorMeta.badge}
            </div>
            <h1
              className="mt-4 text-3xl font-extrabold"
              style={{ color: errorMeta.toneColor }}
              data-display="true"
            >
              {errorMeta.title}
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              {errorMessage}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
              {errorMeta.hint}
            </p>
            <p
              className="mt-1 font-mono text-[10px] uppercase tracking-wide"
              style={{ color: "var(--text-tertiary)" }}
            >
              Kod: {normalizedCode}
            </p>
          </>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Link href={action.primaryHref} className="btn-primary text-sm">
            {action.primaryLabel}
          </Link>
          <Link href={action.secondaryHref} className="btn-secondary text-sm">
            {action.secondaryLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
