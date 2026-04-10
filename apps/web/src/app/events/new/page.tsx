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
    name: z.string().trim().min(3, "Etkinlik adı en az 3 karakter olmalı"),
    description: z.string().trim().max(2000, "Açıklama en fazla 2000 karakter olabilir"),
    locationName: z.string().trim().min(2, "Konum adı en az 2 karakter olmalı"),
    latitude: z.coerce.number().min(-90, "Enlem -90 ile 90 arasında olmalı").max(90),
    longitude: z.coerce.number().min(-180, "Boylam -180 ile 180 arasında olmalı").max(180),
    radiusMeters: z.coerce.number().min(50, "Yarıçap en az 50m olmalı").max(500),
    startsAt: z.string().min(1, "Başlangıç tarihi zorunlu"),
    endsAt: z.string().min(1, "Bitiş tarihi zorunlu"),
  })
  .refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
    message: "Bitiş zamanı başlangıç zamanından sonra olmalı",
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

function getCurrentDateTimeLocal() {
  const now = new Date();
  now.setSeconds(0, 0);
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export default function NewEventPage() {
  const router = useRouter();
  const initialDateTime = getCurrentDateTimeLocal();
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
      startsAt: initialDateTime,
      endsAt: initialDateTime,
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
        message: "Etkinlik başarıyla oluşturuldu.",
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
        message: "Etkinlik oluşturulurken beklenmeyen bir hata oluştu.",
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
            throw new Error(payload?.message ?? "Konum servisi hatası");
          }

          setLocationSuggestions(payload.data);
        })
        .catch(() => {
          if (controller.signal.aborted) {
            return;
          }

          setLocationSuggestions([]);
          setLocationSearchError("Konum araması şu an kullanılamıyor.");
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
      <section className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }} data-display="true">
              Yeni Etkinlik
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Etkinlik bilgilerini girerek kaydı tamamla.</p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">
            ← Panele Dön
          </Link>
        </div>

        {toast ? <InlineToast tone={toast.tone} message={toast.message} /> : null}

        <form
          onSubmit={form.handleSubmit((values) => { void onSubmit(values); })}
          className="space-y-6"
        >
          {/* Section: Temel Bilgiler */}
          <div className="glass rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--surface-soft)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </div>
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }} data-display="true">Temel Bilgiler</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="name">
                Etkinlik Adı
              </label>
              <input id="name" className="glass-input w-full" placeholder="Örn: 2024 Güz Dönem Toplantısı" {...form.register("name")} />
              {form.formState.errors.name ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.name.message}</p> : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="description">
                Açıklama
              </label>
              <textarea id="description" rows={3} className="glass-input w-full resize-none" placeholder="Etkinlik hakkında kısa bir açıklama..." {...form.register("description")} />
              {form.formState.errors.description ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.description.message}</p> : null}
            </div>
          </div>

          {/* Section: Konum */}
          <div className="glass rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--surface-soft)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }} data-display="true">Konum Bilgileri</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="locationSearch">
                Yer İsmiyle Konum Ara
              </label>
              <input
                id="locationSearch"
                autoComplete="off"
                value={locationQuery}
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  setLocationQuery(nextQuery);
                  if (nextQuery.trim().length < 3) { setIsSearchingLocation(false); setLocationSearchError(null); setLocationSuggestions([]); }
                }}
                className="glass-input w-full"
                placeholder="Örn: Kocaeli Üniversitesi"
              />
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                En az 3 karakter yazın. Öneriden seçince konum ve koordinatlar otomatik dolar.
              </p>

              {isSearchingLocation ? <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Konum aranıyor...</p> : null}
              {locationSearchError ? <p className="text-xs" style={{ color: "var(--error)" }}>{locationSearchError}</p> : null}

              {locationSuggestions.length > 0 ? (
                <div className="glass-elevated max-h-56 overflow-auto rounded-xl">
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.label}-${index}`}
                      type="button"
                      onClick={() => { applyLocationSuggestion(suggestion); }}
                      className="w-full px-4 py-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <span className="block text-sm font-medium" style={{ color: "var(--text-primary)" }}>{suggestion.label}</span>
                      <span className="block text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {suggestion.latitude.toFixed(5)}, {suggestion.longitude.toFixed(5)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {locationQuery.trim().length >= 3 && !isSearchingLocation && !locationSearchError && locationSuggestions.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Bu arama için sonuç bulunamadı.</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="locationName">Konum Adı</label>
              <input id="locationName" className="glass-input w-full" {...form.register("locationName")} />
              {form.formState.errors.locationName ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.locationName.message}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="latitude">Enlem</label>
                <input id="latitude" type="number" step="0.000001" className="glass-input w-full" {...form.register("latitude")} />
                {form.formState.errors.latitude ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.latitude.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="longitude">Boylam</label>
                <input id="longitude" type="number" step="0.000001" className="glass-input w-full" {...form.register("longitude")} />
                {form.formState.errors.longitude ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.longitude.message}</p> : null}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="radiusMeters">
                Yarıçap
              </label>
              <div className="flex items-center gap-4">
                <input id="radiusMeters" type="range" min={50} max={500} step={10} className="flex-1" {...form.register("radiusMeters", { valueAsNumber: true })} />
                <span className="inline-flex min-w-[4rem] items-center justify-center rounded-lg px-3 py-1.5 text-sm font-bold" style={{ background: "var(--surface-soft)", color: "var(--primary)", fontFamily: "var(--font-display)" }} data-display="true">
                  {radiusMeters ?? 100}m
                </span>
              </div>
              {form.formState.errors.radiusMeters ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.radiusMeters.message}</p> : null}
            </div>
          </div>

          {/* Section: Zamanlama */}
          <div className="glass rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--surface-soft)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }} data-display="true">Zamanlama</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="startsAt">Başlangıç</label>
                <input id="startsAt" type="datetime-local" className="glass-input w-full" {...form.register("startsAt")} />
                {form.formState.errors.startsAt ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.startsAt.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }} htmlFor="endsAt">Bitiş</label>
                <input id="endsAt" type="datetime-local" className="glass-input w-full" {...form.register("endsAt")} />
                {form.formState.errors.endsAt ? <p className="text-xs" style={{ color: "var(--error)" }}>{form.formState.errors.endsAt.message}</p> : null}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={form.formState.isSubmitting} className="btn-primary px-8 py-3 text-sm">
              {form.formState.isSubmitting ? "Kaydediliyor..." : "Etkinliği Kaydet"}
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
