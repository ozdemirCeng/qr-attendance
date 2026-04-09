"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ScanLandingPage() {
  const router = useRouter();
  const [eventId, setEventId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  async function requestPermissions() {
    if (!window.isSecureContext) {
      setErrorMessage("Kamera ve konum izinleri icin HTTPS veya localhost gerekir.");
      return false;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Bu tarayici kamera erisimini desteklemiyor.");
      return false;
    }

    setIsRequestingPermissions(true);
    setErrorMessage(null);
    setPermissionMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      for (const track of stream.getTracks()) {
        track.stop();
      }

      const locationGranted = await new Promise<boolean>((resolve) => {
        if (!navigator.geolocation) {
          resolve(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          () => {
            resolve(true);
          },
          () => {
            resolve(false);
          },
          {
            timeout: 10_000,
            maximumAge: 30_000,
            enableHighAccuracy: true,
          },
        );
      });

      if (locationGranted) {
        setPermissionMessage("Kamera ve konum izinleri hazir.");
      } else {
        setPermissionMessage("Kamera izni alindi, konum izni verilmedi veya alinamadi.");
      }

      return true;
    } catch {
      setErrorMessage("Kamera izni verilmedi. Tarayicidan izin verip tekrar deneyin.");
      return false;
    } finally {
      setIsRequestingPermissions(false);
    }
  }

  async function onStart() {
    const normalizedEventId = eventId.trim();

    if (!normalizedEventId) {
      setErrorMessage("Devam etmek icin bir etkinlik ID girin.");
      return;
    }

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      return;
    }

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
          {permissionMessage ? <p className="text-xs text-emerald-700">{permissionMessage}</p> : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void requestPermissions();
            }}
            disabled={isRequestingPermissions}
            className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
          >
            {isRequestingPermissions ? "Izinler kontrol ediliyor..." : "Izinleri Simdi Iste"}
          </button>

          <button
            type="button"
            onClick={() => {
              void onStart();
            }}
            disabled={isRequestingPermissions}
            className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            Taramaya Basla
          </button>
        </div>
      </section>
    </main>
  );
}
