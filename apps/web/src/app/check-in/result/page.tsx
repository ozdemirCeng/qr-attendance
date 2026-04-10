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
    title: "QR Suresi Doldu",
    badge: "QR",
    hint: "Panodaki guncel kodu tekrar okutun.",
    toneColor: "var(--warning)",
    toneBg: "var(--warning-soft)",
  },
  INVALID_SIGNATURE: {
    title: "Gecersiz QR",
    badge: "QR",
    hint: "QR goruntusunu yenileyip tekrar tarayin.",
    toneColor: "var(--error)",
    toneBg: "var(--error-soft)",
  },
  MALFORMED_TOKEN: {
    title: "Gecersiz QR",
    badge: "QR",
    hint: "Kod bozuk veya eksik. Yeniden tarayin.",
    toneColor: "var(--error)",
    toneBg: "var(--error-soft)",
  },
  REPLAY_ATTACK: {
    title: "QR Tekrar Kullanildi",
    badge: "QR",
    hint: "Ayni kod ikinci kez kullanilamaz.",
    toneColor: "var(--error)",
    toneBg: "var(--error-soft)",
  },
  SESSION_NOT_FOUND: {
    title: "Etkinlik Bulunamadi",
    badge: "404",
    hint: "Etkinlik baglantisini kontrol edip yeniden deneyin.",
    toneColor: "var(--text-secondary)",
    toneBg: "var(--surface-soft)",
  },
  SESSION_INACTIVE: {
    title: "Oturum Aktif Degil",
    badge: "OT",
    hint: "Oturum saati disinda tarama yapildi.",
    toneColor: "var(--primary)",
    toneBg: "var(--surface-soft)",
  },
  LOCATION_OUT_OF_RANGE: {
    title: "Konum Uygun Degil",
    badge: "GPS",
    hint: "Etkinlik alanina yaklasip tekrar deneyin.",
    toneColor: "var(--error)",
    toneBg: "var(--error-soft)",
  },
  NO_LOCATION_DATA: {
    title: "Konum Gerekli",
    badge: "GPS",
    hint: "Konum iznini acmadan yoklama alinmaz.",
    toneColor: "var(--warning)",
    toneBg: "var(--warning-soft)",
  },
  PHOTO_REQUIRED: {
    title: "Fotograf Gerekli",
    badge: "CAM",
    hint: "Selfie cekmeden check-in tamamlanamaz.",
    toneColor: "var(--warning)",
    toneBg: "var(--warning-soft)",
  },
  ALREADY_CHECKED_IN: {
    title: "Zaten Katildiniz",
    badge: "OK",
    hint: "Ayni oturum icin ikinci yoklama alinmaz.",
    toneColor: "var(--success)",
    toneBg: "var(--success-soft)",
  },
  REGISTRATION_REQUIRED: {
    title: "Kayit Gerekli",
    badge: "KYT",
    hint: "Kayit bulunamadi. Bilgilerinizi girerek devam edin.",
    toneColor: "var(--warning)",
    toneBg: "var(--warning-soft)",
  },
  BAD_REQUEST: {
    title: "Gonderilen Bilgi Gecersiz",
    badge: "ERR",
    hint: "Bilgileri kontrol edip tekrar deneyin.",
    toneColor: "var(--warning)",
    toneBg: "var(--warning-soft)",
  },
  UNAUTHORIZED: {
    title: "Yetkisiz Islem",
    badge: "401",
    hint: "Oturumunuz gecersiz olabilir. Tekrar deneyin.",
    toneColor: "var(--error)",
    toneBg: "var(--error-soft)",
  },
  INTERNAL_SERVER_ERROR: {
    title: "Sunucu Hatasi",
    badge: "500",
    hint: "Bir sure sonra tekrar deneyin.",
    toneColor: "var(--error)",
    toneBg: "var(--error-soft)",
  },
  NETWORK_ERROR: {
    title: "Baglanti Hatasi",
    badge: "NET",
    hint: "Baglanti saglandiginda tekrar tarama yapin.",
    toneColor: "var(--text-secondary)",
    toneBg: "var(--surface-soft)",
  },
  UNKNOWN_ERROR: {
    title: "Islem Basarisiz",
    badge: "ERR",
    hint: "Tekrar deneyin; sorun devam ederse yoneticiye bildirin.",
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
      secondaryLabel: "Ana Ekran",
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
      secondaryLabel: "Tarama Ekrani",
      secondaryHref: "/scan",
    };
  }

  if (code === "ALREADY_CHECKED_IN") {
    return {
      primaryLabel: "Farkli Kod Tara",
      primaryHref: "/check-in",
      secondaryLabel: "Ana Ekran",
      secondaryHref: "/scan",
    };
  }

  return {
    primaryLabel: "Tekrar Dene",
    primaryHref: scanHref,
    secondaryLabel: "Ana Ekran",
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
    fallbackMessage: "Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.",
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <section className="glass-elevated w-full max-w-xl animate-scale-in rounded-3xl p-8 text-center">
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
              Katilim Basarili
            </h1>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {(name || "Katilimci") + " icin yoklama alindi."}
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
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
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {errorMessage}
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
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
