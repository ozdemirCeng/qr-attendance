"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/feedback/empty-state";
import { ApiError } from "@/lib/api";
import {
  type AttendanceRecordItem,
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
  walkIn: "Anlik Kayit",
  registered: "Kayitli",
} as const;

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

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

export function AttendanceTabPanel({
  eventId,
  onToast,
}: AttendanceTabPanelProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sessionId, setSessionId] = useState("all");
  const [validityFilter, setValidityFilter] =
    useState<ValidityFilter>("all");
  const [invalidateDialog, setInvalidateDialog] =
    useState<InvalidateDialogState | null>(null);
  const [previewRecord, setPreviewRecord] =
    useState<AttendanceRecordItem | null>(null);
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
    queryKey: [
      "attendance-list",
      eventId,
      page,
      sessionId,
      validityFilter,
      search,
    ],
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

  const attendanceStats = attendanceStatsQuery.data?.data;
  const attendanceRecords = attendanceListQuery.data?.data ?? [];
  const pagination = attendanceListQuery.data?.pagination;

  const refreshAttendanceQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["attendance-list", eventId] }),
      queryClient.invalidateQueries({
        queryKey: ["attendance-stats", eventId],
      }),
    ]);
  }, [eventId, queryClient]);

  const setManualStatus = useCallback(
    async (record: AttendanceRecordItem, isValid: boolean, reason?: string) => {
      setIsManualStatusUpdating(true);

      try {
        await updateAttendanceManualStatus(record.id, {
          isValid,
          reason,
        });

        onToast({ tone: "success", message: "Katilim kaydi guncellendi." });
        await refreshAttendanceQueries();
      } catch (error) {
        if (error instanceof ApiError) {
          onToast({ tone: "error", message: error.message });
        } else {
          onToast({
            tone: "error",
            message: "Katilim kaydi guncellenemedi.",
          });
        }
      } finally {
        setIsManualStatusUpdating(false);
      }
    },
    [onToast, refreshAttendanceQueries],
  );

  return (
    <section className="space-y-6">
      <article className="glass rounded-2xl p-6">
        <h3
          className="text-xl font-extrabold"
          style={{ color: "var(--text-primary)" }}
          data-display="true"
        >
          Katilim Ozeti
        </h3>

        {attendanceStatsQuery.isPending ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : null}

        {attendanceStatsQuery.isError ? (
          <div
            className="mt-4 rounded-xl p-4 text-sm"
            style={{
              background: "var(--error-soft)",
              color: "var(--error)",
            }}
          >
            Istatistikler yuklenemedi.
            <button
              type="button"
              onClick={() => {
                void attendanceStatsQuery.refetch();
              }}
              className="btn-ghost ml-3 text-xs"
            >
              Tekrar Dene
            </button>
          </div>
        ) : null}

        {!attendanceStatsQuery.isPending && !attendanceStatsQuery.isError ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Toplam Katilim",
                value: attendanceStats?.total ?? 0,
                color: "var(--text-primary)",
              },
              {
                label: "Gecerli",
                value: attendanceStats?.valid ?? 0,
                color: "var(--success)",
              },
              {
                label: "Gecersiz",
                value: attendanceStats?.invalid ?? 0,
                color: "var(--error)",
              },
              {
                label: "Anlik Kayit",
                value: attendanceStats?.walkIn ?? 0,
                color: "var(--warning)",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-4"
                style={{ background: "var(--surface-soft)" }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {stat.label}
                </p>
                <p
                  className="mt-2 text-2xl font-bold"
                  style={{
                    color: stat.color,
                    fontFamily: "var(--font-display)",
                  }}
                  data-display="true"
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </article>

      <article className="glass rounded-2xl p-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label
              htmlFor="attendanceSearch"
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              Arama
            </label>
            <input
              id="attendanceSearch"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              placeholder="Ad, email veya telefon ile ara"
              className="glass-input mt-1 w-full"
            />
          </div>
          <div>
            <label
              htmlFor="attendanceValidityFilter"
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              Gecerlilik
            </label>
            <select
              id="attendanceValidityFilter"
              value={validityFilter}
              onChange={(event) => {
                setValidityFilter(event.target.value as ValidityFilter);
              }}
              className="glass-input mt-1 w-full"
            >
              <option value="all">Tumu</option>
              <option value="valid">Gecerli</option>
              <option value="invalid">Gecersiz</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="attendanceSessionFilter"
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              Oturum
            </label>
            <select
              id="attendanceSessionFilter"
              value={sessionId}
              onChange={(event) => {
                setSessionId(event.target.value);
              }}
              className="glass-input mt-1 w-full"
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

      <article className="glass rounded-2xl p-6">
        <h3
          className="text-xl font-extrabold"
          style={{ color: "var(--text-primary)" }}
          data-display="true"
        >
          Katilim Listesi
        </h3>

        {attendanceListQuery.isPending ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-10 rounded-lg" />
            ))}
          </div>
        ) : null}

        {attendanceListQuery.isError ? (
          <div
            className="mt-4 rounded-xl p-4 text-sm"
            style={{
              background: "var(--error-soft)",
              color: "var(--error)",
            }}
          >
            Katilim listesi yuklenemedi.
            <button
              type="button"
              onClick={() => {
                void attendanceListQuery.refetch();
              }}
              className="btn-ghost ml-3 text-xs"
            >
              Tekrar Dene
            </button>
          </div>
        ) : null}

        {!attendanceListQuery.isPending &&
        !attendanceListQuery.isError &&
        attendanceRecords.length === 0 ? (
          <EmptyState
            iconLabel="AT"
            title="Henuz katilim kaydi yok"
            message="Henuz QR taramasi yapilmadi."
            ctaLabel="Tarama Ekranini Ac"
            ctaHref={`/check-in/${eventId}`}
          />
        ) : null}

        {!attendanceListQuery.isPending &&
        !attendanceListQuery.isError &&
        attendanceRecords.length > 0 ? (
          <>
            <div
              className="mt-4 overflow-x-auto rounded-xl"
              style={{ border: "1px solid var(--border)" }}
            >
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Ad Soyad</th>
                    <th className="px-4 py-3">Iletisim</th>
                    <th className="px-4 py-3">Katilim</th>
                    <th className="px-4 py-3">Konum</th>
                    <th className="px-4 py-3">Kayit Turu</th>
                    <th className="px-4 py-3">Profil</th>
                    <th className="px-4 py-3">Islem</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{record.fullName}</div>
                        <div className="text-xs text-zinc-500">
                          {record.isValid ? "Gecerli" : "Gecersiz"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{record.email ?? "-"}</div>
                        <div className="text-xs text-zinc-500">
                          {record.phone ?? "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{formatDate(record.scannedAt)}</div>
                        <div className="text-xs text-zinc-500">
                          {record.verificationPhotoCapturedAt
                            ? `Fotograf: ${formatDate(
                                record.verificationPhotoCapturedAt,
                              )}`
                            : "Fotograf zamani yok"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-2">
                          <span
                            className={
                              record.distanceFromVenue !== null
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }
                          >
                            {record.distanceFromVenue !== null ? "✓" : "✕"}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {formatDistance(record.distanceFromVenue)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {registrationTypeLabel[record.registrationType]}
                      </td>
                      <td className="px-4 py-3">
                        {record.verificationPhotoDataUrl ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewRecord(record);
                            }}
                            className="rounded-full border border-sky-300 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                          >
                            Fotografi Gor
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-400">
                            Fotograf yok
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={isManualStatusUpdating}
                          onClick={() => {
                            if (record.isValid) {
                              setInvalidateDialog({
                                record,
                                reason: record.invalidReason ?? "",
                              });
                              return;
                            }

                            void setManualStatus(record, true);
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60 ${
                            record.isValid
                              ? "border border-rose-300 text-rose-700 hover:bg-rose-50"
                              : "border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {record.isValid ? "Gecersiz Yap" : "Gecerli Yap"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Sayfa {pagination.page} / {pagination.totalPages} - Toplam{" "}
                  {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPage((current) => Math.max(1, current - 1));
                    }}
                    disabled={pagination.page <= 1}
                    className="btn-secondary px-3 py-1 text-xs"
                  >
                    Onceki
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPage((current) =>
                        Math.min(pagination.totalPages, current + 1),
                      );
                    }}
                    disabled={pagination.page >= pagination.totalPages}
                    className="btn-secondary px-3 py-1 text-xs"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </article>

      {previewRecord ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="glass-elevated w-full max-w-2xl animate-scale-in rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                  data-display="true"
                >
                  Profil Dogrulama
                </h4>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {previewRecord.fullName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewRecord(null);
                }}
                className="btn-secondary text-sm"
              >
                Kapat
              </button>
            </div>

            {previewRecord.verificationPhotoDataUrl ? (
              <div
                className="mt-4 overflow-hidden rounded-2xl border"
                style={{ borderColor: "var(--border)" }}
              >
                <img
                  src={previewRecord.verificationPhotoDataUrl}
                  alt={`${previewRecord.fullName} dogrulama fotografi`}
                  className="max-h-[65vh] w-full object-contain"
                />
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--surface-soft)" }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Konum Durumu
                </p>
                <p
                  className="mt-2 text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {previewRecord.distanceFromVenue !== null
                    ? `Dogrulandi - ${formatDistance(
                        previewRecord.distanceFromVenue,
                      )}`
                    : "Konum verisi yok"}
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {typeof previewRecord.latitude === "number" &&
                  typeof previewRecord.longitude === "number"
                    ? `${previewRecord.latitude.toFixed(
                        5,
                      )}, ${previewRecord.longitude.toFixed(5)}`
                    : "Koordinat kaydi yok"}
                </p>
              </div>

              <div
                className="rounded-xl p-4"
                style={{ background: "var(--surface-soft)" }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Kayit Bilgisi
                </p>
                <p
                  className="mt-2 text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatDate(previewRecord.scannedAt)}
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {previewRecord.verificationPhotoCapturedAt
                    ? `Fotograf: ${formatDate(
                        previewRecord.verificationPhotoCapturedAt,
                      )}`
                    : "Fotograf zamani kayitli degil"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {invalidateDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="glass-elevated w-full max-w-md animate-scale-in rounded-2xl p-6">
            <h4
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
              data-display="true"
            >
              Manuel Duzelt
            </h4>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Bu kaydi gecersiz yapmak istediginize emin misiniz?
            </p>

            <div className="mt-3 space-y-1.5">
              <label
                htmlFor="manualInvalidReason"
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
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
                className="glass-input min-h-24 w-full"
                placeholder="Ornek: Manuel kontrol sonrasi gecersiz"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setInvalidateDialog(null);
                }}
                className="btn-secondary text-sm"
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
                className="btn-primary text-sm"
                style={{ background: "var(--error)" }}
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
