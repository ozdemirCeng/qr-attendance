"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ApiError } from "@/lib/api";
import { getActiveSession, login, type PortalRole } from "@/lib/auth";

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(2, "E-posta, telefon veya kullanıcı bilgisi girin."),
  password: z.string().min(6, "Parola en az 6 karakter olmalı."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function resolveDefaultDashboard(role: PortalRole) {
  return role === "member" ? "/user/dashboard" : "/dashboard";
}

function resolveSafeNextPath(rawPath: string | null, role: PortalRole) {
  const fallback = resolveDefaultDashboard(role);

  if (!rawPath || !rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return fallback;
  }

  const isAdminPath =
    rawPath.startsWith("/dashboard") || rawPath.startsWith("/events");
  const isMemberPath =
    rawPath.startsWith("/user") ||
    rawPath.startsWith("/profile") ||
    rawPath.startsWith("/scan") ||
    rawPath.startsWith("/check-in");

  if (role === "member" && isAdminPath) {
    return fallback;
  }

  if (role !== "member" && isMemberPath) {
    return fallback;
  }

  return rawPath;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    defaultValues: { identifier: "", password: "" },
  });

  async function getActiveSessionWithRetry(maxAttempts = 3) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await getActiveSession();
      } catch (error) {
        lastError = error;

        if (
          !(error instanceof ApiError) ||
          error.statusCode !== 401 ||
          attempt === maxAttempts
        ) {
          throw error;
        }

        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, attempt * 150);
        });
      }
    }

    throw lastError;
  }

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    form.clearErrors();

    const parsed = loginSchema.safeParse(values);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;

      if (fieldErrors.identifier?.[0]) {
        form.setError("identifier", {
          type: "manual",
          message: fieldErrors.identifier[0],
        });
      }

      if (fieldErrors.password?.[0]) {
        form.setError("password", {
          type: "manual",
          message: fieldErrors.password[0],
        });
      }

      return;
    }

    try {
      await login({
        identifier: parsed.data.identifier,
        password: parsed.data.password,
      });

      const session = await getActiveSessionWithRetry();
      const nextPath = resolveSafeNextPath(nextParam, session.data.role);
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        return;
      }

      setFormError("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6 sm:py-10">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="glass-elevated w-full max-w-4xl overflow-hidden rounded-[2rem]">
        <div className="grid md:grid-cols-[1.02fr_0.98fr]">
          <section className="relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10 md:px-10">
            <div
              className="absolute inset-0 opacity-90"
              style={{
                background:
                  "radial-gradient(circle at top left, rgba(15,118,110,0.22), transparent 44%), radial-gradient(circle at bottom right, rgba(249,115,22,0.18), transparent 36%)",
              }}
            />

            <div className="relative">
              <div
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))",
                  boxShadow: "var(--shadow-glow)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>

              <p
                className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--primary)" }}
              >
                QR Yoklama
              </p>
              <h1
                className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl"
                style={{ color: "var(--text-primary)" }}
                data-display="true"
              >
                Giriş yapın
                <br />
                veya taramaya geçin.
              </h1>
              <p
                className="mt-4 max-w-xl text-sm leading-6"
                style={{ color: "var(--text-secondary)" }}
              >
                Hesabınızla oturum açın veya taramaya geçin. Sistem rolünüzü
                algılar ve sizi doğru panele yönlendirir.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className="btn-primary w-full py-3 text-sm"
                  onClick={() => {
                    document.getElementById("identifier")?.focus();
                  }}
                >
                  Giriş Yap
                </button>
                <Link
                  href="/scan"
                  className="btn-secondary w-full py-3 text-center text-sm"
                >
                  QR Tara
                </Link>
              </div>
            </div>
          </section>

          <section className="border-t border-white/10 px-6 py-8 sm:px-8 sm:py-10 md:border-l md:border-t-0 md:px-10">
            <div className="mb-6">
              <h2
                className="text-2xl font-bold"
                style={{ color: "var(--text-primary)" }}
                data-display="true"
              >
                Giriş Yap
              </h2>
              <p
                className="mt-2 text-sm leading-6"
                style={{ color: "var(--text-secondary)" }}
              >
                Tek girişle admin ya da kullanıcı olarak devam edin.
              </p>
            </div>

            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-1.5">
                <label
                  htmlFor="identifier"
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                >
                  E-posta / Telefon / Kullanıcı
                </label>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  className="glass-input w-full"
                  placeholder="demo.admin, ayse@example.com veya 0555..."
                  {...form.register("identifier")}
                />
                {form.formState.errors.identifier ? (
                  <p className="text-xs" style={{ color: "var(--error)" }}>
                    {form.formState.errors.identifier.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                >
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
                    onClick={() => {
                      setShowPassword((current) => !current);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {showPassword ? "Gizle" : "Göster"}
                  </button>
                </div>
                {form.formState.errors.password ? (
                  <p className="text-xs" style={{ color: "var(--error)" }}>
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              {formError ? (
                <div
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{
                    color: "var(--error)",
                    background: "var(--error-soft)",
                    borderColor: "var(--error)",
                  }}
                >
                  {formError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="btn-primary w-full py-3 text-sm"
              >
                {form.formState.isSubmitting
                  ? "Giriş yapılıyor..."
                  : "Devam Et"}
              </button>
            </form>

            <div
              className="mt-6 rounded-2xl p-4"
              style={{ background: "var(--surface-soft)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <Link
                  href="/forgot-password"
                  className="font-semibold"
                  style={{ color: "var(--primary)" }}
                >
                  Şifremi Unuttum
                </Link>

                <p style={{ color: "var(--text-secondary)" }}>
                  Hesabın yok mu?{" "}
                  <Link
                    href="/auth/signup"
                    className="font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    Üye Ol
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function LoginPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6 sm:py-10">
      <div className="glass-elevated w-full max-w-4xl animate-pulse rounded-[2rem] p-8 sm:p-10">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="h-4 w-28 rounded-full bg-white/40" />
            <div className="h-10 w-3/4 rounded-2xl bg-white/30" />
            <div className="h-20 rounded-2xl bg-white/20" />
          </div>
          <div className="space-y-4">
            <div className="h-10 rounded-2xl bg-white/30" />
            <div className="h-10 rounded-2xl bg-white/30" />
            <div className="h-12 rounded-2xl bg-white/40" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
