"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

const loginSchema = z.object({
  identifier: z.string().trim().min(2, "E-posta veya kullanıcı adı girin"),
  password: z.string().min(6, "Parola en az 6 karakter olmalı"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { signIn, user, isLoading } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return "/dashboard";
    const rp = new URLSearchParams(window.location.search).get("next");
    return rp && rp.startsWith("/") && !rp.startsWith("//") ? rp : "/dashboard";
  }, []);

  const form = useForm<LoginFormValues>({ defaultValues: { identifier: "", password: "" } });

  useEffect(() => {
    if (!isLoading && user) router.replace(nextPath);
  }, [isLoading, nextPath, router, user]);

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    form.clearErrors();
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      if (fe.identifier?.[0]) form.setError("identifier", { type: "manual", message: fe.identifier[0] });
      if (fe.password?.[0]) form.setError("password", { type: "manual", message: fe.password[0] });
      return;
    }
    try {
      await signIn(parsed.data);
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) { setFormError(error.message); return; }
      setFormError("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="glass-elevated w-full max-w-md animate-scale-in rounded-3xl p-8 md:p-10">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))", boxShadow: "var(--shadow-glow)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }} data-display="true">
            QR Yoklama
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Hesabınla giriş yaparak devam et
          </p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              E-posta / Kullanıcı Adı
            </label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              className="glass-input w-full"
              {...form.register("identifier")}
            />
            {form.formState.errors.identifier ? (
              <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.identifier.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Parola
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="glass-input w-full pr-16"
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={() => { setShowPassword((c) => !c); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold transition"
                style={{ color: "var(--text-tertiary)" }}
              >
                {showPassword ? "Gizle" : "Göster"}
              </button>
            </div>
            {form.formState.errors.password ? (
              <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          {formError ? <p className="text-sm" style={{ color: "var(--error)" }}>{formError}</p> : null}

          <button type="submit" disabled={form.formState.isSubmitting} className="btn-primary w-full py-3 text-sm">
            {form.formState.isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-6 rounded-xl p-4" style={{ background: "var(--surface-soft)" }}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Demo Hesap</p>
          <div className="space-y-1">
            <p className="font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>Kullanıcı: <span style={{ color: "var(--text-primary)" }}>demo.admin</span></p>
            <p className="font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>Şifre: <span style={{ color: "var(--text-primary)" }}>DemoAdmin123!</span></p>
          </div>
        </div>
      </div>
    </main>
  );
}
