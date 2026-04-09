import Link from "next/link";

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
  iconLabel: string;
  hint: string;
  textClassName: string;
  badgeClassName: string;
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
    iconLabel: "QR",
    hint: "Panodaki guncel kodu tekrar okutun.",
    textClassName: "text-amber-700",
    badgeClassName: "bg-amber-100 text-amber-700",
  },
  INVALID_SIGNATURE: {
    title: "Gecersiz QR",
    iconLabel: "QR",
    hint: "QR goruntusunu yenileyip tekrar tarayin.",
    textClassName: "text-rose-700",
    badgeClassName: "bg-rose-100 text-rose-700",
  },
  MALFORMED_TOKEN: {
    title: "Gecersiz QR",
    iconLabel: "QR",
    hint: "Kod bozuk veya eksik. Yeniden tarayin.",
    textClassName: "text-rose-700",
    badgeClassName: "bg-rose-100 text-rose-700",
  },
  REPLAY_ATTACK: {
    title: "QR Tekrar Kullanildi",
    iconLabel: "RP",
    hint: "Ayni kod ikinci kez kullanilamaz.",
    textClassName: "text-fuchsia-700",
    badgeClassName: "bg-fuchsia-100 text-fuchsia-700",
  },
  SESSION_NOT_FOUND: {
    title: "Etkinlik Bulunamadi",
    iconLabel: "EV",
    hint: "Etkinlik baglantisini kontrol edip yeniden deneyin.",
    textClassName: "text-zinc-700",
    badgeClassName: "bg-zinc-200 text-zinc-700",
  },
  SESSION_INACTIVE: {
    title: "Oturum Aktif Degil",
    iconLabel: "OT",
    hint: "Oturum saati disinda tarama yapildi.",
    textClassName: "text-sky-700",
    badgeClassName: "bg-sky-100 text-sky-700",
  },
  LOCATION_OUT_OF_RANGE: {
    title: "Konum Uygun Degil",
    iconLabel: "GPS",
    hint: "Etkinlik alanina yaklasip tekrar deneyin.",
    textClassName: "text-red-700",
    badgeClassName: "bg-red-100 text-red-700",
  },
  NO_LOCATION_DATA: {
    title: "Konum Gerekli",
    iconLabel: "LOC",
    hint: "Konum iznini acmadan yoklama alinmaz.",
    textClassName: "text-orange-700",
    badgeClassName: "bg-orange-100 text-orange-700",
  },
  ALREADY_CHECKED_IN: {
    title: "Zaten Katildiniz",
    iconLabel: "OK",
    hint: "Ayni oturum icin ikinci yoklama alinmaz.",
    textClassName: "text-emerald-700",
    badgeClassName: "bg-emerald-100 text-emerald-700",
  },
  NETWORK_ERROR: {
    title: "Baglanti Hatasi",
    iconLabel: "NET",
    hint: "Baglanti saglandiginda tekrar tarama yapin.",
    textClassName: "text-indigo-700",
    badgeClassName: "bg-indigo-100 text-indigo-700",
  },
  UNKNOWN_ERROR: {
    title: "Islem Basarisiz",
    iconLabel: "ERR",
    hint: "Tekrar deneyin; sorun devam ederse yoneticiye bildirin.",
    textClassName: "text-zinc-700",
    badgeClassName: "bg-zinc-200 text-zinc-700",
  },
};

function resolveAction(isSuccess: boolean, code: string, eventId: string | null): ResultAction {
  if (isSuccess) {
    return {
      primaryLabel: "Yeni Tarama",
      primaryHref: "/scan",
      secondaryLabel: "Ana Ekran",
      secondaryHref: "/scan",
    };
  }

  if (code === "NO_LOCATION_DATA" || code === "LOCATION_OUT_OF_RANGE") {
    return {
      primaryLabel: "Ayni Etkinlige Don",
      primaryHref: eventId ? `/check-in/${eventId}` : "/scan",
      secondaryLabel: "Tarama Listesi",
      secondaryHref: "/scan",
    };
  }

  if (code === "ALREADY_CHECKED_IN") {
    return {
      primaryLabel: "Farkli Kod Tara",
      primaryHref: "/scan",
      secondaryLabel: "Ana Ekran",
      secondaryHref: "/scan",
    };
  }

  return {
    primaryLabel: "Tekrar Dene",
    primaryHref: eventId ? `/check-in/${eventId}` : "/scan",
    secondaryLabel: "Ana Ekran",
    secondaryHref: "/scan",
  };
}

export default function CheckInResultPage({ searchParams }: ResultPageProps) {
  const isSuccess = searchParams.status === "success";
  const name = typeof searchParams.name === "string" ? decodeURIComponent(searchParams.name) : "";
  const eventName = typeof searchParams.event === "string" ? decodeURIComponent(searchParams.event) : "";
  const code = typeof searchParams.code === "string" ? searchParams.code : "UNKNOWN_ERROR";
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
    <main className="min-h-screen bg-zinc-100 px-4 py-10 text-zinc-900 sm:px-6">
      <section className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">
        {isSuccess ? (
          <>
            <p className="text-6xl text-emerald-500">✓</p>
            <h1 className="mt-3 text-2xl font-semibold">Katilim Basarili</h1>
            <p className="mt-2 text-sm text-zinc-600">{name || "Katilimci"} icin yoklama alindi.</p>
            <p className="mt-1 text-sm text-zinc-500">{eventName}</p>
          </>
        ) : (
          <>
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wide ${errorMeta.badgeClassName}`}
            >
              {errorMeta.iconLabel}
            </div>
            <h1 className={`mt-3 text-2xl font-semibold ${errorMeta.textClassName}`}>
              {errorMeta.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">{errorMessage}</p>
            <p className="mt-1 text-xs text-zinc-500">{errorMeta.hint}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">Kod: {normalizedCode}</p>
          </>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Link
            href={action.primaryHref}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            {action.primaryLabel}
          </Link>
          <Link
            href={action.secondaryHref}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            {action.secondaryLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
