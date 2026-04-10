"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/feedback/empty-state";
import { useAuth } from "@/providers/auth-provider";
import { listEvents } from "@/lib/events";

import { EventCardSkeleton } from "./event-card-skeleton";

function formatDateRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  const dateLabel = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(start);

  const timeLabel = `${new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(start)} – ${new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(end)}`;

  return `${dateLabel} · ${timeLabel}`;
}

function resolveStatusTone(status: string) {
  if (status === "active") return { label: "Aktif", chipClass: "chip-success", dotClass: "bg-[var(--success)] pulse-dot" };
  if (status === "completed") return { label: "Tamamlandı", chipClass: "chip-neutral", dotClass: "bg-[var(--text-tertiary)]" };
  if (status === "archived") return { label: "Arşiv", chipClass: "chip-neutral", dotClass: "bg-[var(--text-tertiary)]" };
  return { label: "Taslak", chipClass: "chip-warning", dotClass: "bg-[var(--warning)]" };
}

export function DashboardEventsPanel() {
  const { user } = useAuth();
  const eventsQuery = useQuery({
    queryKey: ["events", "dashboard"],
    queryFn: () => listEvents(1, 24),
  });

  const events = eventsQuery.data?.data ?? [];
  const totalEvents = events.length;
  const activeEvents = events.filter((e) => e.status === "active").length;
  const completedEvents = events.filter((e) => e.status === "completed").length;
  const draftEvents = events.filter((e) => e.status === "draft").length;
  const archivedEvents = events.filter((e) => e.status === "archived").length;

  return (
    <section className="space-y-8">
      {/* ─── Hero Greeting ─── */}
      <div className="animate-fade-in">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--text-secondary)" }}>Kontrol Paneli</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl" style={{ color: "var(--text-primary)" }} data-display="true">
          Hoş geldin{user?.name ? `, ${user.name}` : ""} 👋
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Etkinliklerini ve katılım verilerini buradan yönetebilirsin.</p>
      </div>
      {/* ─── Stats Grid ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="glass animate-slide-up rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--surface-soft)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Toplam Etkinlik</p>
              <p className="animate-counter text-3xl font-extrabold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }} data-display="true">{totalEvents}</p>
            </div>
          </div>
        </article>

        <article className="glass animate-slide-up animate-delay-1 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--success-soft)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Aktif</p>
                <p className="animate-counter text-3xl font-extrabold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }} data-display="true">{activeEvents}</p>
              </div>
            </div>
            <span className="h-3 w-3 rounded-full pulse-dot" style={{ background: "var(--success)" }} />
          </div>
        </article>

        <article className="animate-slide-up animate-delay-2 rounded-2xl p-6" style={{ background: "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))", boxShadow: "var(--shadow-glow)" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.2)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-white/70">Tamamlanan</p>
              <p className="animate-counter text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-display)" }} data-display="true">{completedEvents}</p>
            </div>
          </div>
        </article>
      </div>

      {/* ─── Loading / Error / Empty ─── */}
      {eventsQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <EventCardSkeleton key={i} />)}
        </div>
      ) : null}

      {eventsQuery.isError ? (
        <article className="glass rounded-2xl p-5" style={{ borderColor: "var(--error)" }}>
          <p className="text-sm" style={{ color: "var(--error)" }}>
            Etkinlikler yüklenemedi.
            <button type="button" onClick={() => { void eventsQuery.refetch(); }} className="btn-ghost ml-2 text-xs">
              Tekrar Dene
            </button>
          </p>
        </article>
      ) : null}

      {!eventsQuery.isPending && !eventsQuery.isError && events.length === 0 ? (
        <EmptyState iconLabel="📅" title="Henüz etkinlik oluşturmadınız" message="İlk etkinliği eklemek için oluştur butonunu kullanın." ctaLabel="Oluştur" ctaHref="/events/new" />
      ) : null}

      {/* ─── Events Feed ─── */}
      {!eventsQuery.isPending && !eventsQuery.isError && events.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

          <div className="space-y-6 lg:col-span-8">
            <div className="flex items-end justify-between">
              <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }} data-display="true">Son Etkinlikler</h3>
              <button type="button" onClick={() => { void eventsQuery.refetch(); }} className="btn-ghost text-xs">Yenile</button>
            </div>

            <div className="space-y-3">
              {events.slice(0, 6).map((event, i) => {
                const tone = resolveStatusTone(event.status);
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="glass group flex items-center gap-5 rounded-2xl p-5 transition-all animate-slide-up"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--surface-soft)" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-base font-semibold" style={{ color: "var(--text-primary)" }} data-display="true">{event.name}</h4>
                        <span className={`chip ${tone.chipClass}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${tone.dotClass}`} />
                          {tone.label}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm" style={{ color: "var(--text-secondary)" }}>
                        {event.locationName} · {formatDateRange(event.startsAt, event.endsAt)}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 transition-transform group-hover:translate-x-1">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ─── Sidebar ─── */}
          <aside className="lg:col-span-4">
            <div className="glass sticky top-24 space-y-6 rounded-2xl p-6">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }} data-display="true">Durum Özeti</h3>

              <div className="space-y-3">
                {[
                  { label: "Taslak", count: draftEvents },
                  { label: "Tamamlanan", count: completedEvents },
                  { label: "Arşivlenen", count: archivedEvents },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl p-3" style={{ background: "var(--surface-soft)" }}>
                    <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                    <span className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }} data-display="true">{item.count}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>Hızlı Erişim</p>
                <Link href="/events/new" className="btn-ghost block text-sm" style={{ color: "var(--primary)" }}>+ Yeni etkinlik oluştur</Link>
                <Link href="/dashboard/audit" className="btn-ghost block text-sm" style={{ color: "var(--primary)" }}>📋 Denetim kayıtları</Link>
                <Link href="/scan" className="btn-ghost block text-sm" style={{ color: "var(--primary)" }}>📷 QR tarama başlat</Link>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
