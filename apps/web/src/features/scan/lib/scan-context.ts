export type StoredScanContext = {
  eventId: string;
  token: string;
  lat?: number;
  lng?: number;
  locationAccuracy?: number;
  savedAt: string;
};

const STORAGE_KEY = "scan-context";

export function saveScanContext(context: StoredScanContext) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
}

export function loadScanContext(): StoredScanContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredScanContext>;
    if (typeof parsed.eventId !== "string" || typeof parsed.token !== "string") {
      return null;
    }

    return {
      eventId: parsed.eventId,
      token: parsed.token,
      lat: typeof parsed.lat === "number" ? parsed.lat : undefined,
      lng: typeof parsed.lng === "number" ? parsed.lng : undefined,
      locationAccuracy:
        typeof parsed.locationAccuracy === "number" ? parsed.locationAccuracy : undefined,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearScanContext() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
}
