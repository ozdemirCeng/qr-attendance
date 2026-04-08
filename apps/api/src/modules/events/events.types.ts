export const EVENT_STATUSES = [
  'draft',
  'active',
  'completed',
  'archived',
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export type EventEntity = {
  id: string;
  name: string;
  description: string | null;
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  createdAt: string;
  deletedAt: string | null;
};
