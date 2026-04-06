type EventCardProps = {
  title: string;
  date: string;
  status: "Taslak" | "Aktif" | "Bitti";
};

const statusColor: Record<EventCardProps["status"], string> = {
  Taslak: "bg-amber-100 text-amber-700",
  Aktif: "bg-emerald-100 text-emerald-700",
  Bitti: "bg-zinc-200 text-zinc-700",
};

export function EventCard({ title, date, status }: EventCardProps) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold leading-6">{title}</h2>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor[status]}`}>{status}</span>
      </div>
      <p className="mt-3 text-sm text-zinc-600">{date}</p>
    </article>
  );
}