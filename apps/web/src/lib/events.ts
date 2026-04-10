import { apiFetch } from "@/lib/api";

export type EventStatus = "draft" | "active" | "completed" | "archived";

export type EventItem = {
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

export type EventListResponse = {
  success: true;
  data: EventItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type EventDetailResponse = {
  success: true;
  data: EventItem;
};

export type EventStatsResponse = {
  success: true;
  data: {
    total: number;
    active: number;
    completed: number;
    draft: number;
    archived: number;
  };
};

export type EventActionResponse = {
  success: true;
  data: EventItem;
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
  status?: EventStatus;
};

export type UpdateEventPayload = Partial<CreateEventPayload>;

export async function listEvents(page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return apiFetch<EventListResponse>(`/events?${params.toString()}`);
}

export async function getEvent(eventId: string) {
  return apiFetch<EventDetailResponse>(`/events/${eventId}`);
}

export async function getEventStats() {
  return apiFetch<EventStatsResponse>("/events/stats");
}

export async function createEvent(payload: CreateEventPayload) {
  return apiFetch<EventActionResponse>("/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEvent(
  eventId: string,
  payload: UpdateEventPayload,
) {
  return apiFetch<EventActionResponse>(`/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function removeEvent(eventId: string) {
  return apiFetch<{
    success: true;
    data: { id: string; deletedAt: string | null };
  }>(`/events/${eventId}`, {
    method: "DELETE",
  });
}
