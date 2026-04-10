"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ApiError } from "@/lib/api";
import { getActiveSession, login, type PortalRole } from "@/lib/auth";
import { useAuth } from "@/providers/auth-provider";
import { useParticipantAuth } from "@/providers/participant-auth-provider";

const loginSchema = z.object({
  identifier: z.string().trim().min(2, "Email veya kullanici bilgisi girin"),
  password: z.string().min(6, "Parola en az 6 karakter olmali"),
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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const { user, isLoading } = useAuth();
  const { participantUser, isParticipantLoading } = useParticipantAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    defaultValues: { identifier: "", password: "" },
  });

  const existingRole = useMemo<PortalRole | null>(() => {
    if (user) {
      return user.role;
    }

    if (participantUser) {
      return "member";
    }

    return null;
  }, [participantUser, user]);

  useEffect(() => {
    if (isLoading || isParticipantLoading || !existingRole) {
      return;
    }

    router.replace(resolveSafeNextPath(nextParam, existingRole));
  }, [existingRole, isLoading, isParticipantLoading, nextParam, router]);

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

      const session = await getActiveSession();
      const nextPath = resolveSafeNextPath(nextParam, session.data.role);
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        return;
      }

      setFormError("Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="glass-elevated w-full max-w-5xl animate-scale-in overflow-hidden rounded-[2rem]">
        <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative overflow-hidden p-8 md:p-10">
            <div
              className="absolute inset-0 opacity-80"
              style={{
                background:
                  "radial-gradient(circle at top left, rgba(0,113,227,0.18), transparent 42%), radial-gradient(circle at bottom right, rgba(34,197,94,0.16), transparent 36%)",
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
                Tek Giris
              </p>
              <h1
                className="mt-3 text-4xl font-extrabold leading-tight"
                style={{ color: "var(--text-primary)" }}
                data-display="true"
              >
                Ayni ekrandan gir.
                <br />
                Rolune gore panele gec.
              </h1>
              <p
                className="mt-4 max-w-xl text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Admin bilgileriyle girersen admin paneline, uye hesabiyla
                girersen kullanici dashboardina yonlendirilirsin.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Link href="/scan" className="glass rounded-2xl p-4 text-left">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    QR Tara
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Oturum varsa dogrudan tarama akisina gec.
                  </p>
                </Link>

                <Link
                  href="/forgot-password"
                  className="glass rounded-2xl p-4 text-left"
                >
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Sifremi Unuttum
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Hesap yardimi ve sifre akisina git.
                  </p>
                </Link>

                <Link
                  href="/auth/signup"
                  className="glass rounded-2xl p-4 text-left"
                >
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Uye Ol
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Yeni kullanici hesabi olustur.
                  </p>
                </Link>
              </div>

              <div
                className="mt-8 rounded-2xl p-4"
                style={{ background: "var(--surface-soft)" }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Sistem Mantigi
                </p>
                <p
                  className="mt-2 text-sm"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Tek form kullanilir. Sistemde admin olarak tanimli hesaba
                  girersen admin paneli acilir. Normal uye hesabi ile girersen
                  kullanici dashboardi acilir.
                </p>
              </div>
            </div>
          </section>

          <section className="border-t border-white/10 p-8 md:p-10 lg:border-l lg:border-t-0">
            <div>
              <h2
                className="text-2xl font-bold"
                style={{ color: "var(--text-primary)" }}
                data-display="true"
              >
                Giris Yap
              </h2>
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Email veya kullanici bilgin ile tek formdan oturum ac.
              </p>
            </div>

            <form
              className="mt-6 space-y-5"
              onSubmit={form.handleSubmit((values) => {
                void onSubmit(values);
              })}
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="identifier"
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Email / Kullanici
                </label>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  className="glass-input w-full"
                  placeholder="demo.admin veya ayse@example.com"
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold transition"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {showPassword ? "Gizle" : "Goster"}
                  </button>
                </div>
                {form.formState.errors.password ? (
                  <p className="text-xs" style={{ color: "var(--error)" }}>
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              {formError ? (
                <p className="text-sm" style={{ color: "var(--error)" }}>
                  {formError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="btn-primary w-full py-3 text-sm"
              >
                {form.formState.isSubmitting
                  ? "Giris yapiliyor..."
                  : "Devam Et"}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
              <Link
                href="/forgot-password"
                className="font-semibold"
                style={{ color: "var(--primary)" }}
              >
                Sifremi Unuttum
              </Link>

              <p style={{ color: "var(--text-secondary)" }}>
                Hesabin yok mu?{" "}
                <Link
                  href="/auth/signup"
                  className="font-semibold"
                  style={{ color: "var(--primary)" }}
                >
                  Uye Ol
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
