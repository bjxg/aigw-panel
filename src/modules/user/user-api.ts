import { useCallback } from "react";

const API_BASE = "/oidc";

export interface User {
  id: number;
  name: string;
  username?: string;
  email?: string;
  role: string;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthorizeResponse {
  authorize_url: string;
  state: string;
}

export function getToken(): string | null {
  return localStorage.getItem("user_token");
}

function setToken(token: string): void {
  localStorage.setItem("user_token", token);
}

function clearToken(): void {
  localStorage.removeItem("user_token");
}

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({ error: "Network error" }));
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export async function authorize(): Promise<AuthorizeResponse> {
  return fetchJSON<AuthorizeResponse>("/authorize");
}

export async function callback(code: string, state: string): Promise<LoginResponse> {
  const res = await fetchJSON<LoginResponse>("/callback", {
    method: "POST",
    body: JSON.stringify({ code, state }),
  });
  setToken(res.token);
  return res;
}

export async function getUserInfo(): Promise<{ user: User }> {
  return fetchJSON<{ user: User }>("/info");
}

export async function logout(): Promise<void> {
  await fetchJSON("/logout", { method: "POST" });
  clearToken();
}

export function useUserAPI() {
  return {
    authorize: useCallback(authorize, []),
    callback: useCallback(callback, []),
    getUserInfo: useCallback(getUserInfo, []),
    logout: useCallback(logout, []),
    getToken: useCallback(getToken, []),
  };
}
