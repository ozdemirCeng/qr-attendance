"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/feedback/empty-state";
import { UserShell } from "@/components/layout/user-shell";
import { ApiError } from "@/lib/api";
import { participantGetDashboard } from "@/lib/participant-auth";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function UserDashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["participant-dashboard"],
    queryFn: participantGetDashboard,
  });

  const events = dashboardQuery.data?.data.events ?? [];
  const upcomingEvents = useMemo(
    () =>
      events.filter((event) => new Date(event.startsAt).getTime() >= Date.now()),
    [events],
  );

  return (
    <UserShell>
      <section className="space-y-8">
        <div className="animate-fade-in">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--text-secondary)" }}
          >
            Kullanici Dashboard
          </p>
          <h1
            className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl"
            style={{ color: "var(--text-primary)" }}
            data-display="true"
          >
            Etkinliklerin ve hesabin tek yerde.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Kayitli oldugun etkinlikleri, yoklama durumunu ve profil bilgilerini
            buradan yonetebilirsin.
          </p>
        </div>

        {dashboardQuery.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-28 rounded-2xl" />
            ))}
          </div>
        ) : null}

        {dashboardQuery.isError ? (
          <article className="glass rounded-2xl p-5">
            <p className="text-sm" style={{ color: "var(--error)" }}>
              {dashboardQuery.error instanceof ApiError &&
              dashboardQuery.error.statusCode === 401
                ? "Oturumun sonlandi. Devam etmek icin yeniden giris yap."
                : "Kullanici paneli yuklenemedi."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/login?next=/user/dashboard" className="btn-primary text-sm">
                Giris Ekrani
              </Link>
              <Link href="/scan" className="btn-secondary text-sm">
                QR Tara
              </Link>
            </div>
          </article>
        ) : null}

        {!dashboardQuery.isPending && !dashboardQuery.isError ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Kayitli Etkinlik",
                  value: dashboardQuery.data?.data.summary.registeredEvents ?? 0,
                },
                {
                  label: "Yoklama Alinan",
                  value: dashboardQuery.data?.data.summary.attendedEvents ?? 0,
                },
                {
                  label: "Yaklasan",
                  value: dashboardQuery.data?.data.summary.upcomingEvents ?? 0,
                },
                {
                  label: "Tamamlanan",
                  value: dashboardQuery.data?.data.summary.completedEvents ?? 0,
                },
              ].map((item) => (
                <article
                  key={item.label}
                  className="glass rounded-2xl p-5"
                >
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="mt-3 text-3xl font-extrabold"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-display)",
                    }}
                    data-display="true"
                  >
                    {item.value}
                  </p>
                </article>
              ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2
                      className="text-xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                      data-display="true"
                    >
                      Etkinlik Gecmisi
                    </h2>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Kayitli oldugun veya yoklama aldigin etkinlikler.
                    </p>
                  </div>
                  <Link href="/scan" className="btn-primary text-sm">
                    QR Tara
                  </Link>
                </div>

                {events.length === 0 ? (
                  <EmptyState
                    iconLabel="EV"
                    title="Henuz etkinlik baglantin yok"
                    message="Bir etkinlige kayit oldugunda veya yoklama aldiginda burada listelenecek."
                    ctaLabel="QR Taramaya Git"
                    ctaHref="/scan"
                  />
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => {
                      const statusLabel = event.isAttended
                        ? "Yoklama Alindi"
                        : event.isRegistered
                          ? "Kayitli"
                          : "Takipte";

                      return (
                        <article
                          key={event.id}
                          className="glass rounded-2xl p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3
                                className="text-lg font-semibold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {event.name}
                              </h3>
                              <p
                                className="mt-1 text-sm"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {event.locationName}
                              </p>
                            </div>
                            <span
                              className="rounded-full px-3 py-1 text-xs font-semibold"
                              style={{
                                background: event.isAttended
                                  ? "var(--success-soft)"
                                  : "var(--surface-soft)",
                                color: event.isAttended
                                  ? "var(--success)"
                                  : "var(--text-secondary)",
                              }}
                            >
                              {statusLabel}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div
                              className="rounded-xl p-3"
                              style={{ background: "var(--surface-soft)" }}
                            >
                              <p
                                className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                Etkinlik Zamani
                              </p>
                              <p
                                className="mt-2 text-sm font-semibold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {formatDate(event.startsAt)}
                              </p>
                              <p
                                className="mt-1 text-xs"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                Bitis: {formatDate(event.endsAt)}
                              </p>
                            </div>
                            <div
                              className="rounded-xl p-3"
                              style={{ background: "var(--surface-soft)" }}
                            >
                              <p
                                className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                Kayit Durumu
                              </p>
                              <p
                                className="mt-2 text-sm font-semibold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {event.registeredAt
                                  ? `Kayit: ${formatDate(event.registeredAt)}`
                                  : "Dogrudan kayit kaydi yok"}
                              </p>
                              <p
                                className="mt-1 text-xs"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {event.attendedAt
                                  ? `Yoklama: ${formatDate(event.attendedAt)}`
                                  : "Henuz yoklama alinmadi"}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              <aside className="space-y-4">
                <article className="glass rounded-2xl p-5">
                  <h2
                    className="text-lg font-bold"
                    style={{ color: "var(--text-primary)" }}
                    data-display="true"
                  >
                    Yaklasan Etkinlikler
                  </h2>
                  <div className="mt-4 space-y-3">
                    {upcomingEvents.length === 0 ? (
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Planlanmis bir etkinlik gorunmuyor.
                      </p>
                    ) : (
                      upcomingEvents.slice(0, 4).map((event) => (
                        <div
                          key={event.id}
                          className="rounded-xl p-3"
                          style={{ background: "var(--surface-soft)" }}
                        >
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {event.name}
                          </p>
                          <p
                            className="mt-1 text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {formatDate(event.startsAt)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </article>

                <article className="glass rounded-2xl p-5">
                  <h2
                    className="text-lg font-bold"
                    style={{ color: "var(--text-primary)" }}
                    data-display="true"
                  >
                    Hızlı Islemler
                  </h2>
                  <div className="mt-4 grid gap-2">
                    <Link href="/scan" className="btn-primary text-sm">
                      QR Tarama Baslat
                    </Link>
                    <Link href="/user/profile" className="btn-secondary text-sm">
                      Profili Duzenle
                    </Link>
                  </div>
                </article>
              </aside>
            </div>
          </>
        ) : null}
      </section>
    </UserShell>
  );
}
