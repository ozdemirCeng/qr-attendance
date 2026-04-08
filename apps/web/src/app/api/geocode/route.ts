import { NextRequest, NextResponse } from "next/server";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
};

type GeocodeSuggestion = {
  label: string;
  locationName: string;
  latitude: number;
  longitude: number;
};

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

function buildLocationName(result: NominatimResult) {
  if (typeof result.name === "string" && result.name.trim()) {
    return result.name.trim();
  }

  const firstSegment = result.display_name.split(",")[0]?.trim();
  if (firstSegment) {
    return firstSegment;
  }

  return result.display_name;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json({ success: true, data: [] as GeocodeSuggestion[] });
  }

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "5",
  });

  try {
    const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": request.headers.get("accept-language") ?? "tr,en;q=0.8",
        "User-Agent": "qr-attendance-app/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Konum servisine ulasilamadi.",
          data: [] as GeocodeSuggestion[],
        },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as NominatimResult[];

    const data = payload
      .map((result) => {
        const latitude = Number(result.lat);
        const longitude = Number(result.lon);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        return {
          label: result.display_name,
          locationName: buildLocationName(result),
          latitude,
          longitude,
        } satisfies GeocodeSuggestion;
      })
      .filter((value): value is GeocodeSuggestion => value !== null);

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Konum aramasi gecici olarak kullanilamiyor.",
        data: [] as GeocodeSuggestion[],
      },
      { status: 502 },
    );
  }
}