"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

import { ApiError } from "@/lib/api";
import { CurrentQrTokenResponse, getCurrentQrToken } from "@/lib/qr";

type QrDisplayTabPanelProps = {
  eventId: string;
  onToast: (input: { tone: "success" | "error"; message: string }) => void;
};

export function QrDisplayTabPanel({ eventId, onToast }: QrDisplayTabPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isRefreshingRef = useRef(false);
  const downloadCanvasId = useMemo(() => `qr-download-canvas-${eventId}`, [eventId]);
  const [countdown, setCountdown] = useState(0);
  const [maxCountdown, setMaxCountdown] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    if (!data || isError) {
      return;
    }

    const timerId = window.setInterval(() => {
      setCountdown((current) => {
        if (current > 1) {
          return current - 1;
        }

        if (!isRefreshingRef.current) {
          isRefreshingRef.current = true;
          setIsRefreshing(true);
          void refetch()
            .catch((refreshError: unknown) => {
              const message =
                refreshError instanceof ApiError
                  ? refreshError.message
                  : "QR token yenilenemedi.";
              onToast({ tone: "error", message });
            })
            .finally(() => {
              isRefreshingRef.current = false;
              setIsRefreshing(false);
            });
        }

        return 0;
      });
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [data, isError, onToast, refetch]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const progressPercent =
    maxCountdown > 0 ? Math.max(0, Math.min(100, (countdown / maxCountdown) * 100)) : 0;

  const progressBarClass =
    progressPercent > 50
      ? "bg-emerald-500"
      : progressPercent > 25
        ? "bg-amber-500"
        : "bg-rose-500";

  function handleToggleFullscreen() {
    if (!containerRef.current) {
      return;
    }

    if (!document.fullscreenElement) {
      void containerRef.current.requestFullscreen();
      return;
    }

    void document.exitFullscreen();
  }

  function handleDownloadPng() {
    const canvas = document.getElementById(downloadCanvasId) as HTMLCanvasElement | null;
    if (!canvas) {
      onToast({ tone: "error", message: "QR indirilemedi. Lutfen tekrar deneyin." });
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = `qr-${eventId}.png`;
    anchor.click();
  }

  if (isPending) {
    return (
      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          <span className="h-3 w-3 animate-pulse rounded-full bg-zinc-400" />
          QR token yukleniyor...
        </div>
      </article>
    );
  }

  if (isError || !data) {
    const message =
      error instanceof ApiError
        ? error.message
        : "QR token alinamadi. Lutfen tekrar deneyin.";

    return (
      <article className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <p className="text-sm text-rose-700">{message}</p>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="mt-3 rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
        >
          Tekrar Dene
        </button>
      </article>
    );
  }

  return (
    <section className="space-y-4">
      <article
        ref={containerRef}
        className="rounded-2xl bg-white p-6 shadow-sm transition sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Canli QR</h3>
            <p className="mt-1 text-sm text-zinc-600">Session: {data.data.sessionId}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              {isFullscreen ? "Tam Ekrandan Cik" : "Tam Ekran"}
            </button>
            <button
              type="button"
              onClick={handleDownloadPng}
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              QR Indir
            </button>
            <button
              type="button"
              disabled={isRefreshing}
              onClick={() => {
                isRefreshingRef.current = true;
                setIsRefreshing(true);
                void refetch().finally(() => {
                  isRefreshingRef.current = false;
                  setIsRefreshing(false);
                });
              }}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {isRefreshing ? "Yenileniyor..." : "Simdi Yenile"}
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <QRCodeSVG
              value={data.data.token}
              size={280}
              level="M"
              includeMargin
              className="h-auto w-[220px] sm:w-[280px]"
            />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700">Yenileniyor:</span>
            <span className="font-semibold text-zinc-900">{countdown}s</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-200">
            <div
              className={`h-full rounded-full transition-all ${progressBarClass}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </article>

      <div className="hidden">
        <QRCodeCanvas id={downloadCanvasId} value={data.data.token} size={1024} includeMargin />
      </div>
    </section>
  );
}
