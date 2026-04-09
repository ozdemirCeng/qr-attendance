"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

const loginSchema = z.object({
  identifier: z.string().trim().min(2, "E-posta veya kullanici adi girin"),
  password: z.string().min(6, "Parola en az 6 karakter olmali"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { signIn, user, isLoading } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const nextPath = "/dashboard";

  const form = useForm<LoginFormValues>({
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(nextPath);
    }
  }, [isLoading, nextPath, router, user]);

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
      await signIn(parsed.data);
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
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="kp-card w-full max-w-md p-8">
        <header className="mb-6 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
            Secure Access
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900" data-display="true">
            Admin Girisi
          </h1>
          <p className="text-sm text-zinc-600">QR yoklama paneline erismek icin giris yapin.</p>
          <p className="text-xs text-zinc-500">E-posta veya kullanici adi ile giris yapabilirsiniz.</p>
        </header>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <label htmlFor="identifier" className="text-sm font-medium text-zinc-700">
              E-posta / Kullanici Adi
            </label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              className="kp-input w-full px-3 py-2 text-sm transition"
              {...form.register("identifier")}
            />
            {form.formState.errors.identifier ? (
              <p className="text-xs text-rose-600">{form.formState.errors.identifier.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700">
              Parola
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="kp-input w-full px-3 py-2 pr-20 text-sm transition"
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={() => {
                  setShowPassword((current) => !current);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
              >
                {showPassword ? "Gizle" : "Goster"}
              </button>
            </div>
            {form.formState.errors.password ? (
              <p className="text-xs text-rose-600">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="kp-btn-primary w-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {form.formState.isSubmitting ? "Giris yapiliyor..." : "Giris Yap"}
          </button>
        </form>
      </section>
    </main>
  );
}
