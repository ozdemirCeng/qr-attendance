import { apiFetch } from "@/lib/api";

export type AdminRole = "admin" | "editor";

export type AdminSession = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthActionResponse = {
  success: true;
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