import { apiFetch } from "@/lib/api";

export type AdminRole = "admin" | "editor";
export type PortalRole = AdminRole | "member";

export type AdminSession = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

export type PortalSessionUser = {
  id: string;
  email: string;
  name: string;
  role?: AdminRole;
  phone?: string | null;
  avatarDataUrl?: string | null;
};

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type AuthActionResponse = {
  success: true;
};

export type ActiveSessionResponse = {
  success: true;
  data: {
    role: PortalRole;
    dashboardPath: string;
    user: PortalSessionUser;
  };
};

export type UpdateAdminProfilePayload = {
  name?: string;
  email?: string;
};

export async function login(payload: LoginPayload) {
  return apiFetch<AuthActionResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logout() {
  return apiFetch<AuthActionResponse>("/auth/logout", {
    method: "POST",
  });
}

export async function getMe() {
  return apiFetch<AdminSession>("/auth/me");
}

export async function getActiveSession() {
  return apiFetch<ActiveSessionResponse>("/auth/active-session");
}

export async function updateAdminProfile(payload: UpdateAdminProfilePayload) {
  return apiFetch<{
    success: true;
    data: {
      id: string;
      name: string;
      email: string;
      role: AdminRole;
    };
  }>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
