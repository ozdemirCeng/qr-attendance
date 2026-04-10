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

const statusMeta: Record<EventStatus, { label: string; chipClass: string }> = {
  draft: { label: "Taslak", chipClass: "chip-warning" },
  active: { label: "Aktif", chipClass: "chip-success" },
  completed: { label: "Tamamlandı", chipClass: "chip-neutral" },
  archived: { label: "Arşiv", chipClass: "chip-neutral" },
};

export function EventCard({ id, title, date, locationName, status, participantCount = 0 }: EventCardProps) {
  const meta = statusMeta[status];

  return (
    <article className="glass group rounded-2xl p-5 transition-all hover:translate-y-[-2px]">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-bold leading-6" style={{ color: "var(--text-primary)" }} data-display="true">
          {title}
        </h2>
        <span className={`chip ${meta.chipClass}`}>{meta.label}</span>
      </div>
      <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{date}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>{locationName}</p>

      <div className="mt-4 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
        <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
          {participantCount} Katılımcı
        </span>
        <Link href={`/events/${id}`} className="btn-ghost text-xs">
          Detay →
        </Link>
      </div>
    </article>
  );
}