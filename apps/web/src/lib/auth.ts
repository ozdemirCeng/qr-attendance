import { apiFetch } from "@/lib/api";

export type AdminSession = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export async function login(payload: LoginPayload) {
  return apiFetch<{ success: true }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logout() {
  return apiFetch<{ success: true }>("/auth/logout", {
    method: "POST",
  });
}

export async function getMe() {
  return apiFetch<AdminSession>("/auth/me");
}