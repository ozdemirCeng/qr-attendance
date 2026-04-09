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
    <article className="kp-card p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">
        {iconLabel}
      </div>
      <h4 className="mt-3 text-base font-bold text-zinc-900" data-display="true">
        {title}
      </h4>
      <p className="mt-1 text-sm text-zinc-600">{message}</p>

      {ctaLabel ? (
        <div className="mt-4 flex justify-center">
          {ctaHref ? (
            <Link
              href={ctaHref}
              className="kp-btn-primary px-4 py-2 text-sm font-semibold"
            >
              {ctaLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onCtaClick}
              className="kp-btn-primary px-4 py-2 text-sm font-semibold"
            >
              {ctaLabel}
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}