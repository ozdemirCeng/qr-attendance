"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";
import {
  AttendanceExportStatus,
  getAttendanceExportStatus,
  requestAttendanceExport,
  resolveAttendanceExportDownloadUrl,
} from "@/lib/exports";

type ExportTabPanelProps = {
  eventId: string;
  onToast: (input: { tone: "success" | "error"; message: string }) => void;
};

const statusLabel: Record<AttendanceExportStatus, string> = {
  pending: "Hazirlaniyor...",
  processing: "Isleniyor...",
  ready: "Hazir",
  failed: "Basarisiz",
};

const statusToneClass: Record<AttendanceExportStatus, string> = {
  pending: "text-amber-700",
  processing: "text-indigo-700",
  ready: "text-emerald-700",
  failed: "text-rose-700",
};

export function ExportTabPanel({ eventId, onToast }: ExportTabPanelProps) {
  const [activeExportId, setActiveExportId] = useState<string | null>(null);

  const requestExportMutation = useMutation({
    mutationFn: () => requestAttendanceExport(eventId),
    onSuccess: (result) => {
      setActiveExportId(result.data.exportId);
      onToast({ tone: "success", message: result.data.message });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        onToast({ tone: "error", message: error.message });
        return;
      }

      onToast({ tone: "error", message: "Export islemi baslatilamadi." });
    },
  });

  const exportStatusQuery = useQuery({
    queryKey: ["attendance-export-status", activeExportId],
    queryFn: () => getAttendanceExportStatus(activeExportId ?? ""),
    enabled: Boolean(activeExportId),
    refetchInterval: (query) => {
      const data = query.state.data as
        | {
            data?: {
              status?: AttendanceExportStatus;
            };
          }
        | undefined;
      const status = data?.data?.status;

      if (!status || status === "pending" || status === "processing") {
        return 3_000;
      }

      return false;
    },
  });

  const statusData = exportStatusQuery.data?.data;

  const progress = useMemo(() => {
    if (!statusData) {
      return 0;
    }

    if (typeof statusData.progress === "number") {
      return Math.min(100, Math.max(0, Math.round(statusData.progress)));
    }

    if (statusData.status === "ready") {
      return 100;
    }

    if (statusData.status === "processing") {
      return 60;
    }

    if (statusData.status === "pending") {
      return 20;
    }

    return 0;
  }, [statusData]);

  const downloadHref = useMemo(() => {
    if (!statusData?.downloadUrl) {
      return null;
    }

    try {
      return resolveAttendanceExportDownloadUrl(statusData.downloadUrl);
    } catch {
      return null;
    }
  }, [statusData]);

  return (
    <section className="space-y-4">
      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900">Excel Export</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Katilim kayitlarini Excel dosyasi olarak hazirlayip indirebilirsin.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={requestExportMutation.isPending}
            onClick={() => {
              requestExportMutation.reset();
              void requestExportMutation.mutateAsync();
            }}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {requestExportMutation.isPending ? "Hazirlaniyor..." : "Export Baslat"}
          </button>

          {activeExportId ? (
            <button
              type="button"
              onClick={() => {
                void exportStatusQuery.refetch();
              }}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Durumu Yenile
            </button>
          ) : null}
        </div>
      </article>

      {activeExportId ? (
        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-600">Export ID: {activeExportId}</p>
            <p className={`text-sm font-semibold ${statusToneClass[statusData?.status ?? "pending"]}`}>
              {statusLabel[statusData?.status ?? "pending"]}
            </p>
          </div>

          <div className="mt-4 h-2 w-full rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-600">Ilerleme: %{progress}</p>

          {exportStatusQuery.isPending ? (
            <p className="mt-4 text-sm text-zinc-600">Export durumu kontrol ediliyor...</p>
          ) : null}

          {exportStatusQuery.isError ? (
            <p className="mt-4 text-sm text-rose-700">Export durumu alinamadi.</p>
          ) : null}

          {statusData?.status === "failed" ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {statusData.errorMessage ?? "Export basarisiz, tekrar dene"}
            </div>
          ) : null}

          {statusData?.status === "ready" ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {downloadHref ? (
                <a
                  href={downloadHref}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  Indir
                </a>
              ) : (
                <p className="text-sm text-rose-700">Indirme linki olusturulamadi.</p>
              )}
            </div>
          ) : null}
        </article>
      ) : (
        <article className="rounded-2xl bg-white p-6 text-sm text-zinc-600 shadow-sm">
          Export baslatildiginda durum bu alanda her 3 saniyede bir guncellenecektir.
        </article>
      )}
    </section>
  );
}
