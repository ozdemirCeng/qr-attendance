"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { scanAttendance } from "@/lib/attendance";

import { clearScanContext, loadScanContext } from "../lib/scan-context";
import { VerificationSelfieCapture } from "./verification-selfie-capture";

function resolveScanErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return "UNKNOWN_ERROR";
  }

  const maybeError = error as {
    code?: unknown;
    statusCode?: unknown;
    message?: unknown;
  };

  if (typeof maybeError.code === "string" && maybeError.code.trim()) {
    return maybeError.code;
  }

  const message =
    typeof maybeError.message === "string"
      ? maybeError.message.toLowerCase()
      : "";

  if (message.includes("kayit bulunamadi")) {
    return "REGISTRATION_REQUIRED";
  }

  if (maybeError.statusCode === 400) {
    return "BAD_REQUEST";
  }

  if (maybeError.statusCode === 401) {
    return "UNAUTHORIZED";
  }

  if (maybeError.statusCode === 403) {
    return "FORBIDDEN";
  }

  if (maybeError.statusCode === 404) {
    return "NOT_FOUND";
  }

  if (maybeError.statusCode === 409) {
    return "ALREADY_CHECKED_IN";
  }

  if (maybeError.statusCode === 429) {
    return "TOO_MANY_REQUESTS";
  }

  if (maybeError.statusCode === 500) {
    return "INTERNAL_SERVER_ERROR";
  }

  return "UNKNOWN_ERROR";
}

const guestSchema = z
  .object({
    name: z.string().trim().min(2, "Ad Soyad zorunlu"),
    email: z
      .string()
      .trim()
      .email("E-posta formati gecersiz")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .trim()
      .max(32, "Telefon en fazla 32 karakter olabilir")
      .optional()
      .or(z.literal("")),
  })
  .refine((value) => Boolean(value.email) || Boolean(value.phone), {
    message: "Email yoksa telefon zorunludur",
    path: ["phone"],
  });

type GuestFormValues = {
  name: string;
  email: string;
  phone: string;
};

export function GuestCheckInForm() {
  const router = useRouter();
  const [scanContext] = useState(() => loadScanContext());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationPhotoDataUrl, setVerificationPhotoDataUrl] = useState<
    string | null
  >(scanContext?.verificationPhotoDataUrl ?? null);

  const form = useForm<GuestFormValues>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const missingContext = !scanContext;

  async function onSubmit(values: GuestFormValues) {
    form.clearErrors();
    setErrorMessage(null);

    if (!scanContext) {
      setErrorMessage("Gecerli tarama verisi bulunamadi.");
      return;
    }

    if (
      typeof scanContext.lat !== "number" ||
      typeof scanContext.lng !== "number"
    ) {
      setErrorMessage(
        "Konum dogrulamasi eksik. Lutfen yeniden tarama ekranina donun.",
      );
      return;
    }

    if (!verificationPhotoDataUrl) {
      setErrorMessage(
        "Check-in icin profil dogrulama fotografi zorunludur.",
      );
      return;
    }

    const parsed = guestSchema.safeParse(values);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const entries = Object.entries(fieldErrors) as Array<
        [keyof GuestFormValues, string[] | undefined]
      >;

      for (const [field, messages] of entries) {
        if (messages?.[0]) {
          form.setError(field, {
            type: "manual",
            message: messages[0],
          });
        }
      }

      return;
    }

    try {
      const response = await scanAttendance({
        token: scanContext.token,
        lat: scanContext.lat,
        lng: scanContext.lng,
        locationAccuracy: scanContext.locationAccuracy,
        name: parsed.data.name,
        email: parsed.data.email || undefined,
        phone: parsed.data.phone || undefined,
        verificationPhotoDataUrl,
      });

      clearScanContext();
      router.replace(
        `/check-in/result?status=success&name=${encodeURIComponent(
          response.data.participant.name,
        )}&event=${encodeURIComponent(
          response.data.event.name,
        )}&eventId=${encodeURIComponent(response.data.event.id)}`,
      );
    } catch (error) {
      const code = resolveScanErrorCode(error);

      if (
        code === "EXPIRED_TOKEN" ||
        code === "REPLAY_ATTACK" ||
        code === "SESSION_INACTIVE"
      ) {
        clearScanContext();
      }

      router.replace(
        `/check-in/result?status=error&code=${encodeURIComponent(code)}`,
      );
    }
  }

  if (missingContext) {
    return (
      <article
        className="rounded-2xl p-4 text-sm"
        style={{
          background: "var(--warning-soft)",
          color: "var(--warning)",
        }}
      >
        Gecerli bir QR token bulunamadi. Lutfen yeniden tarama ekranina donun.
        <div className="mt-3">
          <Link href="/check-in" className="btn-secondary px-3 py-1.5 text-xs">
            Taramaya Don
          </Link>
        </div>
      </article>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        void onSubmit(values);
      })}
    >
      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
          htmlFor="guestName"
        >
          Ad Soyad
        </label>
        <input
          id="guestName"
          className="glass-input w-full py-3 text-base"
          {...form.register("name")}
        />
        {form.formState.errors.name ? (
          <p className="text-xs" style={{ color: "var(--error)" }}>
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
          htmlFor="guestEmail"
        >
          E-posta
        </label>
        <input
          id="guestEmail"
          className="glass-input w-full py-3 text-base"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-xs" style={{ color: "var(--error)" }}>
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
          htmlFor="guestPhone"
        >
          Telefon
        </label>
        <input
          id="guestPhone"
          className="glass-input w-full py-3 text-base"
          {...form.register("phone")}
        />
        {form.formState.errors.phone ? (
          <p className="text-xs" style={{ color: "var(--error)" }}>
            {form.formState.errors.phone.message}
          </p>
        ) : null}
      </div>

      <VerificationSelfieCapture
        value={verificationPhotoDataUrl}
        onChange={setVerificationPhotoDataUrl}
        description="QR tarama adiminda alinan selfie burada kullanilir. Gerekirse yeniden cekebilirsiniz."
      />

      {errorMessage ? (
        <p className="text-sm" style={{ color: "var(--error)" }}>
          {errorMessage}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Link href="/check-in" className="btn-secondary min-h-11 text-sm">
          Geri Don
        </Link>
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="btn-primary min-h-11 text-sm"
        >
          {form.formState.isSubmitting
            ? "Gonderiliyor..."
            : "Katilimi Onayla"}
        </button>
      </div>
    </form>
  );
}
