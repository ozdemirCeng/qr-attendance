export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type ValidateLocationParams = {
  venue: GeoPoint;
  location?: GeoPoint | null;
  radiusMeters: number;
  accuracyMeters?: number | null;
};

export type LocationResult = {
  valid: boolean;
  distance: number;
  flags: string[];
  reason?: 'NO_LOCATION_DATA' | 'LOCATION_OUT_OF_RANGE';
};

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversine(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);

  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);

  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfLon * sinHalfLon;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function validateLocation(params: ValidateLocationParams): LocationResult {
  const { venue, location, radiusMeters, accuracyMeters } = params;

  if (!location) {
    return {
      valid: false,
      distance: Number.POSITIVE_INFINITY,
      flags: [],
      reason: 'NO_LOCATION_DATA',
    };
  }

  const distance = haversine(venue, location);
  const accuracy = accuracyMeters ?? 0;
  const flags: string[] = [];

  if (accuracy > 200) {
    flags.push('LOW_ACCURACY');
  }

  const isInsideRadius = distance <= radiusMeters;
  const isWithinAccuracyTolerance = distance - Math.max(0, accuracy) <= radiusMeters;

  if (isInsideRadius || isWithinAccuracyTolerance) {
    return {
      valid: true,
      distance,
      flags,
    };
  }

  return {
    valid: false,
    distance,
    flags,
    reason: 'LOCATION_OUT_OF_RANGE',
  };
}
