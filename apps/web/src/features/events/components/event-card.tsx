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
    color: "bg-amber-50 text-zinc-700",
  },
  active: {
    label: "Aktif",
    color: "bg-emerald-50 text-emerald-700",
  },
  completed: {
    label: "Tamamlandi",
    color: "bg-zinc-100 text-zinc-700",
  },
  archived: {
    label: "Arsiv",
    color: "bg-zinc-100 text-zinc-700",
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
    <article className="kp-card p-5 transition hover:translate-y-[-2px]">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-bold leading-6" data-display="true">
          {title}
        </h2>
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
          className="kp-btn-secondary rounded-lg px-3 py-1.5 text-xs font-semibold transition"
        >
          Detay
        </Link>
      </div>
    </article>
  );
}