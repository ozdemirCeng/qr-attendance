"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { InlineToast } from "@/components/feedback/inline-toast";
import { AppShell } from "@/components/layout/app-shell";
import { ApiError } from "@/lib/api";
import { createEvent } from "@/lib/events";

const createEventSchema = z
  .object({
    name: z.string().trim().min(3, "Etkinlik adi en az 3 karakter olmali"),
    description: z.string().trim().max(2000, "Aciklama en fazla 2000 karakter olabilir"),
    locationName: z.string().trim().min(2, "Konum adi en az 2 karakter olmali"),
    latitude: z.coerce.number().min(-90, "Enlem -90 ile 90 arasinda olmali").max(90),
    longitude: z.coerce.number().min(-180, "Boylam -180 ile 180 arasinda olmali").max(180),
    radiusMeters: z.coerce.number().min(50, "Yaricap en az 50m olmali").max(500),
    startsAt: z.string().min(1, "Baslangic tarihi zorunlu"),
    endsAt: z.string().min(1, "Bitis tarihi zorunlu"),
  })
  .refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
    message: "Bitis zamani baslangic zamanindan sonra olmali",
    path: ["endsAt"],
  });

type CreateEventFormValues = {
  name: string;
  description: string;
  locationName: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  startsAt: string;
  endsAt: string;
};

export default function NewEventPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );

  const form = useForm<CreateEventFormValues>({
    defaultValues: {
      name: "",
      description: "",
      locationName: "",
      latitude: "40.765",
      longitude: "29.94",
      radiusMeters: 100,
      startsAt: "",
      endsAt: "",
    },
  });

  async function onSubmit(values: CreateEventFormValues) {
    setToast(null);
    form.clearErrors();

    const parsed = createEventSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;

      const entries = Object.entries(fieldErrors) as Array<
        [keyof CreateEventFormValues, string[] | undefined]
      >;

      for (const [field, messages] of entries) {
        if (messages?.[0]) {
          form.setError(field, { type: "manual", message: messages[0] });
        }
      }

      return;
    }

    try {
      const payload = parsed.data;
      const created = await createEvent({
        name: payload.name,
        description: payload.description || undefined,
        locationName: payload.locationName,
        latitude: payload.latitude,
        longitude: payload.longitude,
        radiusMeters: payload.radiusMeters,
        startsAt: new Date(payload.startsAt).toISOString(),
        endsAt: new Date(payload.endsAt).toISOString(),
      });

      setToast({
        tone: "success",
        message: "Etkinlik basariyla olusturuldu.",
      });

      router.replace(`/events/${created.data.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setToast({ tone: "error", message: error.message });
        return;
      }

      setToast({
        tone: "error",
        message: "Etkinlik olusturulurken beklenmeyen bir hata olustu.",
      });
    }
  }

  const radiusMeters = useWatch({
    control: form.control,
    name: "radiusMeters",
  });

  return (
    <AppShell>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Yeni Etkinlik</h2>
            <p className="mt-1 text-sm text-zinc-600">Etkinlik bilgilerini girerek kaydi tamamla.</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Dashboarda Don
          </Link>
        </div>

        {toast ? <InlineToast tone={toast.tone} message={toast.message} /> : null}

        <form
          onSubmit={form.handleSubmit((values) => {
            void onSubmit(values);
          })}
          className="rounded-2xl bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="name">
                Etkinlik Adi
              </label>
              <input
                id="name"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                {...form.register("name")}
              />
              {form.formState.errors.name ? (
                <p className="text-xs text-rose-600">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="description">
                Aciklama
              </label>
              <textarea
                id="description"
                rows={4}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                {...form.register("description")}
              />
              {form.formState.errors.description ? (
                <p className="text-xs text-rose-600">{form.formState.errors.description.message}</p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="locationName">
                Konum Adi
              </label>
              <input
                id="locationName"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                {...form.register("locationName")}
              />
              {form.formState.errors.locationName ? (
                <p className="text-xs text-rose-600">{form.formState.errors.locationName.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="latitude">
                Enlem
              </label>
              <input
                id="latitude"
                type="number"
                step="0.000001"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                {...form.register("latitude")}
              />
              {form.formState.errors.latitude ? (
                <p className="text-xs text-rose-600">{form.formState.errors.latitude.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="longitude">
                Boylam
              </label>
              <input
                id="longitude"
                type="number"
                step="0.000001"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                {...form.register("longitude")}
              />
              {form.formState.errors.longitude ? (
                <p className="text-xs text-rose-600">{form.formState.errors.longitude.message}</p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="radiusMeters">
                Yaricap: {radiusMeters ?? 100}m
              </label>
              <input
                id="radiusMeters"
                type="range"
                min={50}
                max={500}
                step={10}
                className="w-full"
                {...form.register("radiusMeters", { valueAsNumber: true })}
              />
              {form.formState.errors.radiusMeters ? (
                <p className="text-xs text-rose-600">{form.formState.errors.radiusMeters.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="startsAt">
                Baslangic
              </label>
              <input
                id="startsAt"
                type="datetime-local"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                {...form.register("startsAt")}
              />
              {form.formState.errors.startsAt ? (
                <p className="text-xs text-rose-600">{form.formState.errors.startsAt.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="endsAt">
                Bitis
              </label>
              <input
                id="endsAt"
                type="datetime-local"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                {...form.register("endsAt")}
              />
              {form.formState.errors.endsAt ? (
                <p className="text-xs text-rose-600">{form.formState.errors.endsAt.message}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {form.formState.isSubmitting ? "Kaydediliyor..." : "Etkinligi Kaydet"}
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
