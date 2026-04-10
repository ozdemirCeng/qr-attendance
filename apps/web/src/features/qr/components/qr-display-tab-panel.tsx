"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

import { ApiError } from "@/lib/api";
import { CurrentQrTokenResponse, getCurrentQrToken } from "@/lib/qr";

type QrDisplayTabPanelProps = {
  eventId: string;
  onToast: (input: { tone: "success" | "error"; message: string }) => void;
  onOpenSessionsTab?: () => void;
};

export function QrDisplayTabPanel({ eventId, onToast, onOpenSessionsTab }: QrDisplayTabPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isRefreshingRef = useRef(false);
  const downloadCanvasId = useMemo(() => `qr-download-canvas-${eventId}`, [eventId]);
  const [countdown, setCountdown] = useState(0);
  const [maxCountdown, setMaxCountdown] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompactLandscape, setIsCompactLandscape] = useState(false);

  const qrQuery = useQuery<CurrentQrTokenResponse, ApiError>({
    queryKey: ["qr-current", eventId],
    queryFn: async () => {
      const response = await getCurrentQrToken(eventId);
      setCountdown(response.data.expiresIn);
      setMaxCountdown(response.data.expiresIn);
      return response;
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data, isPending, isError, refetch, error } = qrQuery;

  useEffect(() => {
    if (!data || isError) return;
    const timerId = window.setInterval(() => {
      setCountdown((current) => {
        if (current > 1) return current - 1;
        if (!isRefreshingRef.current) {
          isRefreshingRef.current = true;
          setIsRefreshing(true);
          void refetch()
            .catch((refreshError: unknown) => { const message = refreshError instanceof ApiError ? refreshError.message : "QR token yenilenemedi."; onToast({ tone: "error", message }); })
            .finally(() => { isRefreshingRef.current = false; setIsRefreshing(false); });
        }
        return 0;
      });
    }, 1000);
    return () => { window.clearInterval(timerId); };
  }, [data, isError, onToast, refetch]);

  useEffect(() => {
    const onFullscreenChange = () => { setIsFullscreen(Boolean(document.fullscreenElement)); };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => { document.removeEventListener("fullscreenchange", onFullscreenChange); };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: landscape) and (max-height: 540px)");
    const update = () => { setIsCompactLandscape(mediaQuery.matches); };
    update();
    mediaQuery.addEventListener("change", update);
    return () => { mediaQuery.removeEventListener("change", update); };
  }, []);

  const progressPercent = maxCountdown > 0 ? Math.max(0, Math.min(100, (countdown / maxCountdown) * 100)) : 0;
  const forceFullscreenLayout = isCompactLandscape && !isFullscreen;

  function handleToggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) { void containerRef.current.requestFullscreen(); return; }
    void document.exitFullscreen();
  }

  function handleDownloadPng() {
    const canvas = document.getElementById(downloadCanvasId) as HTMLCanvasElement | null;
    if (!canvas) { onToast({ tone: "error", message: "QR indirilemedi. Lütfen tekrar deneyin." }); return; }
    const dataUrl = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = `qr-${eventId}.png`;
    anchor.click();
  }

  if (isPending) {
    return (
      <article className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--border-strong)", borderTopColor: "var(--primary)" }} />
          QR token yükleniyor...
        </div>
      </article>
    );
  }

  if (isError || !data) {
    const message = error instanceof ApiError ? error.message : "QR token alınamadı. Lütfen tekrar deneyin.";
    const isMissingActiveSession = error instanceof ApiError && error.statusCode === 404;
    return (
      <article className="rounded-2xl p-6" style={{ background: "var(--error-soft)", color: "var(--error)" }}>
        <p className="text-sm">{message}</p>
        {isMissingActiveSession ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs">QR üretimi için şu an aktif (başlangıç-bitiş zamanı içinde) en az bir oturum olmalı.</p>
            {onOpenSessionsTab ? (
              <button type="button" onClick={onOpenSessionsTab} className="btn-secondary text-sm">Oturumlar Sekmesine Git</button>
            ) : null}
          </div>
        ) : null}
        <button type="button" onClick={() => { void refetch(); }} className="btn-secondary mt-3 text-sm">Tekrar Dene</button>
      </article>
    );
  }

  return (
    <section className="space-y-4">
      <article
        ref={containerRef}
        className={`glass rounded-2xl p-6 transition sm:p-8 ${forceFullscreenLayout ? "fixed inset-0 z-40 overflow-y-auto rounded-none p-4 sm:p-6" : ""}`}
        style={forceFullscreenLayout ? { background: "var(--bg)" } : undefined}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--primary)" }}>Aktif Oturum</p>
            <h3 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }} data-display="true">Canlı QR Gösterimi</h3>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Oturum: {data.data.sessionId}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleToggleFullscreen} className="btn-secondary text-sm">
              {isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran"}
            </button>
            <button type="button" onClick={handleDownloadPng} className="btn-secondary text-sm">QR İndir</button>
            <button
              type="button"
              disabled={isRefreshing}
              onClick={() => { isRefreshingRef.current = true; setIsRefreshing(true); void refetch().finally(() => { isRefreshingRef.current = false; setIsRefreshing(false); }); }}
              className="btn-primary text-sm"
            >
              {isRefreshing ? "Yenileniyor..." : "Şimdi Yenile"}
            </button>
          </div>
        </div>

        {forceFullscreenLayout ? (
          <p className="mt-3 text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>Yatay mobil modunda QR otomatik tam ekran görünüyor.</p>
        ) : null}

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            <section className="rounded-2xl p-6" style={{ background: "var(--surface-soft)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>Aktif Oturum</p>
              <p className="mt-2 text-xl font-extrabold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }} data-display="true">
                Oturum {data.data.sessionId.slice(0, 8)}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Güvenli giriş için QR döndürülüyor.</p>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <button type="button" onClick={handleToggleFullscreen} className="btn-secondary rounded-xl p-4 text-sm">Tam Ekran</button>
              <button type="button" onClick={handleDownloadPng} className="btn-secondary rounded-xl p-4 text-sm">PNG İndir</button>
            </section>

            <section className="flex items-center justify-between rounded-2xl p-4" style={{ background: "var(--surface-soft)" }}>
              <div>
                <p className="text-2xl font-black" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }} data-display="true">{countdown}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>Saniye Kaldı</p>
              </div>
              <span className="inline-flex h-3 w-3 rounded-full pulse-dot" style={{ background: "var(--success)" }} />
            </section>
          </div>

          <div className="flex flex-col items-center lg:col-span-8">
            <div className="glass-elevated relative w-full max-w-[520px] rounded-2xl p-8">
              <div className="rounded-xl p-4" style={{ background: "white" }}>
                <QRCodeSVG value={data.data.token} size={420} level="M" includeMargin className="h-auto w-full" />
              </div>
              <div className="pointer-events-none absolute inset-x-8 top-8 h-1 rounded-full" style={{ background: "linear-gradient(90deg, transparent, var(--primary), transparent)", opacity: 0.3 }} />
            </div>

            <div className="mt-4 w-full max-w-[520px] rounded-xl border border-[#c2c6d6]/45 bg-[#f8f9ff] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#586377]">
                Kısa Doğrulama Kodu
              </p>
              <p className="mt-2 font-mono text-xl font-bold tracking-[0.18em] text-[#0b1c30]" data-display="true">
                {data.data.verificationCode}
              </p>
              <p className="mt-1 text-[11px] text-[#586377]">
                Manuel doğrulamada bu kısa kodu kullanabilirsiniz.
              </p>
            </div>

            <div className="mt-8 flex flex-col items-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "var(--surface-soft)" }}>
                <span className="text-xl font-black" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }} data-display="true">{countdown}</span>
              </div>
              <p className="mt-3 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Güvenlik için QR döndürülüyor</p>
            </div>

            <div className="mt-4 w-full max-w-[520px] space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium" style={{ color: "var(--text-secondary)" }}>Yenilenme İlerlemesi</span>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>%{Math.round(progressPercent)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-soft)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progressPercent}%`,
                    background: progressPercent > 50 ? "var(--success)" : progressPercent > 25 ? "var(--warning)" : "var(--error)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </article>

      <div className="hidden">
        <QRCodeCanvas id={downloadCanvasId} value={data.data.token} size={1024} includeMargin />
      </div>
    </section>
  );
}
