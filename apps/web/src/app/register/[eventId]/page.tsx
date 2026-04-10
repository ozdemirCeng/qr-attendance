"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ApiError } from "@/lib/api";
import { selfRegisterParticipant } from "@/lib/participants";

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Ad Soyad en az 2 karakter olmalı"),
    email: z.string().trim().email("E-posta formatı geçersiz").optional().or(z.literal("")),
    phone: z.string().trim().max(32, "Telefon en fazla 32 karakter").optional().or(z.literal("")),
  })
  .refine((v) => Boolean(v.email) || Boolean(v.phone), {
    message: "E-posta veya telefon numarasından en az birini girin",
    path: ["phone"],
  });

type RegisterFormValues = { name: string; email: string; phone: string };

type RegisterPageProps = { params: { eventId: string } };

export default function RegisterPage({ params }: RegisterPageProps) {
  const { eventId } = params;
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredName, setRegisteredName] = useState("");

  const form = useForm<RegisterFormValues>({ defaultValues: { name: "", email: "", phone: "" } });

  async function onSubmit(values: RegisterFormValues) {
    form.clearErrors();
    setFormError(null);
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const entries = Object.entries(fe) as Array<[keyof RegisterFormValues, string[] | undefined]>;
      for (const [field, messages] of entries) { if (messages?.[0]) { form.setError(field, { type: "manual", message: messages[0] }); } }
      return;
    }
    try {
      await selfRegisterParticipant({
        eventId,
        name: parsed.data.name,
        email: parsed.data.email || undefined,
        phone: parsed.data.phone || undefined,
      });
      setRegisteredName(parsed.data.name);
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiError) { setFormError(error.message); return; }
      setFormError("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  }

  if (isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="absolute right-5 top-5"><ThemeToggle /></div>
        <section className="glass-elevated w-full max-w-md animate-scale-in rounded-3xl p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl" style={{ background: "var(--success-soft)" }}>✅</div>
          <h1 className="mt-4 text-2xl font-extrabold" style={{ color: "var(--text-primary)" }} data-display="true">Kayıt Başarılı!</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <strong>{registeredName}</strong>, etkinliğe başarıyla kaydoldunuz.
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
            Etkinlik sırasında QR kodu okutup e-posta veya telefonunuzu girerek hızlıca giriş yapabilirsiniz.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href={`/register/${eventId}`} className="btn-secondary text-sm" onClick={() => { setIsSuccess(false); form.reset(); }}>
              Başka Kişi Kaydet
            </Link>
            <Link href={`/check-in/${eventId}`} className="btn-primary text-sm">QR Tara</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>

      <div className="glass-elevated w-full max-w-md animate-scale-in rounded-3xl p-8 md:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: "var(--surface-soft)" }}>📋</div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }} data-display="true">Etkinliğe Kayıt Ol</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Bilgilerini girerek etkinliğe önceden kaydol. QR okutma sırasında otomatik tanınırsın.
          </p>
        </div>

        <form className="space-y-5" onSubmit={form.handleSubmit((values) => { void onSubmit(values); })}>
          <div className="space-y-1.5">
            <label htmlFor="regName" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Ad Soyad *</label>
            <input id="regName" type="text" className="glass-input w-full" placeholder="Ayşe Yılmaz" {...form.register("name")} />
            {form.formState.errors.name ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="regEmail" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>E-posta</label>
            <input id="regEmail" type="email" className="glass-input w-full" placeholder="ayse@example.com" {...form.register("email")} />
            {form.formState.errors.email ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.email.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="regPhone" className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Telefon</label>
            <input id="regPhone" type="tel" className="glass-input w-full" placeholder="+905551112233" {...form.register("phone")} />
            {form.formState.errors.phone ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.phone.message}</p> : null}
          </div>

          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>* E-posta veya telefondan en az biri zorunludur</p>

          {formError ? <p className="text-sm" style={{ color: "var(--error)" }}>{formError}</p> : null}

          <button type="submit" disabled={form.formState.isSubmitting} className="btn-primary w-full py-3 text-sm">
            {form.formState.isSubmitting ? "Kaydediliyor..." : "Kayıt Ol"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href={`/check-in/${eventId}`} className="text-sm font-medium" style={{ color: "var(--primary)" }}>
            Zaten kayıtlıyım, QR taramaya geç →
          </Link>
        </div>

        <div className="mt-4 rounded-xl p-3 text-center" style={{ background: "var(--surface-soft)" }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Etkinlik ID: {eventId}
          </p>
        </div>
      </div>
    </main>
  );
}
