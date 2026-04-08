"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { ApiError } from "@/lib/api";
import {
  CsvImportResponse,
  ParticipantSource,
  createParticipantManual,
  importParticipantsCsv,
  listParticipants,
  removeParticipant,
} from "@/lib/participants";

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
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
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

  const pagination = participantsQuery.data?.pagination;

  const participantCountLabel = useMemo(() => {
    if (!pagination) {
      return "Katilimci sayisi yukleniyor";
    }

    return `${pagination.total} kayit`;
  }, [pagination]);

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
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-zinc-100" />
            ))}
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
          <p className="mt-4 text-sm text-zinc-600">Filtreye uygun katilimci bulunamadi.</p>
        ) : null}

        {!participantsQuery.isPending &&
        !participantsQuery.isError &&
        participantsQuery.data.data.length > 0 ? (
          <>
            <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Ad</th>
                    <th className="px-3 py-2">E-posta</th>
                    <th className="px-3 py-2">Telefon</th>
                    <th className="px-3 py-2">Kaynak</th>
                    <th className="px-3 py-2">Tarih</th>
                    <th className="px-3 py-2 text-right">Islem</th>
                  </tr>
                </thead>
                <tbody>
                  {participantsQuery.data.data.map((participant) => (
                    <tr key={participant.id} className="border-t border-zinc-100">
                      <td className="px-3 py-2 text-zinc-900">{participant.name}</td>
                      <td className="px-3 py-2 text-zinc-700">{participant.email ?? "-"}</td>
                      <td className="px-3 py-2 text-zinc-700">{participant.phone ?? "-"}</td>
                      <td className="px-3 py-2 text-zinc-700">{sourceLabel[participant.source]}</td>
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
    </section>
  );
}
