"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { EmptyState } from "@/components/feedback/empty-state";
import { ApiError } from "@/lib/api";
import {
  AttendanceRecordItem,
  getAttendanceStats,
  listAttendance,
  updateAttendanceManualStatus,
} from "@/lib/attendance";
import { listSessions } from "@/lib/sessions";

type AttendanceTabPanelProps = {
  eventId: string;
  onToast: (input: { tone: "success" | "error"; message: string }) => void;
};

type ValidityFilter = "all" | "valid" | "invalid";

type InvalidateDialogState = {
  record: AttendanceRecordItem;
  reason: string;
};

const registrationTypeLabel = {
  walkIn: "Anlık Kayıt",
  registered: "Kayıtlı",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDistance(value: number | null) {
  if (typeof value !== "number") {
    return "-";
  }

  return `${Math.round(value)} m`;
}

export function AttendanceTabPanel({ eventId, onToast }: AttendanceTabPanelProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sessionId, setSessionId] = useState("all");
  const [validityFilter, setValidityFilter] = useState<ValidityFilter>("all");
  const [invalidateDialog, setInvalidateDialog] = useState<InvalidateDialogState | null>(null);
  const [isManualStatusUpdating, setIsManualStatusUpdating] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [search, sessionId, validityFilter]);

  const sessionsQuery = useQuery({
    queryKey: ["sessions", eventId],
    queryFn: () => listSessions(eventId),
  });

  const attendanceStatsQuery = useQuery({
    queryKey: ["attendance-stats", eventId],
    queryFn: () => getAttendanceStats(eventId),
    refetchInterval: 30_000,
  });

  const attendanceListQuery = useQuery({
    queryKey: ["attendance-list", eventId, page, sessionId, validityFilter, search],
    queryFn: () =>
      listAttendance(eventId, {
        page,
        limit: 20,
        search,
        sessionId: sessionId === "all" ? undefined : sessionId,
        isValid:
          validityFilter === "all"
            ? undefined
            : validityFilter === "valid"
              ? true
              : false,
      }),
    refetchInterval: 30_000,
  });

  const pagination = attendanceListQuery.data?.pagination;

  const setManualStatus = useCallback(
    async (record: AttendanceRecordItem, isValid: boolean, reason?: string) => {
      setIsManualStatusUpdating(true);

      try {
        await updateAttendanceManualStatus(record.id, {
          isValid,
          reason,
        });

        onToast({ tone: "success", message: "Katılım kaydı güncellendi." });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["attendance-list", eventId] }),
          queryClient.invalidateQueries({ queryKey: ["attendance-stats", eventId] }),
        ]);
      } catch (error) {
        if (error instanceof ApiError) {
          onToast({ tone: "error", message: error.message });
        } else {
          onToast({ tone: "error", message: "Katılım kaydı güncellenemedi." });
        }
      } finally {
        setIsManualStatusUpdating(false);
      }
    },
    [onToast, queryClient, eventId],
  );

  const columns = useMemo<ColumnDef<AttendanceRecordItem>[]>(
    () => [
      {
        header: "Ad Soyad",
        accessorKey: "fullName",
      },
      {
        header: "E-posta",
        accessorKey: "email",
        cell: ({ row }) => row.original.email ?? "-",
      },
      {
        header: "Telefon",
        accessorKey: "phone",
        cell: ({ row }) => row.original.phone ?? "-",
      },
      {
        header: "Katılım Saati",
        accessorKey: "scannedAt",
        cell: ({ row }) => formatDate(row.original.scannedAt),
      },
      {
        header: "Konum",
        id: "location",
        cell: ({ row }) => {
          const hasLocation = row.original.distanceFromVenue !== null;

          return (
            <span className="inline-flex items-center gap-2">
              <span className={hasLocation ? "text-emerald-600" : "text-rose-600"}>
                {hasLocation ? "✓" : "✗"}
              </span>
              <span className="text-xs text-zinc-500">
                {formatDistance(row.original.distanceFromVenue)}
              </span>
            </span>
          );
        },
      },
      {
        header: "Kayıt Türü",
        accessorKey: "registrationType",
        cell: ({ row }) => registrationTypeLabel[row.original.registrationType],
      },
      {
        header: "İşlem",
        id: "manualStatus",
        cell: ({ row }) => {
          const isValid = row.original.isValid;

          return (
            <button
              type="button"
              disabled={isManualStatusUpdating}
              onClick={() => {
                if (isValid) {
                  setInvalidateDialog({
                    record: row.original,
                    reason: row.original.invalidReason ?? "",
                  });
                  return;
                }

                void setManualStatus(row.original, true);
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60 ${
                isValid
                  ? "border border-rose-300 text-rose-700 hover:bg-rose-50"
                  : "border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {isValid ? "Geçersiz Yap" : "Geçerli Yap"}
            </button>
          );
        },
      },
    ],
    [isManualStatusUpdating, setManualStatus],
  );

  const table = useReactTable({
    data: attendanceListQuery.data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="space-y-6">
      <article className="glass rounded-2xl p-6">
        <h3 className="text-xl font-extrabold" style={{ color: "var(--text-primary)" }} data-display="true">Katılım Özeti</h3>

        {attendanceStatsQuery.isPending ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="skeleton h-20 rounded-xl" />))}
          </div>
        ) : null}

        {attendanceStatsQuery.isError ? (
          <div className="mt-4 rounded-xl p-4 text-sm" style={{ background: "var(--error-soft)", color: "var(--error)" }}>
            İstatistikler yüklenemedi.
            <button type="button" onClick={() => { void attendanceStatsQuery.refetch(); }} className="btn-ghost ml-3 text-xs">Tekrar Dene</button>
          </div>
        ) : null}

        {!attendanceStatsQuery.isPending && !attendanceStatsQuery.isError ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Toplam Katılım", value: attendanceStatsQuery.data.data.total, color: "var(--text-primary)" },
              { label: "Geçerli", value: attendanceStatsQuery.data.data.valid, color: "var(--success)" },
              { label: "Geçersiz", value: attendanceStatsQuery.data.data.invalid, color: "var(--error)" },
              { label: "Anlık Kayıt", value: attendanceStatsQuery.data.data.walkIn, color: "var(--warning)" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl p-4" style={{ background: "var(--surface-soft)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>{stat.label}</p>
                <p className="mt-2 text-2xl font-bold" style={{ color: stat.color, fontFamily: "var(--font-display)" }} data-display="true">{stat.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </article>

      <article className="glass rounded-2xl p-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label htmlFor="attendanceSearch" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Arama</label>
            <input id="attendanceSearch" value={search} onChange={(event) => { setSearch(event.target.value); }} placeholder="Ad veya email ile ara" className="glass-input mt-1 w-full" />
          </div>
          <div>
            <label htmlFor="attendanceValidityFilter" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Geçerlilik</label>
            <select id="attendanceValidityFilter" value={validityFilter} onChange={(event) => { setValidityFilter(event.target.value as ValidityFilter); }} className="glass-input mt-1 w-full">
              <option value="all">Tümü</option>
              <option value="valid">Geçerli</option>
              <option value="invalid">Geçersiz</option>
            </select>
          </div>
          <div>
            <label htmlFor="attendanceSessionFilter" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Oturum</label>
            <select id="attendanceSessionFilter" value={sessionId} onChange={(event) => { setSessionId(event.target.value); }} className="glass-input mt-1 w-full">
              <option value="all">Tüm Oturumlar</option>
              {sessionsQuery.data?.data.map((session) => (<option key={session.id} value={session.id}>{session.name}</option>))}
            </select>
          </div>
        </div>
      </article>

      <article className="glass rounded-2xl p-6">
        <h3 className="text-xl font-extrabold" style={{ color: "var(--text-primary)" }} data-display="true">Katılım Listesi</h3>

        {attendanceListQuery.isPending ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="skeleton h-10 rounded-lg" />))}
          </div>
        ) : null}

        {attendanceListQuery.isError ? (
          <div className="mt-4 rounded-xl p-4 text-sm" style={{ background: "var(--error-soft)", color: "var(--error)" }}>
            Katılım listesi yüklenemedi.
            <button type="button" onClick={() => { void attendanceListQuery.refetch(); }} className="btn-ghost ml-3 text-xs">Tekrar Dene</button>
          </div>
        ) : null}

        {!attendanceListQuery.isPending && !attendanceListQuery.isError && attendanceListQuery.data.data.length === 0 ? (
          <EmptyState iconLabel="📋" title="Henüz katılım kaydı yok" message="Henüz QR taraması yapılmadı." ctaLabel="Tarama Ekranını Aç" ctaHref={`/check-in/${eventId}`} />
        ) : null}

        {!attendanceListQuery.isPending && !attendanceListQuery.isError && attendanceListQuery.data.data.length > 0 ? (
          <>
            <div className="mt-4 overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
              <table className="min-w-full text-left text-sm">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-4 py-3">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Sayfa {pagination.page} / {pagination.totalPages} - Toplam {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setPage((c) => Math.max(1, c - 1)); }} disabled={pagination.page <= 1} className="btn-secondary px-3 py-1 text-xs">Önceki</button>
                  <button type="button" onClick={() => { setPage((c) => Math.min(pagination.totalPages, c + 1)); }} disabled={pagination.page >= pagination.totalPages} className="btn-secondary px-3 py-1 text-xs">Sonraki</button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </article>

      {invalidateDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="glass-elevated w-full max-w-md animate-scale-in rounded-2xl p-6">
            <h4 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }} data-display="true">Manuel Düzelt</h4>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Bu kaydı geçersiz yapmak istediğinize emin misiniz?</p>

            <div className="mt-3 space-y-1.5">
              <label htmlFor="manualInvalidReason" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Sebep (opsiyonel)</label>
              <textarea
                id="manualInvalidReason"
                value={invalidateDialog.reason}
                onChange={(event) => { setInvalidateDialog((current) => { if (!current) return null; return { ...current, reason: event.target.value }; }); }}
                className="glass-input min-h-24 w-full"
                placeholder="Örnek: Manuel kontrol sonrası geçersiz"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setInvalidateDialog(null); }} className="btn-secondary text-sm">İptal</button>
              <button
                type="button"
                disabled={isManualStatusUpdating}
                onClick={() => {
                  if (!invalidateDialog) return;
                  void setManualStatus(invalidateDialog.record, false, invalidateDialog.reason.trim() || undefined).finally(() => { setInvalidateDialog(null); });
                }}
                className="btn-primary text-sm"
                style={{ background: "var(--error)" }}
              >
                {isManualStatusUpdating ? "Güncelleniyor..." : "Onayla"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

