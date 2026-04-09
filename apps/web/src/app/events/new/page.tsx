"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

type GeocodeSuggestion = {
  label: string;
  locationName: string;
  latitude: number;
  longitude: number;
};

type GeocodeResponse = {
  success: boolean;
  data: GeocodeSuggestion[];
  message?: string;
};

export default function NewEventPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(null);

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

  useEffect(() => {
    const query = locationQuery.trim();

    if (query.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setIsSearchingLocation(true);
      setLocationSearchError(null);

      void fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => null)) as GeocodeResponse | null;

          if (!response.ok || !payload || !payload.success) {
            throw new Error(payload?.message ?? "Konum servisi hatasi");
          }

          setLocationSuggestions(payload.data);
        })
        .catch(() => {
          if (controller.signal.aborted) {
            return;
          }

          setLocationSuggestions([]);
          setLocationSearchError("Konum aramasi su an kullanilamiyor.");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearchingLocation(false);
          }
        });
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [locationQuery]);

  function applyLocationSuggestion(suggestion: GeocodeSuggestion) {
    form.setValue("locationName", suggestion.locationName, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("latitude", suggestion.latitude.toFixed(6), {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("longitude", suggestion.longitude.toFixed(6), {
      shouldDirty: true,
      shouldValidate: true,
    });

    form.clearErrors(["locationName", "latitude", "longitude"]);
    setLocationQuery(suggestion.label);
    setLocationSuggestions([]);
    setLocationSearchError(null);
  }

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
              <label className="text-sm font-medium text-zinc-700" htmlFor="locationSearch">
                Yer Ismiyle Konum Ara
              </label>
              <input
                id="locationSearch"
                autoComplete="off"
                value={locationQuery}
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  setLocationQuery(nextQuery);

                  if (nextQuery.trim().length < 3) {
                    setIsSearchingLocation(false);
                    setLocationSearchError(null);
                    setLocationSuggestions([]);
                  }
                }}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Orn: Kocaeli Universitesi"
              />
              <p className="text-xs text-zinc-500">
                En az 3 karakter yazin. Oneriden secince konum adi ve koordinatlar otomatik dolar.
              </p>

              {isSearchingLocation ? (
                <p className="text-xs text-zinc-500">Konum araniyor...</p>
              ) : null}

              {locationSearchError ? (
                <p className="text-xs text-rose-600">{locationSearchError}</p>
              ) : null}

              {locationSuggestions.length > 0 ? (
                <div className="max-h-56 overflow-auto rounded-xl border border-zinc-200">
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.label}-${index}`}
                      type="button"
                      onClick={() => {
                        applyLocationSuggestion(suggestion);
                      }}
                      className="w-full border-b border-zinc-100 px-3 py-2 text-left last:border-b-0 hover:bg-zinc-50"
                    >
                      <span className="block text-sm text-zinc-900">{suggestion.label}</span>
                      <span className="block text-xs text-zinc-500">
                        {suggestion.latitude.toFixed(5)}, {suggestion.longitude.toFixed(5)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {locationQuery.trim().length >= 3 &&
              !isSearchingLocation &&
              !locationSearchError &&
              locationSuggestions.length === 0 ? (
                <p className="text-xs text-zinc-500">Bu arama icin sonuc bulunamadi.</p>
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
