export type EventStatus = "draft" | "active" | "completed" | "archived";

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
  createdBy: string;
  status: EventStatus;
  createdAt: string;
};

export type SessionEntity = {
  id: string;
  eventId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

export type CreateEventPayload = {
  name: string;
  description?: string;
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  startsAt: string;
  endsAt: string;
};

export type CreateSessionPayload = {
  name: string;
  startsAt: string;
  endsAt: string;
};