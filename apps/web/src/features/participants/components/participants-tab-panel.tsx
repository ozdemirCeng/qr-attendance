"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { EmptyState } from "@/components/feedback/empty-state";
import { ApiError } from "@/lib/api";
import {
  AttendanceRecordItem,
  listAttendance,
  manualUpsertAttendance,
} from "@/lib/attendance";
import {
  CsvImportResponse,
  ParticipantItem,
  ParticipantSource,
  createParticipantManual,
  importParticipantsCsv,
  listParticipants,
  removeParticipant,
} from "@/lib/participants";
import { listSessions } from "@/lib/sessions";

const manualParticipantSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter olmali"),
  email: z.string().trim().email("E-posta formati gecersiz").optional().or(z.literal("")),
  phone: z.string().trim().max(32, "Telefon en fazla 32 karakter olabilir").optional(),
});

type ManualParticipantFormValues = {
  name: string;
  email: string;
  phone: string;
};

type ParticipantsTabPanelProps = {
  eventId: string;
  onToast: (input: { tone: "success" | "error"; message: string }) => void;
};

type AttendanceStatusMap = Record<string, AttendanceRecordItem>;

type AttendanceActionDialogState = {
  participantId: string;
  participantName: string;
  nextIsValid: boolean;
  reason: string;
};

const sourceLabel: Record<ParticipantSource, string> = {
  manual: "Manuel",
  csv: "CSV",
  self_registered: "Self",
};

const csvTemplateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
  "name,email,phone,external_id\nAda Lovelace,ada@example.com,+905551112233,STD-001\n",
)}`;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ParticipantsTabPanel({ eventId, onToast }: ParticipantsTabPanelProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [attendanceSessionSelection, setAttendanceSessionSelection] = useState("auto");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isAttendanceUpdating, setIsAttendanceUpdating] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [attendanceActionDialog, setAttendanceActionDialog] =
    useState<AttendanceActionDialogState | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResponse["data"] | null>(null);

  const manualForm = useForm<ManualParticipantFormValues>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    setPage(1);
  }, [search]);

  const participantsQuery = useQuery({
    queryKey: ["participants", eventId, page, search],
    queryFn: () => listParticipants(eventId, page, 20, search),
  });

  const sessionsQuery = useQuery({
    queryKey: ["sessions", eventId],
    queryFn: () => listSessions(eventId),
  });

  const resolvedAttendanceSessionId = useMemo(() => {
    const sessions = sessionsQuery.data?.data ?? [];

    if (sessions.length === 0) {
      return null;
    }

    if (attendanceSessionSelection !== "auto") {
      return attendanceSessionSelection;
    }

    const now = Date.now();
    const activeSession = sessions.find((session) => {
      const startsAt = new Date(session.startsAt).getTime();
      const endsAt = new Date(session.endsAt).getTime();

      return now >= startsAt && now <= endsAt;
    });

    if (activeSession) {
      return activeSession.id;
    }

    return sessions[sessions.length - 1]?.id ?? null;
  }, [sessionsQuery.data?.data, attendanceSessionSelection]);

  const attendanceStatusQuery = useQuery({
    queryKey: [
      "participant-attendance-status",
      eventId,
      resolvedAttendanceSessionId,
      search,
    ],
    enabled: Boolean(resolvedAttendanceSessionId),
    queryFn: async () => {
      if (!resolvedAttendanceSessionId) {
        return {} as AttendanceStatusMap;
      }

      const statusByParticipant: AttendanceStatusMap = {};
      let currentPage = 1;
      let totalPages = 1;

      while (currentPage <= totalPages) {
        const response = await listAttendance(eventId, {
          page: currentPage,
          limit: 100,
          search,
          sessionId: resolvedAttendanceSessionId,
        });

        totalPages = response.pagination.totalPages;

        for (const record of response.data) {
          if (!record.participantId) {
            continue;
          }

          const current = statusByParticipant[record.participantId];

          if (!current || current.scannedAt < record.scannedAt) {
            statusByParticipant[record.participantId] = record;
          }
        }

        currentPage += 1;
      }

      return statusByParticipant;
    },
  });

  useEffect(() => {
    setSelectedParticipantIds([]);
  }, [page, search, resolvedAttendanceSessionId]);

  const pagination = participantsQuery.data?.pagination;
  const participants = participantsQuery.data?.data ?? [];
  const selectedCount = selectedParticipantIds.length;

  const participantCountLabel = useMemo(() => {
    if (!pagination) {
      return "Katilimci sayisi yukleniyor";
    }

    return `${pagination.total} kayit`;
  }, [pagination]);

  const canManageAttendance = Boolean(resolvedAttendanceSessionId);

  const selectedSessionName = useMemo(() => {
    if (!resolvedAttendanceSessionId) {
      return "Oturum yok";
    }

    return (
      sessionsQuery.data?.data.find((session) => session.id === resolvedAttendanceSessionId)
        ?.name ?? "Oturum"
    );
  }, [sessionsQuery.data?.data, resolvedAttendanceSessionId]);

  const refreshAllRelatedQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["participants", eventId] }),
      queryClient.invalidateQueries({
        queryKey: ["participant-attendance-status", eventId],
      }),
      queryClient.invalidateQueries({ queryKey: ["attendance-list", eventId] }),
      queryClient.invalidateQueries({ queryKey: ["attendance-stats", eventId] }),
    ]);
  }, [queryClient, eventId]);

  const upsertAttendanceForParticipant = useCallback(
    async (
      participantId: string,
      isValid: boolean,
      reason?: string,
    ): Promise<boolean> => {
      if (!resolvedAttendanceSessionId) {
        onToast({
          tone: "error",
          message: "Manuel yoklama icin once bir oturum secmelisiniz.",
        });
        return false;
      }

      setIsAttendanceUpdating(true);

      try {
        await manualUpsertAttendance(eventId, {
          participantId,
          isValid,
          sessionId: resolvedAttendanceSessionId,
          reason,
        });

        onToast({ tone: "success", message: "Yoklama kaydi guncellendi." });
        await refreshAllRelatedQueries();
        return true;
      } catch (error) {
        if (error instanceof ApiError) {
          onToast({ tone: "error", message: error.message });
        } else {
          onToast({ tone: "error", message: "Yoklama kaydi guncellenemedi." });
        }

        return false;
      } finally {
        setIsAttendanceUpdating(false);
      }
    },
    [eventId, onToast, refreshAllRelatedQueries, resolvedAttendanceSessionId],
  );

  async function onCreateManualParticipant(values: ManualParticipantFormValues) {
    manualForm.clearErrors();

    const parsed = manualParticipantSchema.safeParse(values);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const entries = Object.entries(fieldErrors) as Array<
        [keyof ManualParticipantFormValues, string[] | undefined]
      >;

      for (const [field, messages] of entries) {
        if (messages?.[0]) {
          manualForm.setError(field, { type: "manual", message: messages[0] });
        }
      }

      return;
    }

    try {
      await createParticipantManual(eventId, {
        name: parsed.data.name,
        email: parsed.data.email || undefined,
        phone: parsed.data.phone || undefined,
      });

      setIsManualModalOpen(false);
      manualForm.reset();
      onToast({ tone: "success", message: "Katilimci basariyla eklendi." });
      await queryClient.invalidateQueries({ queryKey: ["participants", eventId] });
    } catch (error) {
      if (error instanceof ApiError) {
        onToast({ tone: "error", message: error.message });
        return;
      }

      onToast({ tone: "error", message: "Katilimci eklenirken hata olustu." });
    }
  }

  async function onDeleteParticipant(participantId: string) {
    if (!window.confirm("Katilimciyi silmek istediginize emin misiniz?")) {
      return;
    }

    try {
      await removeParticipant(eventId, participantId);
      onToast({ tone: "success", message: "Katilimci silindi." });
      await queryClient.invalidateQueries({ queryKey: ["participants", eventId] });
    } catch (error) {
      if (error instanceof ApiError) {
        onToast({ tone: "error", message: error.message });
        return;
      }

      onToast({ tone: "error", message: "Katilimci silinirken hata olustu." });
    }
  }

  function onToggleParticipantSelection(participantId: string, checked: boolean) {
    setSelectedParticipantIds((current) => {
      if (checked) {
        return current.includes(participantId) ? current : [...current, participantId];
      }

      return current.filter((id) => id !== participantId);
    });
  }

  function onToggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelectedParticipantIds([]);
      return;
    }

    setSelectedParticipantIds(participants.map((participant) => participant.id));
  }

  async function onBulkMarkPresent() {
    if (selectedParticipantIds.length === 0) {
      onToast({ tone: "error", message: "Toplu islem icin en az bir katilimci secin." });
      return;
    }

    if (!resolvedAttendanceSessionId) {
      onToast({ tone: "error", message: "Toplu islem icin once bir oturum secin." });
      return;
    }

    const approved = window.confirm(
      `${selectedParticipantIds.length} katilimciyi VAR olarak isaretlemek istiyor musunuz?`,
    );

    if (!approved) {
      return;
    }

    setIsBulkUpdating(true);

    try {
      const results = await Promise.allSettled(
        selectedParticipantIds.map((participantId) =>
          manualUpsertAttendance(eventId, {
            participantId,
            isValid: true,
            sessionId: resolvedAttendanceSessionId,
          }),
        ),
      );

      const successCount = results.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        onToast({
          tone: "success",
          message: `${successCount} kayit VAR olarak guncellendi.`,
        });
      }

      if (failedCount > 0) {
        onToast({
          tone: "error",
          message: `${failedCount} kayit guncellenemedi.`,
        });
      }

      setSelectedParticipantIds([]);
      await refreshAllRelatedQueries();
    } finally {
      setIsBulkUpdating(false);
    }
  }

  function openAttendanceActionDialog(
    participant: ParticipantItem,
    nextIsValid: boolean,
    record: AttendanceRecordItem | undefined,
  ) {
    if (!nextIsValid && !record) {
      return;
    }

    setAttendanceActionDialog({
      participantId: participant.id,
      participantName: participant.name,
      nextIsValid,
      reason: nextIsValid ? "" : (record?.invalidReason ?? ""),
    });
  }

  const allRowsSelected =
    participants.length > 0 &&
    participants.every((participant) => selectedParticipantIds.includes(participant.id));

  async function onUploadCsv() {
    if (!selectedFile) {
      onToast({ tone: "error", message: "Once bir CSV dosyasi secmelisiniz." });
      return;
    }

    setImportResult(null);
    setUploadProgress(0);
    setIsUploading(true);

    try {
      const result = await importParticipantsCsv(eventId, selectedFile, setUploadProgress);
      setImportResult(result.data);
      setSelectedFile(null);
      onToast({ tone: "success", message: "CSV import islemi tamamlandi." });
      await queryClient.invalidateQueries({ queryKey: ["participants", eventId] });
    } catch (error) {
      if (error instanceof ApiError) {
        onToast({ tone: "error", message: error.message });
      } else {
        onToast({ tone: "error", message: "CSV import sirasinda hata olustu." });
      }
    } finally {
      setIsUploading(false);
    }
  }

  function onDropCsvFile(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      onToast({ tone: "error", message: "Sadece .csv uzantili dosyalar kabul edilir." });
      return;
    }

    setSelectedFile(file);
  }

  return (
    <section className="space-y-4">
      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Katilimci Yonetimi</h3>
            <p className="mt-1 text-sm text-zinc-600">{participantCountLabel}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={csvTemplateHref}
              download="participants-template.csv"
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              CSV Template
            </a>
            <button
              type="button"
              onClick={() => {
                setIsManualModalOpen(true);
              }}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Manuel Ekle
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="participantsSearch" className="sr-only">
            Katilimci ara
          </label>
          <input
            id="participantsSearch"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="Ad, e-posta veya telefon ile ara"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="attendanceSessionSelect" className="text-xs font-semibold text-zinc-600">
              Manuel Yoklama Oturumu
            </label>
            <select
              id="attendanceSessionSelect"
              value={attendanceSessionSelection}
              onChange={(event) => {
                setAttendanceSessionSelection(event.target.value);
              }}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="auto">Otomatik (aktif veya en son oturum)</option>
              {sessionsQuery.data?.data.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              Secili: {selectedSessionName}
            </p>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={!canManageAttendance || isBulkUpdating || selectedCount === 0}
              onClick={() => {
                void onBulkMarkPresent();
              }}
              className="w-full rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              {isBulkUpdating
                ? "Toplu islem suruyor..."
                : `Secilileri Var Isaretle (${selectedCount})`}
            </button>
          </div>
        </div>
      </article>

      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900">CSV Yukleme</h3>
        <p className="mt-1 text-sm text-zinc-600">Dosyayi surukleyip birakabilir veya sec butonunu kullanabilirsiniz.</p>

        <div
          className={`mt-4 rounded-2xl border-2 border-dashed p-6 text-center transition ${
            isDragOver ? "border-zinc-900 bg-zinc-100" : "border-zinc-300"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragOver(false);
            onDropCsvFile(event.dataTransfer.files.item(0));
          }}
        >
          <input
            id="participantsCsv"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              onDropCsvFile(event.target.files?.item(0) ?? null);
            }}
          />
          <p className="text-sm text-zinc-600">
            {selectedFile ? `Secilen dosya: ${selectedFile.name}` : "CSV dosyanizi bu alana birakin"}
          </p>
          <label
            htmlFor="participantsCsv"
            className="mt-3 inline-flex cursor-pointer rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Dosya Sec
          </label>
        </div>

        {isUploading ? (
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-600">Yukleme: %{uploadProgress}</p>
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => {
              void onUploadCsv();
            }}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {isUploading ? "Yukleniyor..." : "CSV Yukle"}
          </button>
        </div>

        {importResult ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p>Toplam Satir: {importResult.total}</p>
            <p>Basarili: {importResult.success}</p>
            <p>Hatali: {importResult.failed}</p>

            {importResult.failed > 0 ? (
              <details className="mt-3 rounded-lg border border-zinc-200 bg-white p-3">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
                  Basarisiz Satirlar
                </summary>
                <div className="mt-2 space-y-2">
                  {importResult.errors.map((rowError) => (
                    <p key={`${rowError.row}-${rowError.message}`} className="text-xs text-rose-700">
                      Satir {rowError.row}: {rowError.message}
                    </p>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
      </article>

      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900">Katilimci Listesi</h3>

        {participantsQuery.isPending ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2">&nbsp;</th>
                  <th className="px-3 py-2">Ad</th>
                  <th className="px-3 py-2">E-posta</th>
                  <th className="px-3 py-2">Telefon</th>
                  <th className="px-3 py-2">Kaynak</th>
                  <th className="px-3 py-2">Var / Yok</th>
                  <th className="px-3 py-2">Tarih</th>
                  <th className="px-3 py-2">Islem</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-t border-zinc-100">
                    <td className="px-3 py-2"><div className="h-4 w-4 animate-pulse rounded bg-zinc-200" /></td>
                    <td className="px-3 py-2"><div className="h-4 w-28 animate-pulse rounded bg-zinc-200" /></td>
                    <td className="px-3 py-2"><div className="h-4 w-32 animate-pulse rounded bg-zinc-200" /></td>
                    <td className="px-3 py-2"><div className="h-4 w-24 animate-pulse rounded bg-zinc-200" /></td>
                    <td className="px-3 py-2"><div className="h-4 w-16 animate-pulse rounded bg-zinc-200" /></td>
                    <td className="px-3 py-2"><div className="h-6 w-16 animate-pulse rounded bg-zinc-200" /></td>
                    <td className="px-3 py-2"><div className="h-4 w-24 animate-pulse rounded bg-zinc-200" /></td>
                    <td className="px-3 py-2"><div className="h-6 w-14 animate-pulse rounded bg-zinc-200" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {participantsQuery.isError ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Katilimci listesi yuklenemedi.
            <button
              type="button"
              onClick={() => {
                void participantsQuery.refetch();
              }}
              className="ml-3 rounded-lg border border-rose-300 px-3 py-1 font-semibold"
            >
              Tekrar Dene
            </button>
          </div>
        ) : null}

        {!participantsQuery.isPending &&
        !participantsQuery.isError &&
        participantsQuery.data.data.length === 0 ? (
          <EmptyState
            iconLabel="PT"
            title="Katilimci listesi bos"
            message="CSV yukleyin veya manuel ekleyin."
            ctaLabel="Manuel Ekle"
            onCtaClick={() => {
              setIsManualModalOpen(true);
            }}
          />
        ) : null}

        {!participantsQuery.isPending &&
        !participantsQuery.isError &&
        participantsQuery.data.data.length > 0 ? (
          <>
            <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allRowsSelected}
                        onChange={(event) => {
                          onToggleSelectAll(event.target.checked);
                        }}
                        className="h-4 w-4 rounded border-zinc-300"
                        aria-label="Tum satirlari sec"
                      />
                    </th>
                    <th className="px-3 py-2">Ad</th>
                    <th className="px-3 py-2">E-posta</th>
                    <th className="px-3 py-2">Telefon</th>
                    <th className="px-3 py-2">Kaynak</th>
                    <th className="px-3 py-2">Var / Yok</th>
                    <th className="px-3 py-2">Tarih</th>
                    <th className="px-3 py-2 text-right">Islem</th>
                  </tr>
                </thead>
                <tbody>
                  {participantsQuery.data.data.map((participant) => (
                    <tr key={participant.id} className="border-t border-zinc-100">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedParticipantIds.includes(participant.id)}
                          onChange={(event) => {
                            onToggleParticipantSelection(participant.id, event.target.checked);
                          }}
                          className="h-4 w-4 rounded border-zinc-300"
                          aria-label={`${participant.name} sec`}
                        />
                      </td>
                      <td className="px-3 py-2 text-zinc-900">{participant.name}</td>
                      <td className="px-3 py-2 text-zinc-700">{participant.email ?? "-"}</td>
                      <td className="px-3 py-2 text-zinc-700">{participant.phone ?? "-"}</td>
                      <td className="px-3 py-2 text-zinc-700">{sourceLabel[participant.source]}</td>
                      <td className="px-3 py-2 text-zinc-700">
                        {(() => {
                          const attendanceRecord = attendanceStatusQuery.data?.[participant.id];
                          const isPresent = Boolean(attendanceRecord?.isValid);

                          return (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={!canManageAttendance || isAttendanceUpdating || attendanceStatusQuery.isPending}
                                onClick={() => {
                                  openAttendanceActionDialog(
                                    participant,
                                    !isPresent,
                                    attendanceRecord,
                                  );
                                }}
                                className={`rounded-lg border px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                                  isPresent
                                    ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                                }`}
                              >
                                {isPresent ? "Var" : "Yok"}
                              </button>
                              <span className="text-xs text-zinc-500">
                                {attendanceRecord
                                  ? attendanceRecord.isValid
                                    ? "Kayitli"
                                    : "Gecersiz"
                                  : "Kayit Yok"}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2 text-zinc-700">{formatDate(participant.createdAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            void onDeleteParticipant(participant.id);
                          }}
                          className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-zinc-600">
                  Sayfa {pagination.page} / {pagination.totalPages}
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

      {isManualModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-zinc-900">Manuel Katilimci Ekle</h4>
            <form
              className="mt-4 space-y-3"
              onSubmit={manualForm.handleSubmit((values) => {
                void onCreateManualParticipant(values);
              })}
            >
              <div className="space-y-1">
                <label htmlFor="participantName" className="text-sm font-medium text-zinc-700">
                  Ad Soyad
                </label>
                <input
                  id="participantName"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  {...manualForm.register("name")}
                />
                {manualForm.formState.errors.name ? (
                  <p className="text-xs text-rose-600">{manualForm.formState.errors.name.message}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label htmlFor="participantEmail" className="text-sm font-medium text-zinc-700">
                  E-posta
                </label>
                <input
                  id="participantEmail"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  {...manualForm.register("email")}
                />
                {manualForm.formState.errors.email ? (
                  <p className="text-xs text-rose-600">{manualForm.formState.errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label htmlFor="participantPhone" className="text-sm font-medium text-zinc-700">
                  Telefon
                </label>
                <input
                  id="participantPhone"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  {...manualForm.register("phone")}
                />
                {manualForm.formState.errors.phone ? (
                  <p className="text-xs text-rose-600">{manualForm.formState.errors.phone.message}</p>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsManualModalOpen(false);
                    manualForm.reset();
                  }}
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  Iptal
                </button>
                <button
                  type="submit"
                  disabled={manualForm.formState.isSubmitting}
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {manualForm.formState.isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {attendanceActionDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-zinc-900">
              {attendanceActionDialog.nextIsValid ? "Var Olarak Isaretle" : "Yok Olarak Isaretle"}
            </h4>
            <p className="mt-2 text-sm text-zinc-700">
              {attendanceActionDialog.participantName} icin yoklama durumunu {" "}
              <strong>{attendanceActionDialog.nextIsValid ? "VAR" : "YOK"}</strong> olarak
              guncellemek istiyor musunuz?
            </p>

            {!attendanceActionDialog.nextIsValid ? (
              <div className="mt-3 space-y-1">
                <label
                  htmlFor="attendanceActionReason"
                  className="text-xs font-semibold text-zinc-600"
                >
                  Sebep (opsiyonel)
                </label>
                <textarea
                  id="attendanceActionReason"
                  value={attendanceActionDialog.reason}
                  onChange={(event) => {
                    setAttendanceActionDialog((current) => {
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
                  placeholder="Ornek: Manuel kontrol sonrasi yok"
                />
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAttendanceActionDialog(null);
                }}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Iptal
              </button>
              <button
                type="button"
                disabled={isAttendanceUpdating}
                onClick={() => {
                  if (!attendanceActionDialog) {
                    return;
                  }

                  void upsertAttendanceForParticipant(
                    attendanceActionDialog.participantId,
                    attendanceActionDialog.nextIsValid,
                    attendanceActionDialog.nextIsValid
                      ? undefined
                      : (attendanceActionDialog.reason.trim() || undefined),
                  ).finally(() => {
                    setAttendanceActionDialog(null);
                  });
                }}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {isAttendanceUpdating ? "Guncelleniyor..." : "Onayla"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
