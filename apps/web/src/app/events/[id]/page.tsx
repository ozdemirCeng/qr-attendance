"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { InlineToast } from "@/components/feedback/inline-toast";
import { AppShell } from "@/components/layout/app-shell";
import { ParticipantsTabPanel } from "@/features/participants/components/participants-tab-panel";
import { QrDisplayTabPanel } from "@/features/qr/components/qr-display-tab-panel";
import { ApiError } from "@/lib/api";
import { getEvent } from "@/lib/events";
import { createSession, listSessions } from "@/lib/sessions";

const sessionSchema = z
  .object({
    name: z.string().trim().min(2, "Oturum adi en az 2 karakter olmali"),
    startsAt: z.string().min(1, "Baslangic zorunlu"),
    endsAt: z.string().min(1, "Bitis zorunlu"),
  })
  .refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
    message: "Bitis zamani baslangic zamanindan sonra olmali",
    path: ["endsAt"],
  });

type SessionFormValues = {
  name: string;
  startsAt: string;
  endsAt: string;
};

type EventTab = "general" | "sessions" | "participants" | "qr" | "attendance" | "export";

const tabs: Array<{ key: EventTab; label: string }> = [
  { key: "general", label: "Genel Bilgi" },
  { key: "sessions", label: "Oturumlar" },
  { key: "participants", label: "Katilimcilar" },
  { key: "qr", label: "QR" },
  { key: "attendance", label: "Katilim" },
  { key: "export", label: "Export" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const [activeTab, setActiveTab] = useState<EventTab>("general");
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const queryClient = useQueryClient();

  const sessionForm = useForm<SessionFormValues>({
    defaultValues: {
      name: "",
      startsAt: "",
      endsAt: "",
    },
  });

  const eventQuery = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => getEvent(eventId),
  });

  const sessionsQuery = useQuery({
    queryKey: ["sessions", eventId],
    queryFn: () => listSessions(eventId),
    enabled: activeTab === "sessions",
  });

  async function onCreateSession(values: SessionFormValues) {
    setToast(null);
    sessionForm.clearErrors();

    const parsed = sessionSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const entries = Object.entries(fieldErrors) as Array<
        [keyof SessionFormValues, string[] | undefined]
      >;

      for (const [field, messages] of entries) {
        if (messages?.[0]) {
          sessionForm.setError(field, { type: "manual", message: messages[0] });
        }
      }
      return;
    }

    try {
      await createSession(eventId, {
        name: parsed.data.name,
        startsAt: new Date(parsed.data.startsAt).toISOString(),
        endsAt: new Date(parsed.data.endsAt).toISOString(),
      });

      setToast({ tone: "success", message: "Oturum basariyla eklendi." });
      sessionForm.reset();
      await queryClient.invalidateQueries({ queryKey: ["sessions", eventId] });
    } catch (error) {
      if (error instanceof ApiError) {
        setToast({ tone: "error", message: error.message });
        return;
      }
      setToast({ tone: "error", message: "Oturum eklenirken hata olustu." });
    }
  }

  return (
    <AppShell>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Dashboarda Don
          </Link>
          <Link
            href="/events/new"
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Yeni Etkinlik
          </Link>
        </div>

        {toast ? <InlineToast tone={toast.tone} message={toast.message} /> : null}

        {eventQuery.isPending ? (
          <article className="animate-pulse rounded-2xl bg-white p-6 shadow-sm">
            <div className="h-6 w-1/2 rounded bg-zinc-200" />
            <div className="mt-3 h-4 w-2/3 rounded bg-zinc-200" />
          </article>
        ) : null}

        {eventQuery.isError ? (
          <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Etkinlik bilgisi yuklenemedi.
          </article>
        ) : null}

        {!eventQuery.isPending && !eventQuery.isError ? (
          <>
            <article className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-900">{eventQuery.data.data.name}</h2>
              <p className="mt-1 text-sm text-zinc-600">{eventQuery.data.data.locationName}</p>
            </article>

            <nav className="overflow-x-auto rounded-2xl bg-white p-2 shadow-sm">
              <div className="flex min-w-max gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                      activeTab === tab.key
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>

            {activeTab === "general" ? (
              <article className="rounded-2xl bg-white p-6 shadow-sm">
                <dl className="grid gap-4 md:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Baslangic
                    </dt>
                    <dd className="mt-1 text-sm text-zinc-800">
                      {formatDate(eventQuery.data.data.startsAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Bitis
                    </dt>
                    <dd className="mt-1 text-sm text-zinc-800">
                      {formatDate(eventQuery.data.data.endsAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Yaricap
                    </dt>
                    <dd className="mt-1 text-sm text-zinc-800">{eventQuery.data.data.radiusMeters} m</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Konum
                    </dt>
                    <dd className="mt-1 text-sm text-zinc-800">
                      {eventQuery.data.data.latitude}, {eventQuery.data.data.longitude}
                    </dd>
                  </div>
                </dl>
              </article>
            ) : null}

            {activeTab === "sessions" ? (
              <section className="space-y-4">
                <article className="rounded-2xl bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-zinc-900">Yeni Oturum Ekle</h3>
                  <form
                    className="mt-4 grid gap-4 md:grid-cols-3"
                    onSubmit={sessionForm.handleSubmit((values) => {
                      void onCreateSession(values);
                    })}
                  >
                    <div className="space-y-1 md:col-span-3">
                      <label className="text-sm font-medium text-zinc-700" htmlFor="sessionName">
                        Oturum Adi
                      </label>
                      <input
                        id="sessionName"
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                        {...sessionForm.register("name")}
                      />
                      {sessionForm.formState.errors.name ? (
                        <p className="text-xs text-rose-600">{sessionForm.formState.errors.name.message}</p>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-zinc-700" htmlFor="sessionStartsAt">
                        Baslangic
                      </label>
                      <input
                        id="sessionStartsAt"
                        type="datetime-local"
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                        {...sessionForm.register("startsAt")}
                      />
                      {sessionForm.formState.errors.startsAt ? (
                        <p className="text-xs text-rose-600">{sessionForm.formState.errors.startsAt.message}</p>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-zinc-700" htmlFor="sessionEndsAt">
                        Bitis
                      </label>
                      <input
                        id="sessionEndsAt"
                        type="datetime-local"
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                        {...sessionForm.register("endsAt")}
                      />
                      {sessionForm.formState.errors.endsAt ? (
                        <p className="text-xs text-rose-600">{sessionForm.formState.errors.endsAt.message}</p>
                      ) : null}
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={sessionForm.formState.isSubmitting}
                        className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                      >
                        {sessionForm.formState.isSubmitting ? "Ekleniyor..." : "Oturum Ekle"}
                      </button>
                    </div>
                  </form>
                </article>

                <article className="rounded-2xl bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-zinc-900">Oturum Listesi</h3>

                  {sessionsQuery.isPending ? (
                    <div className="mt-4 space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="animate-pulse rounded-xl border border-zinc-200 p-4">
                          <div className="h-4 w-1/3 rounded bg-zinc-200" />
                          <div className="mt-2 h-3 w-2/3 rounded bg-zinc-200" />
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {sessionsQuery.isError ? (
                    <p className="mt-4 text-sm text-rose-600">Oturum listesi yuklenemedi.</p>
                  ) : null}

                  {!sessionsQuery.isPending &&
                  !sessionsQuery.isError &&
                  sessionsQuery.data.data.length === 0 ? (
                    <p className="mt-4 text-sm text-zinc-600">Henuz oturum eklenmemis.</p>
                  ) : null}

                  {!sessionsQuery.isPending &&
                  !sessionsQuery.isError &&
                  sessionsQuery.data.data.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {sessionsQuery.data.data.map((session) => (
                        <div key={session.id} className="rounded-xl border border-zinc-200 p-4">
                          <p className="text-sm font-semibold text-zinc-900">{session.name}</p>
                          <p className="mt-1 text-xs text-zinc-600">
                            {formatDate(session.startsAt)} - {formatDate(session.endsAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              </section>
            ) : null}

            {activeTab === "participants" ? (
              <ParticipantsTabPanel
                eventId={eventId}
                onToast={(nextToast) => {
                  setToast(nextToast);
                }}
              />
            ) : null}

            {activeTab === "qr" ? (
              <QrDisplayTabPanel
                eventId={eventId}
                onToast={(nextToast) => {
                  setToast(nextToast);
                }}
              />
            ) : null}

            {activeTab !== "general" &&
            activeTab !== "sessions" &&
            activeTab !== "participants" &&
            activeTab !== "qr" ? (
              <article className="rounded-2xl bg-white p-6 text-sm text-zinc-600 shadow-sm">
                Bu sekme sonraki adimlarda tamamlanacak.
              </article>
            ) : null}
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
