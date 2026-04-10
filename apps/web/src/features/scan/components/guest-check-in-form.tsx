"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { scanAttendance } from "@/lib/attendance";
import { ApiError } from "@/lib/api";

import { clearScanContext, loadScanContext } from "../lib/scan-context";

const guestSchema = z
  .object({
    name: z.string().trim().min(2, "Ad Soyad zorunlu"),
    email: z.string().trim().email("E-posta formatı geçersiz").optional().or(z.literal("")),
    phone: z.string().trim().max(32, "Telefon en fazla 32 karakter olabilir").optional().or(z.literal("")),
  })
  .refine((value) => Boolean(value.email) || Boolean(value.phone), {
    message: "Email yoksa telefon zorunludur",
    path: ["phone"],
  });

type GuestFormValues = { name: string; email: string; phone: string };
type GuestCheckInFormProps = { eventId: string };

export function GuestCheckInForm({ eventId }: GuestCheckInFormProps) {
  const router = useRouter();
  const [scanContext] = useState(() => loadScanContext());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<GuestFormValues>({ defaultValues: { name: "", email: "", phone: "" } });

  const missingContext = !scanContext || scanContext.eventId !== eventId;

  async function onSubmit(values: GuestFormValues) {
    form.clearErrors();
    setErrorMessage(null);
    if (!scanContext || scanContext.eventId !== eventId) { setErrorMessage("Geçerli tarama verisi bulunamadı."); return; }
    const parsed = guestSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const entries = Object.entries(fieldErrors) as Array<[keyof GuestFormValues, string[] | undefined]>;
      for (const [field, messages] of entries) { if (messages?.[0]) { form.setError(field, { type: "manual", message: messages[0] }); } }
      return;
    }
    try {
      const response = await scanAttendance({
        token: scanContext.token, lat: scanContext.lat, lng: scanContext.lng,
        locationAccuracy: scanContext.locationAccuracy,
        name: parsed.data.name, email: parsed.data.email || undefined, phone: parsed.data.phone || undefined,
      });
      clearScanContext();
      router.replace(`/check-in/result?status=success&name=${encodeURIComponent(response.data.participant.name)}&event=${encodeURIComponent(response.data.event.name)}&eventId=${encodeURIComponent(eventId)}`);
    } catch (error) {
      const code = error instanceof ApiError ? (error.code ?? "HTTP_EXCEPTION") : "UNKNOWN_ERROR";
      if (code === "EXPIRED_TOKEN" || code === "REPLAY_ATTACK" || code === "SESSION_INACTIVE") { clearScanContext(); }
      router.replace(`/check-in/result?status=error&code=${encodeURIComponent(code)}&eventId=${encodeURIComponent(eventId)}`);
    }
  }

  if (missingContext) {
    return (
      <article className="rounded-2xl p-4 text-sm" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
        Geçerli bir QR token bulunamadı. Lütfen yeniden tarama ekranına dönün.
        <div className="mt-3">
          <Link href={`/check-in/${eventId}`} className="btn-secondary px-3 py-1.5 text-xs">Taramaya Dön</Link>
        </div>
      </article>
    );
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => { void onSubmit(values); })}>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="guestName">Ad Soyad</label>
        <input id="guestName" className="glass-input w-full py-3 text-base" {...form.register("name")} />
        {form.formState.errors.name ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.name.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="guestEmail">E-posta</label>
        <input id="guestEmail" className="glass-input w-full py-3 text-base" {...form.register("email")} />
        {form.formState.errors.email ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.email.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="guestPhone">Telefon</label>
        <input id="guestPhone" className="glass-input w-full py-3 text-base" {...form.register("phone")} />
        {form.formState.errors.phone ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.phone.message}</p> : null}
      </div>

      {errorMessage ? <p className="text-sm" style={{ color: "var(--error)" }}>{errorMessage}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <Link href={`/check-in/${eventId}`} className="btn-secondary min-h-11 text-sm">Geri Dön</Link>
        <button type="submit" disabled={form.formState.isSubmitting} className="btn-primary min-h-11 text-sm">
          {form.formState.isSubmitting ? "Gönderiliyor..." : "Katılımı Onayla"}
        </button>
      </div>
    </form>
  );
}
