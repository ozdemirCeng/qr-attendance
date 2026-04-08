import { apiFetch } from "@/lib/api";

export type SessionItem = {
  id: string;
  eventId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

export type SessionListResponse = {
  success: true;
  data: SessionItem[];
};

export type SessionActionResponse = {
  success: true;
  data: SessionItem;
};

export type CreateSessionPayload = {
  name: string;
  startsAt: string;
  endsAt: string;
};

export type UpdateSessionPayload = Partial<CreateSessionPayload>;

export async function listSessions(eventId: string) {
  return apiFetch<SessionListResponse>(`/events/${eventId}/sessions`);
}

export async function createSession(eventId: string, payload: CreateSessionPayload) {
  return apiFetch<SessionActionResponse>(`/events/${eventId}/sessions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSession(
  eventId: string,
  sessionId: string,
  payload: UpdateSessionPayload,
) {
  return apiFetch<SessionActionResponse>(`/events/${eventId}/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function removeSession(eventId: string, sessionId: string) {
  return apiFetch<{ success: true; data: { id: string } }>(
    `/events/${eventId}/sessions/${sessionId}`,
    {
      method: "DELETE",
    },
  );
}
