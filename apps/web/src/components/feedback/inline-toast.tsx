type InlineToastProps = {
  tone: "success" | "error";
  message: string;
};

const toneClasses: Record<InlineToastProps["tone"], string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-700",
  error: "border-rose-300 bg-rose-50 text-rose-700",
};

export function InlineToast({ tone, message }: InlineToastProps) {
  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${toneClasses[tone]}`}
    >
      {message}
    </div>
  );
}
