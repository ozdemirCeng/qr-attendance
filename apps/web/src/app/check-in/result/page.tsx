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
  emoji: string;
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
  EXPIRED_TOKEN: { title: "QR Süresi Doldu", emoji: "⏱", hint: "Panodaki güncel kodu tekrar okutun.", toneColor: "var(--warning)", toneBg: "var(--warning-soft)" },
  INVALID_SIGNATURE: { title: "Geçersiz QR", emoji: "🚫", hint: "QR görüntüsünü yenileyip tekrar tarayın.", toneColor: "var(--error)", toneBg: "var(--error-soft)" },
  MALFORMED_TOKEN: { title: "Geçersiz QR", emoji: "⚠️", hint: "Kod bozuk veya eksik. Yeniden tarayın.", toneColor: "var(--error)", toneBg: "var(--error-soft)" },
  REPLAY_ATTACK: { title: "QR Tekrar Kullanıldı", emoji: "🔄", hint: "Aynı kod ikinci kez kullanılamaz.", toneColor: "var(--error)", toneBg: "var(--error-soft)" },
  SESSION_NOT_FOUND: { title: "Etkinlik Bulunamadı", emoji: "🔍", hint: "Etkinlik bağlantısını kontrol edip yeniden deneyin.", toneColor: "var(--text-secondary)", toneBg: "var(--surface-soft)" },
  SESSION_INACTIVE: { title: "Oturum Aktif Değil", emoji: "⏸", hint: "Oturum saati dışında tarama yapıldı.", toneColor: "var(--primary)", toneBg: "var(--surface-soft)" },
  LOCATION_OUT_OF_RANGE: { title: "Konum Uygun Değil", emoji: "📍", hint: "Etkinlik alanına yaklaşıp tekrar deneyin.", toneColor: "var(--error)", toneBg: "var(--error-soft)" },
  NO_LOCATION_DATA: { title: "Konum Gerekli", emoji: "📍", hint: "Konum iznini açmadan yoklama alınmaz.", toneColor: "var(--warning)", toneBg: "var(--warning-soft)" },
  ALREADY_CHECKED_IN: { title: "Zaten Katıldınız", emoji: "✅", hint: "Aynı oturum için ikinci yoklama alınmaz.", toneColor: "var(--success)", toneBg: "var(--success-soft)" },
  NETWORK_ERROR: { title: "Bağlantı Hatası", emoji: "📡", hint: "Bağlantı sağlandığında tekrar tarama yapın.", toneColor: "var(--text-secondary)", toneBg: "var(--surface-soft)" },
  UNKNOWN_ERROR: { title: "İşlem Başarısız", emoji: "❌", hint: "Tekrar deneyin; sorun devam ederse yöneticiye bildirin.", toneColor: "var(--text-secondary)", toneBg: "var(--surface-soft)" },
};

function resolveAction(isSuccess: boolean, code: string, eventId: string | null): ResultAction {
  const scanHref = eventId ? `/check-in/${eventId}` : "/check-in";
  if (isSuccess) {
    return { primaryLabel: "Yeni Tarama", primaryHref: scanHref, secondaryLabel: "Ana Ekran", secondaryHref: "/scan" };
  }
  if (code === "NO_LOCATION_DATA" || code === "LOCATION_OUT_OF_RANGE") {
    return { primaryLabel: "Tekrar Dene", primaryHref: scanHref, secondaryLabel: "Tarama Listesi", secondaryHref: "/scan" };
  }
  if (code === "ALREADY_CHECKED_IN") {
    return { primaryLabel: "Farklı Kod Tara", primaryHref: "/check-in", secondaryLabel: "Ana Ekran", secondaryHref: "/scan" };
  }
  return { primaryLabel: "Tekrar Dene", primaryHref: scanHref, secondaryLabel: "Ana Ekran", secondaryHref: "/scan" };
}

export default function CheckInResultPage({ searchParams }: ResultPageProps) {
  const isSuccess = searchParams.status === "success";
  const name = typeof searchParams.name === "string" ? decodeURIComponent(searchParams.name) : "";
  const eventName = typeof searchParams.event === "string" ? decodeURIComponent(searchParams.event) : "";
  const code = typeof searchParams.code === "string" ? searchParams.code : "UNKNOWN_ERROR";
  const eventId = typeof searchParams.eventId === "string" && searchParams.eventId.trim() ? decodeURIComponent(searchParams.eventId) : null;

  const normalizedCode = code.toUpperCase();
  const errorMeta = errorMetaMap[normalizedCode] ?? errorMetaMap.UNKNOWN_ERROR;
  const action = resolveAction(isSuccess, normalizedCode, eventId);
  const errorMessage = resolveApiErrorMessage({ code: normalizedCode, fallbackMessage: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." });

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <section className="glass-elevated w-full max-w-xl animate-scale-in rounded-3xl p-8 text-center">
        {isSuccess ? (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl" style={{ background: "var(--success-soft)" }}>
              ✓
            </div>
            <h1 className="mt-4 text-3xl font-extrabold" style={{ color: "var(--text-primary)" }} data-display="true">Katılım Başarılı</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{name || "Katılımcı"} için yoklama alındı.</p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>{eventName}</p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl" style={{ background: errorMeta.toneBg }}>
              {errorMeta.emoji}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold" style={{ color: errorMeta.toneColor }} data-display="true">
              {errorMeta.title}
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{errorMessage}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>{errorMeta.hint}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Kod: {normalizedCode}</p>
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
