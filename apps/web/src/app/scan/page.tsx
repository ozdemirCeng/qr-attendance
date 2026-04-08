"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ScanLandingPage() {
  const router = useRouter();
  const [eventId, setEventId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onStart() {
    const normalizedEventId = eventId.trim();

    if (!normalizedEventId) {
      setErrorMessage("Devam etmek icin bir etkinlik ID girin.");
      return;
    }

    setErrorMessage(null);
    router.push(`/check-in/${normalizedEventId}`);
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 text-zinc-900 sm:px-6">
      <section className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">QR Tara</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Kamera ve konum izinlerini vererek hizli check-in islemini baslatabilirsin.
        </p>

        <div className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          <p>Kamera izni: QR kodu okumak icin zorunludur.</p>
          <p>Konum izni: Etkinlik alaninda oldugunun dogrulanmasi icin kullanilir.</p>
        </div>

        <div className="mt-6 space-y-2">
          <label htmlFor="eventId" className="text-sm font-medium text-zinc-700">
            Etkinlik ID
          </label>
          <input
            id="eventId"
            value={eventId}
            onChange={(event) => {
              setEventId(event.target.value);
            }}
            placeholder="ornek: 0fd1f8c0-..."
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          />
          {errorMessage ? <p className="text-xs text-rose-600">{errorMessage}</p> : null}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-6 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Taramaya Basla
        </button>
      </section>
    </main>
  );
}
