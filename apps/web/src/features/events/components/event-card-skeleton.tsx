export function EventCardSkeleton() {
  return (
    <article className="glass rounded-2xl p-5">
      <div className="skeleton h-5 w-2/3" />
      <div className="skeleton mt-3 h-4 w-1/2" />
      <div className="skeleton mt-2 h-4 w-1/3" />
      <div className="mt-5 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-7 w-16" />
      </div>
    </article>
  );
}
