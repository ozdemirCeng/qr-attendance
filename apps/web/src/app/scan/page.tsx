"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useParticipantAuth } from "@/providers/participant-auth-provider";

export default function ScanLandingPage() {
  const router = useRouter();
  const { participantUser, isParticipantLoading, participantSignOut } = useParticipantAuth();
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
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) { return; }
    router.push("/check-in");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>

      <section className="mx-auto w-full max-w-lg">
        {/* Participant Auth Bar */}
        {!isParticipantLoading && (
          <div className="mb-4 animate-fade-in">
            {participantUser ? (
              <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>👤 {participantUser.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>{participantUser.email}</p>
                </div>
                <button type="button" onClick={() => { void participantSignOut(); }} className="btn-secondary shrink-0 text-xs">Çıkış</button>
              </div>
            ) : (
              <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between gap-3">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Hesabınla giriş yap, QR&apos;da otomatik tanın.</p>
                <div className="flex gap-2 shrink-0">
                  <Link href="/auth/login" className="btn-secondary text-xs">Giriş</Link>
                  <Link href="/auth/signup" className="btn-primary text-xs">Kayıt Ol</Link>
                </div>
              </div>
            )}
          </div>
        )}

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
              {participantUser
                ? `${participantUser.name}, QR tarayarak otomatik giriş yapabilirsin.`
                : "QR kodunu tarayarak etkinliğe giriş yap"}
            </p>
          </div>

          <div className="space-y-4">
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

          {participantUser ? (
            <div className="mt-4 rounded-xl p-3 text-center" style={{ background: "var(--success-soft)" }}>
              <p className="text-xs font-medium" style={{ color: "var(--success)" }}>
                ✓ Giriş yapıldı — QR taradığında otomatik tanınacaksın
              </p>
            </div>
          ) : (
            <div className="mt-6 text-center">
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Etkinlik bilgisi QR kodunun içinde yer alır.
              </p>
            </div>
          )}
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
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>📋 Hesap Oluştur</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
              <Link href="/auth/signup" className="font-semibold" style={{ color: "var(--primary)" }}>Hesap oluşturun</Link>, her etkinlikte otomatik tanının.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
