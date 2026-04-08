import Link from "next/link";

import { resolveApiErrorMessage } from "@/lib/api";

type ResultPageProps = {
  searchParams: {
    status?: string;
    code?: string;
    name?: string;
    event?: string;
  };
};

type ErrorMeta = {
  title: string;
  icon: string;
  textClassName: string;
  badgeClassName: string;
};

const errorMetaMap: Record<string, ErrorMeta> = {
  EXPIRED_TOKEN: {
    title: "QR Suresi Doldu",
    icon: "T",
    textClassName: "text-amber-700",
    badgeClassName: "bg-amber-100 text-amber-700",
  },
  INVALID_SIGNATURE: {
    title: "Gecersiz QR",
    icon: "X",
    textClassName: "text-rose-700",
    badgeClassName: "bg-rose-100 text-rose-700",
  },
  MALFORMED_TOKEN: {
    title: "Gecersiz QR",
    icon: "X",
    textClassName: "text-rose-700",
    badgeClassName: "bg-rose-100 text-rose-700",
  },
  REPLAY_ATTACK: {
    title: "QR Tekrar Kullanildi",
    icon: "R",
    textClassName: "text-fuchsia-700",
    badgeClassName: "bg-fuchsia-100 text-fuchsia-700",
  },
  SESSION_NOT_FOUND: {
    title: "Etkinlik Bulunamadi",
    icon: "E",
    textClassName: "text-zinc-700",
    badgeClassName: "bg-zinc-200 text-zinc-700",
  },
  SESSION_INACTIVE: {
    title: "Oturum Aktif Degil",
    icon: "S",
    textClassName: "text-sky-700",
    badgeClassName: "bg-sky-100 text-sky-700",
  },
  LOCATION_OUT_OF_RANGE: {
    title: "Konum Uygun Degil",
    icon: "L",
    textClassName: "text-red-700",
    badgeClassName: "bg-red-100 text-red-700",
  },
  NO_LOCATION_DATA: {
    title: "Konum Gerekli",
    icon: "N",
    textClassName: "text-orange-700",
    badgeClassName: "bg-orange-100 text-orange-700",
  },
  ALREADY_CHECKED_IN: {
    title: "Zaten Katildiniz",
    icon: "C",
    textClassName: "text-emerald-700",
    badgeClassName: "bg-emerald-100 text-emerald-700",
  },
  NETWORK_ERROR: {
    title: "Baglanti Hatasi",
    icon: "W",
    textClassName: "text-indigo-700",
    badgeClassName: "bg-indigo-100 text-indigo-700",
  },
  UNKNOWN_ERROR: {
    title: "Islem Basarisiz",
    icon: "!",
    textClassName: "text-zinc-700",
    badgeClassName: "bg-zinc-200 text-zinc-700",
  },
};

export default function CheckInResultPage({ searchParams }: ResultPageProps) {
  const isSuccess = searchParams.status === "success";
  const name = typeof searchParams.name === "string" ? decodeURIComponent(searchParams.name) : "";
  const eventName = typeof searchParams.event === "string" ? decodeURIComponent(searchParams.event) : "";
  const code = typeof searchParams.code === "string" ? searchParams.code : "UNKNOWN_ERROR";

  const normalizedCode = code.toUpperCase();
  const errorMeta = errorMetaMap[normalizedCode] ?? errorMetaMap.UNKNOWN_ERROR;
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
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${errorMeta.badgeClassName}`}
            >
              {errorMeta.icon}
            </div>
            <h1 className={`mt-3 text-2xl font-semibold ${errorMeta.textClassName}`}>
              {errorMeta.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">{errorMessage}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">Kod: {normalizedCode}</p>
          </>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/scan"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Ana Ekrana Don
          </Link>
        </div>
      </section>
    </main>
  );
}
