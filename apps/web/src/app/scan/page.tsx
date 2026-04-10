"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useParticipantAuth } from "@/providers/participant-auth-provider";

export default function ScanLandingPage() {
  const router = useRouter();
  const { participantUser, isParticipantLoading, participantSignOut } =
    useParticipantAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(
    null,
  );
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  async function requestPermissions() {
    if (!window.isSecureContext) {
      setErrorMessage(
        "Kamera ve konum izinleri icin HTTPS veya localhost gerekir.",
      );
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
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
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

      if (!locationGranted) {
        setErrorMessage(
          "Konum izni olmadan check-in tamamlanamaz. Izin verip tekrar deneyin.",
        );
        return false;
      }

      setPermissionMessage(
        "Kamera ve konum izinleri hazir. Selfie dogrulamasi check-in adiminda alinacak.",
      );
      return true;
    } catch {
      setErrorMessage(
        "Kamera izni verilmedi. Tarayicidan izin verip tekrar deneyin.",
      );
      return false;
    } finally {
      setIsRequestingPermissions(false);
    }
  }

  async function onStart() {
    const hasPermissions = await requestPermissions();

    if (!hasPermissions) {
      return;
    }

    router.push("/check-in");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <section className="mx-auto w-full max-w-3xl">
        {!isParticipantLoading ? (
          <div className="mb-4 animate-fade-in">
            {participantUser ? (
              <div className="glass flex items-center justify-between gap-3 rounded-2xl px-5 py-3">
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {participantUser.name}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {participantUser.email}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href="/profile" className="btn-secondary text-xs">
                    Profil
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void participantSignOut();
                    }}
                    className="btn-ghost text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Cikis
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass flex items-center justify-between gap-3 rounded-2xl px-5 py-3">
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Hesabinla giris yap, QR sonrasi kimlik adimi otomatik
                  kolaylassin.
                </p>
                <div className="flex gap-2 shrink-0">
                  <Link href="/login?role=participant" className="btn-secondary text-xs">
                    Giris
                  </Link>
                  <Link href="/auth/signup" className="btn-primary text-xs">
                    Kayit Ol
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <article className="glass-elevated animate-slide-up rounded-3xl p-8">
          <div className="mb-6 text-center">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <h1
              className="text-3xl font-extrabold tracking-tight"
              style={{ color: "var(--text-primary)" }}
              data-display="true"
            >
              QR Yoklama
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              QR taradiktan sonra konum ve selfie dogrulamasi ile check-in
              tamamlanir.
            </p>
          </div>

          <div className="space-y-4">
            {errorMessage ? (
              <p className="text-sm" style={{ color: "var(--error)" }}>
                {errorMessage}
              </p>
            ) : null}
            {permissionMessage ? (
              <p className="text-sm" style={{ color: "var(--success)" }}>
                {permissionMessage}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => {
                void onStart();
              }}
              disabled={isRequestingPermissions}
              className="btn-primary w-full py-3 text-base"
            >
              {isRequestingPermissions
                ? "Izinler kontrol ediliyor..."
                : "Taramayi Baslat"}
            </button>
          </div>

          {participantUser ? (
            <div
              className="mt-4 rounded-xl p-3 text-center"
              style={{ background: "var(--success-soft)" }}
            >
              <p
                className="text-xs font-medium"
                style={{ color: "var(--success)" }}
              >
                Hesap tanindi. QR sonrasi iletisim bilgilerin otomatik
                doldurulacak.
              </p>
            </div>
          ) : (
            <div className="mt-6 text-center">
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Katilimci hesabi ile giris yapmak zorunlu degildir ancak daha
                hizli ilerlersiniz.
              </p>
            </div>
          )}
        </article>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="glass rounded-2xl p-4">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              QR Tara
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
              Etkinlik QR kodunu kamera ile okut.
            </p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Konum Dogrula
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
              Etkinlik alaninda oldugunu kontrol et.
            </p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Selfie Dogrula
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
              Profil fotografin admin panelinde gorunur.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
