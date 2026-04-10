"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ApiError } from "@/lib/api";
import { useParticipantAuth } from "@/providers/participant-auth-provider";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Ad Soyad en az 2 karakter"),
  email: z.string().trim().email("Geçerli bir e-posta girin"),
  phone: z.string().trim().optional().or(z.literal("")),
  password: z.string().min(6, "Şifre en az 6 karakter"),
  passwordConfirm: z.string().min(6, "Şifreyi tekrar girin"),
}).refine((v) => v.password === v.passwordConfirm, {
  message: "Şifreler eşleşmiyor",
  path: ["passwordConfirm"],
});

type SignupValues = { name: string; email: string; phone: string; password: string; passwordConfirm: string };

export default function ParticipantSignupPage() {
  const { participantSignUp } = useParticipantAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignupValues>({ defaultValues: { name: "", email: "", phone: "", password: "", passwordConfirm: "" } });

  async function onSubmit(values: SignupValues) {
    setFormError(null);
    form.clearErrors();
    const parsed = signupSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const fields = Object.entries(fe) as Array<[keyof SignupValues, string[] | undefined]>;
      for (const [field, messages] of fields) { if (messages?.[0]) { form.setError(field, { type: "manual", message: messages[0] }); } }
      return;
    }
    try {
      await participantSignUp({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || undefined,
        password: parsed.data.password,
      });
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }} data-display="true">Hesap Oluştur</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Katılımcı hesabı oluşturarak etkinliklere hızlı giriş yap</p>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit((v) => { void onSubmit(v); })}>
          <div className="space-y-1.5">
            <label htmlFor="signupName" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Ad Soyad *</label>
            <input id="signupName" type="text" autoComplete="name" className="glass-input w-full" placeholder="Ayşe Yılmaz" {...form.register("name")} />
            {form.formState.errors.name ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signupEmail" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>E-posta *</label>
            <input id="signupEmail" type="email" autoComplete="email" className="glass-input w-full" placeholder="ayse@example.com" {...form.register("email")} />
            {form.formState.errors.email ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.email.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signupPhone" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Telefon</label>
            <input id="signupPhone" type="tel" autoComplete="tel" className="glass-input w-full" placeholder="+905551112233" {...form.register("phone")} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signupPass" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Şifre *</label>
            <div className="relative">
              <input id="signupPass" type={showPassword ? "text" : "password"} autoComplete="new-password" className="glass-input w-full pr-16" placeholder="En az 6 karakter" {...form.register("password")} />
              <button type="button" onClick={() => { setShowPassword((c) => !c); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>
                {showPassword ? "Gizle" : "Göster"}
              </button>
            </div>
            {form.formState.errors.password ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.password.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signupPassConfirm" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Şifre Tekrar *</label>
            <input id="signupPassConfirm" type={showPassword ? "text" : "password"} autoComplete="new-password" className="glass-input w-full" placeholder="Şifreyi tekrar girin" {...form.register("passwordConfirm")} />
            {form.formState.errors.passwordConfirm ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.passwordConfirm.message}</p> : null}
          </div>

          {formError ? <p className="text-sm" style={{ color: "var(--error)" }}>{formError}</p> : null}

          <button type="submit" disabled={form.formState.isSubmitting} className="btn-primary w-full py-3 text-sm">
            {form.formState.isSubmitting ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Zaten hesabın var mı?{" "}
          <Link href="/auth/login" className="font-semibold" style={{ color: "var(--primary)" }}>Giriş Yap</Link>
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
