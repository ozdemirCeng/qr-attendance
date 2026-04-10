import { apiFetch, type ApiError } from "@/lib/api";

export type ParticipantUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

export type ParticipantAuthResponse = {
  success: true;
  data: ParticipantUser;
};

export type SignupPayload = {
  name: string;
  email: string;
  phone?: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export async function participantSignup(payload: SignupPayload) {
  return apiFetch<ParticipantAuthResponse>("/participant-auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function participantLogin(payload: LoginPayload) {
  return apiFetch<ParticipantAuthResponse>("/participant-auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function participantGetMe() {
  return apiFetch<ParticipantUser>("/participant-auth/me");
}

export async function participantLogout() {
  return apiFetch<{ success: true }>("/participant-auth/logout", {
    method: "POST",
  });
}

export { type ApiError };
