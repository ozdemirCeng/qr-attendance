export function EventCardSkeleton() {
  return (
    <article className="animate-pulse rounded-2xl bg-white p-5 shadow-sm">
      <div className="h-5 w-2/3 rounded bg-zinc-100" />
      <div className="mt-3 h-4 w-1/2 rounded bg-zinc-100" />
      <div className="mt-2 h-4 w-1/3 rounded bg-zinc-100" />
      <div className="mt-5 flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-zinc-100" />
        <div className="h-7 w-16 rounded bg-zinc-100" />
      </div>
    </article>
  );
}
