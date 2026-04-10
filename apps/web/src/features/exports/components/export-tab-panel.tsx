"use client";

import { useEffect, useMemo, useState } from "react";
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
  pending: "Hazırlanıyor...",
  processing: "İşleniyor...",
  ready: "Hazır",
  failed: "Başarısız",
};

function resolveStatusColor(status: AttendanceExportStatus) {
  if (status === "ready") return "var(--success)";
  if (status === "failed") return "var(--error)";
  if (status === "processing") return "var(--primary)";
  return "var(--warning)";
}

export function ExportTabPanel({ eventId, onToast }: ExportTabPanelProps) {
  const storageKey = `attendance-export:${eventId}`;
  const [activeExportId, setActiveExportId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(storageKey);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeExportId) { window.sessionStorage.removeItem(storageKey); return; }
    window.sessionStorage.setItem(storageKey, activeExportId);
  }, [activeExportId, storageKey]);

  const requestExportMutation = useMutation({
    mutationFn: () => requestAttendanceExport(eventId),
    onSuccess: (result) => {
      setActiveExportId(result.data.exportId);
      onToast({ tone: "success", message: result.data.message });
    },
    onError: (error) => {
      if (error instanceof ApiError) { onToast({ tone: "error", message: error.message }); return; }
      onToast({ tone: "error", message: "Dışa aktarma işlemi başlatılamadı." });
    },
  });

  const exportStatusQuery = useQuery({
    queryKey: ["attendance-export-status", activeExportId],
    queryFn: () => getAttendanceExportStatus(activeExportId ?? ""),
    enabled: Boolean(activeExportId),
    refetchInterval: (query) => {
      const data = query.state.data as { data?: { status?: AttendanceExportStatus } } | undefined;
      const status = data?.data?.status;
      if (!status || status === "pending" || status === "processing") return 3_000;
      return false;
    },
  });

  const statusData = exportStatusQuery.data?.data;
  const showInlineSpinner = exportStatusQuery.isFetching || statusData?.status === "pending" || statusData?.status === "processing";

  const progress = useMemo(() => {
    if (!statusData) return 0;
    if (typeof statusData.progress === "number") return Math.min(100, Math.max(0, Math.round(statusData.progress)));
    if (statusData.status === "ready") return 100;
    if (statusData.status === "processing") return 60;
    if (statusData.status === "pending") return 20;
    return 0;
  }, [statusData]);

  const downloadHref = useMemo(() => {
    if (!statusData?.downloadUrl) return null;
    try { return resolveAttendanceExportDownloadUrl(statusData.downloadUrl); } catch { return null; }
  }, [statusData]);

  return (
    <section className="space-y-6">
      <article className="glass rounded-2xl p-6">
        <h3 className="text-xl font-extrabold" style={{ color: "var(--text-primary)" }} data-display="true">
          Excel Dışa Aktarma
        </h3>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Katılım kayıtlarını Excel dosyası olarak hazırlayıp indirebilirsin.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={requestExportMutation.isPending}
            onClick={() => { requestExportMutation.reset(); void requestExportMutation.mutateAsync(); }}
            className="btn-primary text-sm"
          >
            {requestExportMutation.isPending ? "Hazırlanıyor..." : "Dışa Aktarmayı Başlat"}
          </button>

          {activeExportId ? (
            <button type="button" onClick={() => { void exportStatusQuery.refetch(); }} className="btn-secondary text-sm">
              Durumu Yenile
            </button>
          ) : null}
        </div>
      </article>

      {activeExportId ? (
        <article className="glass rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>İşlem ID: {activeExportId}</p>
            <div className="inline-flex items-center gap-2">
              {showInlineSpinner ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--border-strong)", borderTopColor: "var(--primary)" }} />
              ) : null}
              <p className="text-sm font-semibold" style={{ color: resolveStatusColor(statusData?.status ?? "pending") }}>
                {statusLabel[statusData?.status ?? "pending"]}
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-soft)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--primary-gradient-from), var(--primary-gradient-to))" }}
            />
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>İlerleme: %{progress}</p>

          {exportStatusQuery.isPending ? (
            <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>Dışa aktarma durumu kontrol ediliyor...</p>
          ) : null}

          {exportStatusQuery.isError ? (
            <p className="mt-4 text-sm" style={{ color: "var(--error)" }}>Dışa aktarma durumu alınamadı.</p>
          ) : null}

          {statusData?.status === "failed" ? (
            <div className="mt-4 rounded-xl p-4 text-sm" style={{ background: "var(--error-soft)", color: "var(--error)" }}>
              {statusData.errorMessage ?? "Dışa aktarma başarısız, tekrar deneyin"}
            </div>
          ) : null}

          {statusData?.status === "ready" ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {downloadHref ? (
                <a href={downloadHref} className="btn-primary text-sm" style={{ background: "var(--success)" }}>
                  📥 İndir
                </a>
              ) : (
                <p className="text-sm" style={{ color: "var(--error)" }}>İndirme linki oluşturulamadı.</p>
              )}
            </div>
          ) : null}
        </article>
      ) : (
        <article className="glass rounded-2xl p-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Dışa aktarma başlatıldığında durum bu alanda her 3 saniyede bir güncellenecektir.
        </article>
      )}
    </section>
  );
}
