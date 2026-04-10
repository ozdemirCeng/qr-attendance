type InlineToastProps = {
  tone: "success" | "error";
  message: string;
};

export function InlineToast({ tone, message }: InlineToastProps) {
  const isSuccess = tone === "success";

  return (
    <div
      role="status"
      className="animate-slide-up rounded-xl px-4 py-3 text-sm font-medium"
      style={{
        background: isSuccess ? "var(--success-soft)" : "var(--error-soft)",
        color: isSuccess ? "var(--success)" : "var(--error)",
        border: `1px solid ${isSuccess ? "var(--success)" : "var(--error)"}`,
      }}
    >
      <span className="mr-2">{isSuccess ? "✓" : "✕"}</span>
      {message}
    </div>
  );
}
