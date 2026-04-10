"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ApiError } from "@/lib/api";
import { useParticipantAuth } from "@/providers/participant-auth-provider";

const loginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter"),
});

type LoginValues = { email: string; password: string };

export default function ParticipantLoginPage() {
  const { participantSignIn } = useParticipantAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({ defaultValues: { email: "", password: "" } });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    form.clearErrors();
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const fields = Object.entries(fe) as Array<[keyof LoginValues, string[] | undefined]>;
      for (const [field, messages] of fields) { if (messages?.[0]) { form.setError(field, { type: "manual", message: messages[0] }); } }
      return;
    }
    try {
      await participantSignIn(parsed.data);
      router.push("/scan");
    } catch (error) {
      if (error instanceof ApiError) { setFormError(error.message); return; }
      setFormError("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>

      <div className="glass-elevated w-full max-w-md animate-scale-in rounded-3xl p-8 md:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))", boxShadow: "var(--shadow-glow)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }} data-display="true">Katılımcı Girişi</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Hesabınla giriş yaparak QR yoklamaya hızlıca katıl</p>
        </div>

        <form className="space-y-5" onSubmit={form.handleSubmit((v) => { void onSubmit(v); })}>
          <div className="space-y-1.5">
            <label htmlFor="pLoginEmail" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>E-posta</label>
            <input id="pLoginEmail" type="email" autoComplete="email" className="glass-input w-full" placeholder="ayse@example.com" {...form.register("email")} />
            {form.formState.errors.email ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.email.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pLoginPass" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Şifre</label>
            <div className="relative">
              <input id="pLoginPass" type={showPassword ? "text" : "password"} autoComplete="current-password" className="glass-input w-full pr-16" {...form.register("password")} />
              <button type="button" onClick={() => { setShowPassword((c) => !c); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>
                {showPassword ? "Gizle" : "Göster"}
              </button>
            </div>
            {form.formState.errors.password ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.password.message}</p> : null}
          </div>

          {formError ? <p className="text-sm" style={{ color: "var(--error)" }}>{formError}</p> : null}

          <button type="submit" disabled={form.formState.isSubmitting} className="btn-primary w-full py-3 text-sm">
            {form.formState.isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Hesabın yok mu?{" "}
          <Link href="/auth/signup" className="font-semibold" style={{ color: "var(--primary)" }}>Kayıt Ol</Link>
        </p>

        <div className="mt-4 rounded-xl p-3 text-center" style={{ background: "var(--surface-soft)" }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Yönetici misiniz?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "var(--primary)" }}>Admin girişi →</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
