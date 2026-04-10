"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useParticipantAuth } from "@/providers/participant-auth-provider";

const loginSchema = z.object({
  identifier: z.string().trim().min(2, "Email veya kullanici bilgisi girin"),
  password: z.string().min(6, "Parola en az 6 karakter olmali"),
});

type LoginMode = "participant" | "admin";
type LoginFormValues = z.infer<typeof loginSchema>;

function resolveInitialMode(
  rawRole: string | null,
  rawNext: string | null,
): LoginMode {
  if (rawRole === "admin") {
    return "admin";
  }

  if (rawNext?.startsWith("/dashboard") || rawNext?.startsWith("/events")) {
    return "admin";
  }

  return "participant";
}

function resolveSafeNextPath(rawPath: string | null, mode: LoginMode) {
  const fallback = mode === "admin" ? "/dashboard" : "/profile";

  if (!rawPath || !rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return fallback;
  }

  if (
    mode === "participant" &&
    (rawPath.startsWith("/dashboard") || rawPath.startsWith("/events"))
  ) {
    return fallback;
  }

  if (
    mode === "admin" &&
    (rawPath.startsWith("/profile") ||
      rawPath.startsWith("/scan") ||
      rawPath.startsWith("/check-in"))
  ) {
    return fallback;
  }

  return rawPath;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const nextParam = searchParams.get("next");
  const { signIn, user, isLoading } = useAuth();
  const {
    participantSignIn,
    participantUser,
    isParticipantLoading,
  } = useParticipantAuth();
  const [mode, setMode] = useState<LoginMode>(() =>
    resolveInitialMode(roleParam, nextParam),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    defaultValues: { identifier: "", password: "" },
  });

  const nextPath = useMemo(
    () => resolveSafeNextPath(nextParam, mode),
    [mode, nextParam],
  );

  useEffect(() => {
    const roleFromQuery = resolveInitialMode(roleParam, nextParam);
    setMode(roleFromQuery);
  }, [nextParam, roleParam]);

  useEffect(() => {
    if (isLoading || isParticipantLoading) {
      return;
    }

    if (mode === "admin" && user) {
      router.replace(nextPath);
      return;
    }

    if (mode === "participant" && participantUser) {
      router.replace(nextPath);
      return;
    }

    if (!roleParam && user && !participantUser) {
      router.replace(resolveSafeNextPath(nextParam, "admin"));
      return;
    }

    if (!roleParam && participantUser && !user) {
      router.replace(resolveSafeNextPath(nextParam, "participant"));
    }
  }, [
    isLoading,
    isParticipantLoading,
    mode,
    nextParam,
    nextPath,
    participantUser,
    roleParam,
    router,
    user,
  ]);

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
      if (mode === "admin") {
        await signIn({
          identifier: parsed.data.identifier,
          password: parsed.data.password,
        });
      } else {
        const normalizedEmail = parsed.data.identifier.trim().toLowerCase();

        if (!normalizedEmail.includes("@")) {
          form.setError("identifier", {
            type: "manual",
            message: "Katilimci girisi icin gecerli bir e-posta girin.",
          });
          return;
        }

        await participantSignIn({
          email: normalizedEmail,
          password: parsed.data.password,
        });
      }

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
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
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
                QR Yoklama
              </p>
              <h1
                className="mt-3 text-4xl font-extrabold leading-tight"
                style={{ color: "var(--text-primary)" }}
                data-display="true"
              >
                Tek giris ekrani.
                <br />
                Rolune gore devam et.
              </h1>
              <p
                className="mt-4 max-w-xl text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Katilimciysan tarama ekranina, yoneticiysen kontrol paneline
                yonlendirileceksin. Check-in akisinda konum ve selfie
                dogrulamasi zorunludur.
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
                    Giris yapmadan tarama ekranina gec.
                  </p>
                </Link>

                <Link
                  href={`/forgot-password?role=${mode}`}
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
                    Hesabina uygun sifre yardimina git.
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
                    Kayit Ol
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Katilimci hesabi olustur.
                  </p>
                </Link>
              </div>

              {mode === "admin" ? (
                <div
                  className="mt-8 rounded-2xl p-4"
                  style={{ background: "var(--surface-soft)" }}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Demo Admin
                  </p>
                  <p
                    className="mt-2 font-mono text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Kullanici:{" "}
                    <span style={{ color: "var(--text-primary)" }}>
                      demo.admin
                    </span>
                  </p>
                  <p
                    className="mt-1 font-mono text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Sifre:{" "}
                    <span style={{ color: "var(--text-primary)" }}>
                      DemoAdmin123!
                    </span>
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="border-t border-white/10 p-8 md:p-10 lg:border-l lg:border-t-0">
            <div className="flex gap-2 rounded-2xl bg-[var(--surface-soft)] p-1">
              {(
                [
                  {
                    id: "participant",
                    label: "Katilimci",
                  },
                  {
                    id: "admin",
                    label: "Yonetici",
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMode(item.id);
                    setFormError(null);
                  }}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition"
                  style={{
                    background:
                      mode === item.id ? "var(--surface)" : "transparent",
                    color:
                      mode === item.id
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <h2
                className="text-2xl font-bold"
                style={{ color: "var(--text-primary)" }}
                data-display="true"
              >
                {mode === "admin" ? "Yonetici Girisi" : "Katilimci Girisi"}
              </h2>
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {mode === "admin"
                  ? "Dashboard ve etkinlik yonetimi icin giris yapin."
                  : "Profil ekranina girin, oradan tarama veya hesap islemlerine devam edin."}
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
                  {mode === "admin" ? "Email / Kullanici" : "E-posta"}
                </label>
                <input
                  id="identifier"
                  type={mode === "participant" ? "email" : "text"}
                  autoComplete="username"
                  className="glass-input w-full"
                  placeholder={
                    mode === "admin"
                      ? "demo.admin veya admin@example.com"
                      : "ayse@example.com"
                  }
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
                  : mode === "admin"
                    ? "Yonetici Girisi"
                    : "Katilimci Girisi"}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
              <Link
                href={`/forgot-password?role=${mode}`}
                className="font-semibold"
                style={{ color: "var(--primary)" }}
              >
                Sifremi Unuttum
              </Link>

              {mode === "participant" ? (
                <p style={{ color: "var(--text-secondary)" }}>
                  Hesabin yok mu?{" "}
                  <Link
                    href="/auth/signup"
                    className="font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    Kayit Ol
                  </Link>
                </p>
              ) : (
                <p style={{ color: "var(--text-secondary)" }}>
                  Katilimci misin?{" "}
                  <button
                    type="button"
                    className="font-semibold"
                    style={{ color: "var(--primary)" }}
                    onClick={() => {
                      setMode("participant");
                    }}
                  >
                    Katilimci girisine gec
                  </button>
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
