"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

import { ApiError } from "@/lib/api";
import { getPublicQrToken } from "@/lib/qr";

export default function PublicQrDisplayPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [token, setToken] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [maxCountdown, setMaxCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const isRefreshingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  // The QR content: a URL that opens the check-in page with the token
  const qrValue = token ? `${siteUrl}/check-in/${eventId}?token=${encodeURIComponent(token)}` : "";

  async function fetchToken() {
    try {
      const response = await getPublicQrToken(eventId);
      setToken(response.data.token);
      setVerificationCode(response.data.verificationCode);
      setCountdown(response.data.expiresIn);
      setMaxCountdown(response.data.expiresIn);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("QR yüklenemedi. Sayfa yenilensin.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Initial fetch
  useEffect(() => {
    void fetchToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Countdown timer + auto-refresh
  useEffect(() => {
    if (!token || error) return;
    const timerId = window.setInterval(() => {
      setCountdown((c) => {
        if (c > 1) return c - 1;
        if (!isRefreshingRef.current) {
          isRefreshingRef.current = true;
          void fetchToken().finally(() => { isRefreshingRef.current = false; });
        }
        return 0;
      });
    }, 1000);
    return () => { window.clearInterval(timerId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, error]);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => {
      setIsDarkTheme(root.classList.contains("dark"));
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
    };
  }, []);

  const progressPercent = maxCountdown > 0 ? Math.max(0, Math.min(100, (countdown / maxCountdown) * 100)) : 0;
  const qrBackground = isDarkTheme ? "#0f172a" : "#ffffff";
  const qrForeground = isDarkTheme ? "#f8fafc" : "#111827";

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) { void containerRef.current.requestFullscreen(); }
    else { void document.exitFullscreen(); }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "var(--border-strong)", borderTopColor: "var(--primary)" }} />
          <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>QR kod yükleniyor...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: "var(--error)" }}>{error}</p>
          <button type="button" onClick={() => { setLoading(true); void fetchToken(); }} className="btn-primary mt-4 px-6 py-3 text-sm">
            Tekrar Dene
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      ref={containerRef}
      className="flex min-h-screen flex-col items-center justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(circle at top, var(--bg-mesh-1), transparent 45%), radial-gradient(circle at bottom right, var(--bg-mesh-2), transparent 40%), var(--bg)",
      }}
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--primary)" }}>QR Yoklama</p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-4xl" style={{ color: "var(--text-primary)" }}>Katılım İçin QR Tarayın</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Telefonunuzun kamerasıyla aşağıdaki QR kodu tarayın</p>
      </div>

      {/* QR Code */}
      <div className="rounded-3xl border p-6 shadow-2xl md:p-8" style={{ background: qrBackground, borderColor: "var(--border-strong)" }}>
        {qrValue ? (
          <QRCodeSVG
            value={qrValue}
            size={320}
            level="M"
            includeMargin={false}
            bgColor={qrBackground}
            fgColor={qrForeground}
            style={{ width: "100%", height: "auto", maxWidth: "320px" }}
          />
        ) : (
          <div className="flex h-80 w-80 items-center justify-center" style={{ color: "var(--text-tertiary)" }}>QR oluşturuluyor...</div>
        )}
      </div>

      {/* Verification Code */}
      {verificationCode ? (
        <div className="mt-6 rounded-xl border px-8 py-3 text-center" style={{ borderColor: "var(--border-strong)", background: "var(--surface-soft)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Kısa Doğrulama Kodu</p>
          <p className="mt-1 text-2xl font-extrabold tracking-[0.15em]" style={{ color: "var(--text-primary)" }}>{verificationCode}</p>
        </div>
      ) : null}

      {/* Countdown */}
      <div className="mt-6 w-full max-w-xs">
        <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-tertiary)" }}>
          <span>Yenilenme İlerlemesi</span>
          <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>{countdown}s</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-soft)" }}>
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${progressPercent}%`,
              background: progressPercent > 20 ? "linear-gradient(90deg, var(--primary-gradient-from), var(--primary-gradient-to))" : "var(--error)",
            }}
          />
        </div>
        <p className="mt-2 text-center text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          Güvenlik için QR kod otomatik yenilenir
        </p>
      </div>

      {/* Fullscreen button */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="btn-secondary mt-6 px-5 py-2.5 text-xs font-semibold"
      >
        ⛶ Tam Ekran
      </button>
    </main>
  );
}
