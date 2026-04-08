import Link from "next/link";

import type { EventStatus } from "@/lib/events";

type EventCardProps = {
  id: string;
  title: string;
  date: string;
  locationName: string;
  status: EventStatus;
  participantCount?: number;
};

const statusMeta: Record<EventStatus, { label: string; color: string }> = {
  draft: {
    label: "Taslak",
    color: "bg-amber-100 text-amber-700",
  },
  active: {
    label: "Aktif",
    color: "bg-emerald-100 text-emerald-700",
  },
  completed: {
    label: "Tamamlandi",
    color: "bg-sky-100 text-sky-700",
  },
  archived: {
    label: "Arsiv",
    color: "bg-zinc-200 text-zinc-700",
  },
};

export function EventCard({
  id,
  title,
  date,
  locationName,
  status,
  participantCount = 0,
}: EventCardProps) {
  const meta = statusMeta[status];

  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold leading-6">{title}</h2>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${meta.color}`}>
          {meta.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-600">{date}</p>
      <p className="mt-1 text-sm text-zinc-500">{locationName}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-zinc-500">
          Katilimci: {participantCount}
        </span>
        <Link
          href={`/events/${id}`}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
        >
          Detay
        </Link>
      </div>
    </article>
  );
}