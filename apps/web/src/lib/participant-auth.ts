import { apiFetch, type ApiError } from "@/lib/api";

export type ParticipantUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarDataUrl: string | null;
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

export type UpdateProfilePayload = {
  name?: string;
  email?: string;
  phone?: string;
  avatarDataUrl?: string | null;
};

export async function participantUpdateProfile(payload: UpdateProfilePayload) {
  return apiFetch<ParticipantAuthResponse>("/participant-auth/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export async function participantChangePassword(payload: ChangePasswordPayload) {
  return apiFetch<{ success: true }>("/participant-auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type ParticipantDashboardEvent = {
  id: string;
  name: string;
  locationName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  registeredAt: string | null;
  attendedAt: string | null;
  isRegistered: boolean;
  isAttended: boolean;
};

export type ParticipantDashboardResponse = {
  success: true;
  data: {
    profile: ParticipantUser;
    summary: {
      registeredEvents: number;
      attendedEvents: number;
      upcomingEvents: number;
      completedEvents: number;
    };
    events: ParticipantDashboardEvent[];
  };
};

export async function participantGetDashboard() {
  return apiFetch<ParticipantDashboardResponse>("/participant-auth/dashboard");
}

export { type ApiError };
