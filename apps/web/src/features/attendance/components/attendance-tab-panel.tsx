"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

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
  walkIn: "Walk-in",
  registered: "Kayitli",
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

        onToast({ tone: "success", message: "Katilim kaydi guncellendi." });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["attendance-list", eventId] }),
          queryClient.invalidateQueries({ queryKey: ["attendance-stats", eventId] }),
        ]);
      } catch (error) {
        if (error instanceof ApiError) {
          onToast({ tone: "error", message: error.message });
        } else {
          onToast({ tone: "error", message: "Katilim kaydi guncellenemedi." });
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
        header: "Katilim Saati",
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
        header: "Kayit Turu",
        accessorKey: "registrationType",
        cell: ({ row }) => registrationTypeLabel[row.original.registrationType],
      },
      {
        header: "Islem",
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
              className={`rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-60 ${
                isValid
                  ? "border border-rose-300 text-rose-700 hover:bg-rose-50"
                  : "border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {isValid ? "Gecersiz Yap" : "Gecerli Yap"}
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
    <section className="space-y-4">
      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900">Katilim Ozeti</h3>

        {attendanceStatsQuery.isPending ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        ) : null}

        {attendanceStatsQuery.isError ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Istatistikler yuklenemedi.
            <button
              type="button"
              onClick={() => {
                void attendanceStatsQuery.refetch();
              }}
              className="ml-3 rounded-lg border border-rose-300 px-3 py-1 font-semibold"
            >
              Tekrar Dene
            </button>
          </div>
        ) : null}

        {!attendanceStatsQuery.isPending && !attendanceStatsQuery.isError ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Toplam Katilim</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                {attendanceStatsQuery.data.data.total}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-emerald-50 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Gecerli</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-800">
                {attendanceStatsQuery.data.data.valid}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-rose-50 p-4">
              <p className="text-xs uppercase tracking-wide text-rose-700">Gecersiz</p>
              <p className="mt-2 text-2xl font-semibold text-rose-800">
                {attendanceStatsQuery.data.data.invalid}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-wide text-amber-700">Walk-in</p>
              <p className="mt-2 text-2xl font-semibold text-amber-800">
                {attendanceStatsQuery.data.data.walkIn}
              </p>
            </div>
          </div>
        ) : null}
      </article>

      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label htmlFor="attendanceSearch" className="text-xs font-semibold text-zinc-600">
              Arama
            </label>
            <input
              id="attendanceSearch"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              placeholder="Ad veya email ile ara"
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="attendanceValidityFilter" className="text-xs font-semibold text-zinc-600">
              Gecerlilik
            </label>
            <select
              id="attendanceValidityFilter"
              value={validityFilter}
              onChange={(event) => {
                setValidityFilter(event.target.value as ValidityFilter);
              }}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="all">Tumu</option>
              <option value="valid">Gecerli</option>
              <option value="invalid">Gecersiz</option>
            </select>
          </div>

          <div>
            <label htmlFor="attendanceSessionFilter" className="text-xs font-semibold text-zinc-600">
              Oturum
            </label>
            <select
              id="attendanceSessionFilter"
              value={sessionId}
              onChange={(event) => {
                setSessionId(event.target.value);
              }}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="all">Tum Oturumlar</option>
              {sessionsQuery.data?.data.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </article>

      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900">Katilim Listesi</h3>

        {attendanceListQuery.isPending ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-zinc-100" />
            ))}
          </div>
        ) : null}

        {attendanceListQuery.isError ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Katilim listesi yuklenemedi.
            <button
              type="button"
              onClick={() => {
                void attendanceListQuery.refetch();
              }}
              className="ml-3 rounded-lg border border-rose-300 px-3 py-1 font-semibold"
            >
              Tekrar Dene
            </button>
          </div>
        ) : null}

        {!attendanceListQuery.isPending &&
        !attendanceListQuery.isError &&
        attendanceListQuery.data.data.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">Henuz katilim kaydi yok</p>
        ) : null}

        {!attendanceListQuery.isPending &&
        !attendanceListQuery.isError &&
        attendanceListQuery.data.data.length > 0 ? (
          <>
            <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-3 py-2">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-t border-zinc-100">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2 text-zinc-800">
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
                <p className="text-xs text-zinc-600">
                  Sayfa {pagination.page} / {pagination.totalPages} - Toplam {pagination.total}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPage((current) => Math.max(1, current - 1));
                    }}
                    disabled={pagination.page <= 1}
                    className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                  >
                    Onceki
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPage((current) => Math.min(pagination.totalPages, current + 1));
                    }}
                    disabled={pagination.page >= pagination.totalPages}
                    className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </article>

      {invalidateDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-zinc-900">Manuel Duzelt</h4>
            <p className="mt-2 text-sm text-zinc-700">
              Bu kaydi gecersiz yapmak istediginize emin misiniz?
            </p>

            <div className="mt-3 space-y-1">
              <label htmlFor="manualInvalidReason" className="text-xs font-semibold text-zinc-600">
                Sebep (opsiyonel)
              </label>
              <textarea
                id="manualInvalidReason"
                value={invalidateDialog.reason}
                onChange={(event) => {
                  setInvalidateDialog((current) => {
                    if (!current) {
                      return null;
                    }

                    return {
                      ...current,
                      reason: event.target.value,
                    };
                  });
                }}
                className="min-h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Ornek: Manuel kontrol sonrasi gecersiz"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setInvalidateDialog(null);
                }}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Iptal
              </button>
              <button
                type="button"
                disabled={isManualStatusUpdating}
                onClick={() => {
                  if (!invalidateDialog) {
                    return;
                  }

                  void setManualStatus(
                    invalidateDialog.record,
                    false,
                    invalidateDialog.reason.trim() || undefined,
                  ).finally(() => {
                    setInvalidateDialog(null);
                  });
                }}
                className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
              >
                {isManualStatusUpdating ? "Guncelleniyor..." : "Onayla"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
