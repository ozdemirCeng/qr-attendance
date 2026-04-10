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
  name: z.string().trim().min(2, "Ad en az 2 karakter olmalı"),
  email: z.string().trim().email("E-posta formatı geçersiz").optional().or(z.literal("")),
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

const sourceChipClass: Record<ParticipantSource, string> = {
  self_registered:
    "bg-[#00855b]/10 text-[#006947] border border-[#00855b]/20",
  csv: "bg-[#2170e4]/10 text-[var(--primary)] border border-[#2170e4]/20",
  manual: "bg-[#d5e0f8] text-[#586377] border border-[var(--border-strong)]/50",
};

const csvTemplateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
  "name,email,phone,external_id\nAyşe Yılmaz,ayse@ornek.com,+905551112233,STD-001\n",
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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
      return "Katılımcı sayısı yükleniyor";
    }

    return `${pagination.total} kayıt`;
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
          message: "Manuel yoklama için önce bir oturum seçmelisiniz.",
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

        onToast({ tone: "success", message: "Yoklama kaydı güncellendi." });
        await refreshAllRelatedQueries();
        return true;
      } catch (error) {
        if (error instanceof ApiError) {
          onToast({ tone: "error", message: error.message });
        } else {
          onToast({ tone: "error", message: "Yoklama kaydı güncellenemedi." });
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
      onToast({ tone: "success", message: "Katılımcı başarıyla eklendi." });
      await queryClient.invalidateQueries({ queryKey: ["participants", eventId] });
    } catch (error) {
      if (error instanceof ApiError) {
        onToast({ tone: "error", message: error.message });
        return;
      }

      onToast({ tone: "error", message: "Katılımcı eklenirken hata oluştu." });
    }
  }

  async function onDeleteParticipant(participantId: string) {
    if (!window.confirm("Katılımcıyı silmek istediğinize emin misiniz?")) {
      return;
    }

    try {
      await removeParticipant(eventId, participantId);
      onToast({ tone: "success", message: "Katılımcı silindi." });
      await queryClient.invalidateQueries({ queryKey: ["participants", eventId] });
    } catch (error) {
      if (error instanceof ApiError) {
        onToast({ tone: "error", message: error.message });
        return;
      }

      onToast({ tone: "error", message: "Katılımcı silinirken hata oluştu." });
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
      onToast({ tone: "error", message: "Toplu işlem için en az bir katılımcı seçin." });
      return;
    }

    if (!resolvedAttendanceSessionId) {
      onToast({ tone: "error", message: "Toplu işlem için önce bir oturum seçin." });
      return;
    }

    const approved = window.confirm(
      `${selectedParticipantIds.length} katılımcıyı VAR olarak işaretlemek istiyor musunuz?`,
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
      onToast({ tone: "error", message: "Önce bir CSV dosyası seçmelisiniz." });
      return;
    }

    setImportResult(null);
    setUploadProgress(0);
    setIsUploading(true);

    try {
      const result = await importParticipantsCsv(eventId, selectedFile, setUploadProgress);
      setImportResult(result.data);
      setSelectedFile(null);
      onToast({ tone: "success", message: "CSV içe aktarma işlemi tamamlandı." });
      await queryClient.invalidateQueries({ queryKey: ["participants", eventId] });
    } catch (error) {
      if (error instanceof ApiError) {
        onToast({ tone: "error", message: error.message });
      } else {
        onToast({ tone: "error", message: "CSV içe aktarma sırasında hata oluştu." });
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
      onToast({ tone: "error", message: "Sadece .csv uzantılı dosyalar kabul edilir." });
      return;
    }

    setSelectedFile(file);
  }

  return (
    <section className="space-y-6">
      <article className="rounded-2xl bg-[var(--surface-soft)] p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Yönetim Konsolu
            </p>
            <h3 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)]" data-display="true">
              Katılımcı Listesi
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">{participantCountLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={csvTemplateHref}
              download="participants-template.csv"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--surface-hover)]"
            >
              CSV Şablon
            </a>
            <button
              type="button"
              onClick={() => {
                setIsManualModalOpen(true);
              }}
              className="rounded-full bg-gradient-to-br from-[var(--primary-gradient-from)] to-[var(--primary-gradient-to)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_26px_rgba(0,88,190,0.22)]"
            >
              Manuel Ekle
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="relative">
            <input
              id="participantsSearch"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              placeholder="Ad, e-posta veya telefon ile ara..."
              className="w-full rounded-full border-none bg-white px-5 py-4 text-sm text-[var(--text-primary)] outline-none"
            />
          </div>
          <label htmlFor="attendanceSessionSelect" className="sr-only">
            Yoklama oturumu seç
          </label>
          <select
            id="attendanceSessionSelect"
            value={attendanceSessionSelection}
            onChange={(event) => {
              setAttendanceSessionSelection(event.target.value);
            }}
            title="Yoklama oturumu"
            aria-label="Yoklama oturumu"
            className="rounded-full border-none bg-white px-4 py-4 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="auto">Otomatik Oturum</option>
            {sessionsQuery.data?.data.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Seçili oturum: {selectedSessionName}
          </p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={allRowsSelected}
                onChange={(event) => {
                  onToggleSelectAll(event.target.checked);
                }}
                className="h-4 w-4"
              />
              Görünenleri seç
            </label>
            <button
              type="button"
              disabled={!canManageAttendance || isBulkUpdating || selectedCount === 0}
              onClick={() => {
                void onBulkMarkPresent();
              }}
              className="rounded-full border border-[#00855b]/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#006947] transition hover:bg-[#6ffbbe]/25 disabled:opacity-50"
            >
              {isBulkUpdating ? "İşleniyor..." : `Var İşaretle (${selectedCount})`}
            </button>
          </div>
        </div>
      </article>

      <article className="rounded-2xl bg-white p-6">
        <h4 className="text-xl font-bold text-[var(--text-primary)]" data-display="true">
          CSV İçe Aktarma
        </h4>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Sürükle bırak veya dosya seç.</p>

        <div
          className={`mt-4 rounded-2xl border-2 border-dashed p-6 text-center transition ${
            isDragOver
              ? "border-[var(--primary)] bg-[var(--surface-soft)]"
              : "border-[var(--border-strong)] bg-[var(--surface-soft)]"
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

          <p className="text-sm text-[var(--text-secondary)]">
            {selectedFile ? `Seçili: ${selectedFile.name}` : "CSV dosyasını buraya bırakın"}
          </p>
          <label
            htmlFor="participantsCsv"
            className="mt-3 inline-flex cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-[var(--primary)]"
          >
            Dosya Seç
          </label>
        </div>

        {isUploading ? (
          <div className="mt-4">
            <progress
              value={uploadProgress}
              max={100}
              className="h-2 w-full overflow-hidden rounded-full bg-[#d3e4fe] [&::-webkit-progress-bar]:bg-[#d3e4fe] [&::-webkit-progress-value]:bg-gradient-to-r [&::-webkit-progress-value]:from-[var(--primary-gradient-from)] [&::-webkit-progress-value]:to-[var(--primary-gradient-to)] [&::-moz-progress-bar]:bg-gradient-to-r [&::-moz-progress-bar]:from-[var(--primary-gradient-from)] [&::-moz-progress-bar]:to-[var(--primary-gradient-to)]"
              aria-label="CSV yükleme ilerlemesi"
            />
            <p className="mt-2 text-xs text-[var(--text-secondary)]">Yükleme %{uploadProgress}</p>
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => {
              void onUploadCsv();
            }}
            className="rounded-full bg-gradient-to-br from-[var(--primary-gradient-from)] to-[var(--primary-gradient-to)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isUploading ? "Yükleniyor..." : "CSV İçe Aktar"}
          </button>
        </div>

        {importResult ? (
          <div className="mt-4 rounded-2xl bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-secondary)]">
            <p>Toplam: {importResult.total}</p>
            <p>Başarılı: {importResult.success}</p>
            <p>Başarısız: {importResult.failed}</p>

            {importResult.failed > 0 ? (
              <details className="mt-3 rounded-xl bg-white p-3">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--text-primary)]">
                  Başarısız Satırlar
                </summary>
                <div className="mt-2 space-y-2">
                  {importResult.errors.map((rowError) => (
                    <p key={`${rowError.row}-${rowError.message}`} className="text-xs text-[var(--error)]">
                      Satır {rowError.row}: {rowError.message}
                    </p>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
      </article>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h4 className="text-2xl font-bold text-[var(--text-primary)]" data-display="true">
            Katılımcılar
          </h4>
        </div>

        {participantsQuery.isPending ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-52 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : null}

        {participantsQuery.isError ? (
          <div className="rounded-2xl border border-[var(--error)] bg-[var(--error-soft)] p-4 text-sm text-[var(--error)]">
            Katilimci listesi yuklenemedi.
            <button
              type="button"
              onClick={() => {
                void participantsQuery.refetch();
              }}
              className="ml-3 rounded-lg border border-[var(--error)] px-3 py-1 font-semibold"
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
            title="Katılımcı listesi boş"
            message="CSV yükleyin veya manuel ekleyin."
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {participants.map((participant) => {
                const attendanceRecord = attendanceStatusQuery.data?.[participant.id];
                const isPresent = Boolean(attendanceRecord?.isValid);
                const isSelected = selectedParticipantIds.includes(participant.id);

                return (
                  <article
                    key={participant.id}
                    className={`relative rounded-2xl p-6 transition ${
                      isSelected
                        ? "bg-[#dce9ff]"
                        : "bg-white hover:bg-[var(--surface-soft)]"
                    }`}
                  >
                    <div className="absolute left-4 top-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => {
                          onToggleParticipantSelection(participant.id, event.target.checked);
                        }}
                        className="h-4 w-4"
                        aria-label={`${participant.name} sec`}
                      />
                    </div>

                    <div className="absolute right-4 top-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${sourceChipClass[participant.source]}`}
                      >
                        {sourceLabel[participant.source]}
                      </span>
                    </div>

                    <div className="mt-7 flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5eeff] text-lg font-bold text-[var(--primary)]" data-display="true">
                        {getInitials(participant.name) || "PT"}
                      </div>
                      <div className="min-w-0">
                        <h5 className="truncate text-lg font-bold text-[var(--text-primary)]" data-display="true">
                          {participant.name}
                        </h5>
                        <p className="truncate text-sm text-[var(--text-secondary)]">{participant.email ?? "-"}</p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">{participant.phone ?? "-"}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border-strong)]/35 pt-4">
                      <div>
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
                          className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                            isPresent
                              ? "border-[var(--success)] text-[var(--success)] hover:bg-[var(--success-soft)]"
                              : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]"
                          }`}
                        >
                          {isPresent ? "Var" : "Yok"}
                        </button>
                        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                          {attendanceRecord
                            ? attendanceRecord.isValid
                              ? "Kayıtlı"
                              : "Geçersiz"
                            : "Kayıt yok"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] text-[var(--text-secondary)]">{formatDate(participant.createdAt)}</p>
                        <button
                          type="button"
                          onClick={() => {
                            void onDeleteParticipant(participant.id);
                          }}
                          className="mt-1 rounded-full border border-[var(--error)] px-3 py-1 text-[11px] font-semibold text-[var(--error)] hover:bg-[var(--error-soft)]"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {pagination ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4">
                <p className="text-xs text-[var(--text-secondary)]">
                  Sayfa {pagination.page} / {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPage((current) => Math.max(1, current - 1));
                    }}
                    disabled={pagination.page <= 1}
                    className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] disabled:opacity-50"
                  >
                    Önceki
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPage((current) => Math.min(pagination.totalPages, current + 1));
                    }}
                    disabled={pagination.page >= pagination.totalPages}
                    className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] disabled:opacity-50"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {isManualModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-[var(--text-primary)]" data-display="true">
              Manuel Katılımcı Ekle
            </h4>
            <form
              className="mt-4 space-y-3"
              onSubmit={manualForm.handleSubmit((values) => {
                void onCreateManualParticipant(values);
              })}
            >
              <div className="space-y-1">
                <label htmlFor="participantName" className="text-sm font-medium text-[var(--text-secondary)]">
                  Ad Soyad
                </label>
                <input
                  id="participantName"
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                  {...manualForm.register("name")}
                />
                {manualForm.formState.errors.name ? (
                  <p className="text-xs text-[var(--error)]">{manualForm.formState.errors.name.message}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label htmlFor="participantEmail" className="text-sm font-medium text-[var(--text-secondary)]">
                  E-posta
                </label>
                <input
                  id="participantEmail"
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                  {...manualForm.register("email")}
                />
                {manualForm.formState.errors.email ? (
                  <p className="text-xs text-[var(--error)]">{manualForm.formState.errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label htmlFor="participantPhone" className="text-sm font-medium text-[var(--text-secondary)]">
                  Telefon
                </label>
                <input
                  id="participantPhone"
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                  {...manualForm.register("phone")}
                />
                {manualForm.formState.errors.phone ? (
                  <p className="text-xs text-[var(--error)]">{manualForm.formState.errors.phone.message}</p>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsManualModalOpen(false);
                    manualForm.reset();
                  }}
                  className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={manualForm.formState.isSubmitting}
                  className="rounded-full bg-gradient-to-br from-[var(--primary-gradient-from)] to-[var(--primary-gradient-to)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {manualForm.formState.isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {attendanceActionDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-[var(--text-primary)]" data-display="true">
              {attendanceActionDialog.nextIsValid ? "Var Olarak İşaretle" : "Yok Olarak İşaretle"}
            </h4>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {attendanceActionDialog.participantName} için yoklama durumunu {" "}
              <strong>{attendanceActionDialog.nextIsValid ? "VAR" : "YOK"}</strong> olarak
              güncellemek istiyor musunuz?
            </p>

            {!attendanceActionDialog.nextIsValid ? (
              <div className="mt-3 space-y-1">
                <label
                  htmlFor="attendanceActionReason"
                  className="text-xs font-semibold text-[var(--text-secondary)]"
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
                  className="min-h-24 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                  placeholder="Örnek: Manuel kontrol sonrası yok"
                />
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAttendanceActionDialog(null);
                }}
                className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]"
              >
                İptal
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
                className="rounded-full bg-gradient-to-br from-[var(--primary-gradient-from)] to-[var(--primary-gradient-to)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isAttendanceUpdating ? "Güncelleniyor..." : "Onayla"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
