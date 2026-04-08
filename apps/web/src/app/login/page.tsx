"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

const loginSchema = z.object({
  email: z.string().email("Gecerli bir e-posta adresi girin"),
  password: z.string().min(6, "Parola en az 6 karakter olmali"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { signIn, user, isLoading } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const nextPath = "/dashboard";

  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
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

      if (fieldErrors.email?.[0]) {
        form.setError("email", {
          type: "manual",
          message: fieldErrors.email[0],
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
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <header className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">Admin Girisi</h1>
          <p className="text-sm text-zinc-600">QR yoklama paneline erismek icin giris yapin.</p>
        </header>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700">
              Parola
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-rose-600">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {form.formState.isSubmitting ? "Giris yapiliyor..." : "Giris Yap"}
          </button>
        </form>
      </section>
    </main>
  );
}
