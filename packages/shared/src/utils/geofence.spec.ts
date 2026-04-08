import assert from 'node:assert/strict';
import test from 'node:test';

import { validateLocation } from './geofence.js';

const venue = {
  latitude: 40.765,
  longitude: 29.94,
};

test('returns valid when location is within radius', () => {
  const result = validateLocation({
    venue,
    location: {
      latitude: 40.7653,
      longitude: 29.9402,
    },
    radiusMeters: 100,
    accuracyMeters: 15,
  });

  assert.equal(result.valid, true);
  assert.equal(result.reason, undefined);
});

test('returns out of range when location is outside radius', () => {
  const result = validateLocation({
    venue,
    location: {
      latitude: 40.772,
      longitude: 29.94,
    },
    radiusMeters: 100,
    accuracyMeters: 20,
  });

  assert.equal(result.valid, false);
  assert.equal(result.reason, 'LOCATION_OUT_OF_RANGE');
});

test('returns valid with LOW_ACCURACY flag when tolerance allows entry', () => {
  const result = validateLocation({
    venue,
    location: {
      latitude: 40.7676,
      longitude: 29.94,
    },
    radiusMeters: 100,
    accuracyMeters: 220,
  });

  assert.equal(result.valid, true);
  assert.equal(result.flags.includes('LOW_ACCURACY'), true);
});

test('returns invalid when location data is missing', () => {
  const result = validateLocation({
    venue,
    location: undefined,
    radiusMeters: 100,
    accuracyMeters: 30,
  });

  assert.equal(result.valid, false);
  assert.equal(result.reason, 'NO_LOCATION_DATA');
});
