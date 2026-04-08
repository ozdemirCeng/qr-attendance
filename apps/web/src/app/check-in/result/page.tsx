import Link from "next/link";

type ResultPageProps = {
  searchParams: {
    status?: string;
    code?: string;
    name?: string;
    event?: string;
  };
};

const errorMessages: Record<string, { title: string; message: string }> = {
  EXPIRED_TOKEN: {
    title: "QR Suresi Dolmus",
    message: "Yeni QR icin organizatorle iletisime gecin.",
  },
  LOCATION_OUT_OF_RANGE: {
    title: "Konum Uygun Degil",
    message: "Katilim kaydi icin etkinlik alaninda olman gerekiyor.",
  },
  ALREADY_CHECKED_IN: {
    title: "Zaten Katildiniz",
    message: "Daha once katilim kaydin alindi.",
  },
  SESSION_NOT_FOUND: {
    title: "Etkinlik Bulunamadi",
    message: "Gecersiz veya suresi dolmus QR kodu kullanildi.",
  },
  MALFORMED_TOKEN: {
    title: "Gecersiz QR",
    message: "QR kodu okunamadi. Lutfen yeniden deneyin.",
  },
  INVALID_SIGNATURE: {
    title: "Gecersiz QR",
    message: "QR token dogrulanamadi.",
  },
  REPLAY_ATTACK: {
    title: "QR Tekrar Kullanildi",
    message: "Bu QR kodu daha once kullanildigi icin gecersiz.",
  },
  NO_LOCATION_DATA: {
    title: "Konum Gerekli",
    message: "Konum izni verilmeden check-in tamamlanamaz.",
  },
  SESSION_INACTIVE: {
    title: "Oturum Aktif Degil",
    message: "Bu oturum su anda check-in kabul etmiyor.",
  },
};

export default function CheckInResultPage({ searchParams }: ResultPageProps) {
  const isSuccess = searchParams.status === "success";
  const name = typeof searchParams.name === "string" ? decodeURIComponent(searchParams.name) : "";
  const eventName = typeof searchParams.event === "string" ? decodeURIComponent(searchParams.event) : "";
  const code = typeof searchParams.code === "string" ? searchParams.code : "UNKNOWN_ERROR";

  const errorMeta = errorMessages[code] ?? {
    title: "Islem Basarisiz",
    message: "Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.",
  };

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
            <p className="text-6xl text-rose-500">!</p>
            <h1 className="mt-3 text-2xl font-semibold text-rose-700">{errorMeta.title}</h1>
            <p className="mt-2 text-sm text-zinc-600">{errorMeta.message}</p>
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
