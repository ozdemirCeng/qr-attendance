"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/feedback/empty-state";
import { listEvents } from "@/lib/events";

import { EventCard } from "./event-card";
import { EventCardSkeleton } from "./event-card-skeleton";

function formatDateRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  const dateLabel = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(start);

  const timeLabel = `${new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(start)} - ${new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(end)}`;

  return `${dateLabel} ${timeLabel}`;
}

export function DashboardEventsPanel() {
  const eventsQuery = useQuery({
    queryKey: ["events", "dashboard"],
    queryFn: () => listEvents(1, 24),
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
            Editorial Feed
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900" data-display="true">
            Etkinlikler
          </h2>
          <p className="text-sm text-zinc-600">Tum etkinliklerini tek yerden takip et.</p>
        </div>
        <Link
          href="/events/new"
          className="kp-btn-primary px-4 py-2 text-sm font-semibold transition"
        >
          Yeni Etkinlik
        </Link>
      </div>

      {eventsQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <EventCardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {eventsQuery.isError ? (
        <article className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
          Etkinlikler yuklenemedi. Lutfen tekrar deneyin.
          <button
            type="button"
            onClick={() => {
              void eventsQuery.refetch();
            }}
            className="ml-3 rounded-lg border border-rose-300 px-3 py-1 font-semibold"
          >
            Tekrar Dene
          </button>
        </article>
      ) : null}

      {!eventsQuery.isPending && !eventsQuery.isError && eventsQuery.data.data.length === 0 ? (
        <EmptyState
          iconLabel="EV"
          title="Henuz etkinlik olusturmadiniz"
          message="Ilk etkinligi eklemek icin olustur butonunu kullanin."
          ctaLabel="Olustur"
          ctaHref="/events/new"
        />
      ) : null}

      {!eventsQuery.isPending && !eventsQuery.isError && eventsQuery.data.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {eventsQuery.data.data.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              title={event.name}
              date={formatDateRange(event.startsAt, event.endsAt)}
              locationName={event.locationName}
              status={event.status}
              participantCount={0}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
