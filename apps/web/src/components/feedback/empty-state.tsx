import Link from "next/link";

type EmptyStateProps = {
  iconLabel: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
};

export function EmptyState({
  iconLabel,
  title,
  message,
  ctaLabel,
  ctaHref,
  onCtaClick,
}: EmptyStateProps) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">
        {iconLabel}
      </div>
      <h4 className="mt-3 text-base font-semibold text-zinc-900">{title}</h4>
      <p className="mt-1 text-sm text-zinc-600">{message}</p>

      {ctaLabel ? (
        <div className="mt-4 flex justify-center">
          {ctaHref ? (
            <Link
              href={ctaHref}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              {ctaLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onCtaClick}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              {ctaLabel}
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}