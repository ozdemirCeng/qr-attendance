"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { InlineToast } from "@/components/feedback/inline-toast";
import { AppShell } from "@/components/layout/app-shell";
import { AttendanceTabPanel } from "@/features/attendance/components";
import { ExportTabPanel } from "@/features/exports/components";
import { ParticipantsTabPanel } from "@/features/participants/components/participants-tab-panel";
import { QrDisplayTabPanel } from "@/features/qr/components/qr-display-tab-panel";
import { ApiError } from "@/lib/api";
import { getEvent } from "@/lib/events";
import { createSession, listSessions } from "@/lib/sessions";

const sessionSchema = z
  .object({
    name: z.string().trim().min(2, "Oturum adı en az 2 karakter olmalı"),
    startsAt: z.string().min(1, "Başlangıç zorunlu"),
    endsAt: z.string().min(1, "Bitiş zorunlu"),
  })
  .refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
    message: "Bitiş zamanı başlangıç zamanından sonra olmalı",
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
  { key: "participants", label: "Katılımcılar" },
  { key: "qr", label: "QR" },
  { key: "attendance", label: "Katılım" },
  { key: "export", label: "Dışa Aktar" },
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

function getCurrentDateTimeLocal() {
  const now = new Date();
  now.setSeconds(0, 0);
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return getCurrentDateTimeLocal();
  }
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const initialDateTime = getCurrentDateTimeLocal();
  const sessionDefaultsAppliedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<EventTab>("general");
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const queryClient = useQueryClient();

  const sessionForm = useForm<SessionFormValues>({
    defaultValues: {
      name: "",
      startsAt: initialDateTime,
      endsAt: initialDateTime,
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

  useEffect(() => {
    if (sessionDefaultsAppliedRef.current) {
      return;
    }

    const event = eventQuery.data?.data;
    if (!event) {
      return;
    }

    sessionForm.reset({
      name: "",
      startsAt: toDateTimeLocal(event.startsAt),
      endsAt: toDateTimeLocal(event.endsAt),
    });
    sessionDefaultsAppliedRef.current = true;
  }, [eventQuery.data, sessionForm]);

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

      setToast({ tone: "success", message: "Oturum başarıyla eklendi." });
      sessionForm.reset();
      await queryClient.invalidateQueries({ queryKey: ["sessions", eventId] });
    } catch (error) {
      if (error instanceof ApiError) {
        setToast({ tone: "error", message: error.message });
        return;
      }
      setToast({ tone: "error", message: "Oturum eklenirken hata oluştu." });
    }
  }

  return (
    <AppShell>
      <section className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard" className="btn-secondary text-sm">← Panele Dön</Link>
            <Link href={`/check-in/${eventId}`} className="btn-secondary text-sm">📷 Canlı Tarama</Link>
          </div>
          <Link href="/events/new" className="btn-primary text-sm">+ Yeni Etkinlik</Link>
        </div>

        {toast ? <InlineToast tone={toast.tone} message={toast.message} /> : null}

        {eventQuery.isPending ? (
          <article className="glass rounded-2xl p-6">
            <div className="skeleton h-6 w-1/2" />
            <div className="skeleton mt-3 h-4 w-2/3" />
          </article>
        ) : null}

        {eventQuery.isError ? (
          <article className="rounded-2xl p-4 text-sm" style={{ background: "var(--error-soft)", color: "var(--error)" }}>
            Etkinlik bilgisi yüklenemedi.
          </article>
        ) : null}

        {!eventQuery.isPending && !eventQuery.isError ? (
          <>
            <article className="glass rounded-2xl p-6">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }} data-display="true">{eventQuery.data.data.name}</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{eventQuery.data.data.locationName}</p>
            </article>

            <nav className="glass flex gap-1 overflow-x-auto rounded-2xl p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setActiveTab(tab.key); }}
                  className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all"
                  style={{
                    background: activeTab === tab.key ? "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))" : "transparent",
                    color: activeTab === tab.key ? "white" : "var(--text-secondary)",
                    boxShadow: activeTab === tab.key ? "var(--shadow-glow)" : "none",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {activeTab === "general" ? (
              <article className="glass rounded-2xl p-6">
                <dl className="grid gap-5 md:grid-cols-2">
                  {[
                    { label: "Başlangıç", value: formatDate(eventQuery.data.data.startsAt) },
                    { label: "Bitiş", value: formatDate(eventQuery.data.data.endsAt) },
                    { label: "Yarıçap", value: `${eventQuery.data.data.radiusMeters} m` },
                    { label: "Konum", value: `${eventQuery.data.data.latitude}, ${eventQuery.data.data.longitude}` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl p-3" style={{ background: "var(--surface-soft)" }}>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
                        {item.label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ) : null}

            {activeTab === "sessions" ? (
              <section className="space-y-4">
                <article className="glass rounded-2xl p-6">
                  <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }} data-display="true">Yeni Oturum Ekle</h3>
                  <form
                    className="mt-4 grid gap-4 md:grid-cols-3"
                    onSubmit={sessionForm.handleSubmit((values) => { void onCreateSession(values); })}
                  >
                    <div className="space-y-1.5 md:col-span-3">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="sessionName">Oturum Adı</label>
                      <input id="sessionName" className="glass-input w-full" {...sessionForm.register("name")} />
                      {sessionForm.formState.errors.name ? <p className="text-xs" style={{ color: "var(--error)" }}>{sessionForm.formState.errors.name.message}</p> : null}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="sessionStartsAt">Başlangıç</label>
                      <input id="sessionStartsAt" type="datetime-local" className="glass-input w-full" {...sessionForm.register("startsAt")} />
                      {sessionForm.formState.errors.startsAt ? <p className="text-xs" style={{ color: "var(--error)" }}>{sessionForm.formState.errors.startsAt.message}</p> : null}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="sessionEndsAt">Bitiş</label>
                      <input id="sessionEndsAt" type="datetime-local" className="glass-input w-full" {...sessionForm.register("endsAt")} />
                      {sessionForm.formState.errors.endsAt ? <p className="text-xs" style={{ color: "var(--error)" }}>{sessionForm.formState.errors.endsAt.message}</p> : null}
                    </div>

                    <div className="flex items-end">
                      <button type="submit" disabled={sessionForm.formState.isSubmitting} className="btn-primary w-full py-2.5 text-sm">
                        {sessionForm.formState.isSubmitting ? "Ekleniyor..." : "Oturum Ekle"}
                      </button>
                    </div>
                  </form>
                </article>

                <article className="glass rounded-2xl p-6">
                  <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }} data-display="true">Oturum Listesi</h3>

                  {sessionsQuery.isPending ? (
                    <div className="mt-4 space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-xl p-4" style={{ background: "var(--surface-soft)" }}>
                          <div className="skeleton h-4 w-1/3" />
                          <div className="skeleton mt-2 h-3 w-2/3" />
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {sessionsQuery.isError ? (
                    <p className="mt-4 text-sm" style={{ color: "var(--error)" }}>Oturum listesi yüklenemedi.</p>
                  ) : null}

                  {!sessionsQuery.isPending && !sessionsQuery.isError && sessionsQuery.data.data.length === 0 ? (
                    <p className="mt-4 text-sm" style={{ color: "var(--text-tertiary)" }}>Henüz oturum eklenmemiş.</p>
                  ) : null}

                  {!sessionsQuery.isPending && !sessionsQuery.isError && sessionsQuery.data.data.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {sessionsQuery.data.data.map((session) => (
                        <div key={session.id} className="rounded-xl p-4" style={{ background: "var(--surface-soft)" }}>
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{session.name}</p>
                          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
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
              <ParticipantsTabPanel eventId={eventId} onToast={(nextToast) => { setToast(nextToast); }} />
            ) : null}

            {activeTab === "qr" ? (
              <QrDisplayTabPanel eventId={eventId} onToast={(nextToast) => { setToast(nextToast); }} onOpenSessionsTab={() => { setActiveTab("sessions"); }} />
            ) : null}

            {activeTab === "attendance" ? (
              <AttendanceTabPanel eventId={eventId} onToast={(nextToast) => { setToast(nextToast); }} />
            ) : null}

            {activeTab === "export" ? (
              <ExportTabPanel eventId={eventId} onToast={(nextToast) => { setToast(nextToast); }} />
            ) : null}
          </>
        ) : null}
      </section>
    </AppShell>
  );
}

