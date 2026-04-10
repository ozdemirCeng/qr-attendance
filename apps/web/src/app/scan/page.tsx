"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function ScanLandingPage() {
  const router = useRouter();
  const [eventId, setEventId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  async function requestPermissions() {
    if (!window.isSecureContext) { setErrorMessage("Kamera ve konum izinleri için HTTPS veya localhost gerekir."); return false; }
    if (!navigator.mediaDevices?.getUserMedia) { setErrorMessage("Bu tarayıcı kamera erişimini desteklemiyor."); return false; }
    setIsRequestingPermissions(true);
    setErrorMessage(null);
    setPermissionMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      for (const track of stream.getTracks()) { track.stop(); }
      const locationGranted = await new Promise<boolean>((resolve) => {
        if (!navigator.geolocation) { resolve(false); return; }
        navigator.geolocation.getCurrentPosition(() => { resolve(true); }, () => { resolve(false); }, { timeout: 10_000, maximumAge: 30_000, enableHighAccuracy: true });
      });
      if (locationGranted) { setPermissionMessage("Kamera ve konum izinleri hazır."); } else { setPermissionMessage("Kamera izni alındı, konum izni verilmedi veya alınamadı."); }
      return true;
    } catch { setErrorMessage("Kamera izni verilmedi. Tarayıcıdan izin verip tekrar deneyin."); return false; } finally { setIsRequestingPermissions(false); }
  }

  async function onStart() {
    const normalizedEventId = eventId.trim();
    if (!normalizedEventId) { setErrorMessage("Devam etmek için bir etkinlik ID girin."); return; }
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) { return; }
    router.push(`/check-in/${normalizedEventId}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>

      <section className="mx-auto w-full max-w-lg">
        <article className="glass-elevated animate-slide-up rounded-3xl p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))", boxShadow: "var(--shadow-glow)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }} data-display="true">QR Yoklama</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              QR kodunu tarayarak etkinliğe giriş yap
            </p>
          </div>

          {/* Event ID Input */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="scanEventId" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                Etkinlik Kodu
              </label>
              <input
                id="scanEventId"
                type="text"
                value={eventId}
                onChange={(e) => { setEventId(e.target.value); setErrorMessage(null); }}
                placeholder="Etkinlik ID'sini girin"
                className="glass-input w-full py-3 text-base"
                onKeyDown={(e) => { if (e.key === "Enter") { void onStart(); } }}
              />
            </div>

            {errorMessage ? <p className="text-sm" style={{ color: "var(--error)" }}>{errorMessage}</p> : null}
            {permissionMessage ? <p className="text-sm" style={{ color: "var(--success)" }}>{permissionMessage}</p> : null}

            <button
              type="button"
              onClick={() => { void onStart(); }}
              disabled={isRequestingPermissions}
              className="btn-primary w-full py-3 text-base"
            >
              {isRequestingPermissions ? "İzinler kontrol ediliyor..." : "Taramayı Başlat"}
            </button>
          </div>

          <div className="mt-6 space-y-2 text-center">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Etkinlik ID, yönetici tarafından paylaşılır veya QR kodunun içinde bulunur.
            </p>
          </div>
        </article>

        {/* Info Cards */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="glass rounded-2xl p-4">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>📲 QR Tara</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
              Kamera ile QR kodu okutun, kimliğinizi doğrulayın.
            </p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>📋 Ön Kayıt</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
              Etkinlik ID ile{" "}
              <Link href={eventId.trim() ? `/register/${eventId.trim()}` : "#"} className="font-semibold" style={{ color: "var(--primary)" }}>önceden kayıt olun</Link>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
