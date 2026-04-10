import Link from "next/link";

type EmptyStateProps = {
  iconLabel: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
};

export function EmptyState({ iconLabel, title, message, ctaLabel, ctaHref, onCtaClick }: EmptyStateProps) {
  return (
    <article className="glass animate-scale-in rounded-2xl p-10 text-center">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl"
        style={{ background: "var(--surface-soft)" }}
      >
        {iconLabel}
      </div>
      <h4 className="mt-4 text-lg font-bold" style={{ color: "var(--text-primary)" }} data-display="true">
        {title}
      </h4>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{message}</p>

      {ctaLabel ? (
        <div className="mt-5">
          {ctaHref ? (
            <Link href={ctaHref} className="btn-primary px-6 py-2.5 text-sm">
              {ctaLabel}
            </Link>
          ) : (
            <button type="button" onClick={onCtaClick} className="btn-primary px-6 py-2.5 text-sm">
              {ctaLabel}
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}