import { apiFetch } from "@/lib/api";

export type CurrentQrTokenResponse = {
  success: true;
  data: {
    token: string;
    verificationCode: string;
    expiresIn: number;
    sessionId: string;
  };
};

export async function getCurrentQrToken(eventId: string) {
  return apiFetch<CurrentQrTokenResponse>(`/events/${eventId}/qr/current`);
}
