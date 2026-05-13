import { detectApiBaseFromLocation } from "@/lib/connection";
import { getToken } from "@/modules/user/user-api";
import type { ChartDataResponse, PublicLogsResponse } from "@/modules/apikey-lookup/types";

const USER_API_PREFIX = "/user/api";

function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const base = detectApiBaseFromLocation();
  const url = `${base}${USER_API_PREFIX}${path}`;
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers || {}),
    },
  }).then(async (res) => {
    const data = await res.json().catch(() => ({ error: "Network error" }));
    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data as T;
  });
}

export async function fetchUserUsageLogs(params: {
  apiKey?: string;
  page?: number;
  size?: number;
  days?: number;
  model?: string;
  status?: string;
  signal?: AbortSignal;
}): Promise<PublicLogsResponse> {
  return fetchJSON<PublicLogsResponse>("/usage/logs", {
    method: "POST",
    signal: params.signal,
    body: JSON.stringify({
      api_key: params.apiKey,
      page: params.page,
      size: params.size,
      days: params.days,
      model: params.model,
      status: params.status,
    }),
  });
}

export async function fetchUserUsageChartData(params: {
  apiKey?: string;
  days?: number;
}): Promise<ChartDataResponse> {
  return fetchJSON<ChartDataResponse>("/usage/chart-data", {
    method: "POST",
    body: JSON.stringify({
      api_key: params.apiKey,
      days: params.days,
    }),
  });
}

export async function fetchUserLogContent(params: {
  id: number;
  apiKey?: string;
  part?: "input" | "output" | "both";
  format?: "json" | "text";
  signal?: AbortSignal;
}): Promise<unknown> {
  return fetchJSON<unknown>(`/usage/logs/${params.id}/content`, {
    method: "POST",
    signal: params.signal,
    body: JSON.stringify({
      api_key: params.apiKey,
      part: params.part ?? "both",
      format: params.format ?? "json",
    }),
  });
}

export interface UserAPIKeyGroupItem {
  name: string;
  paths: string[];
  models: string[];
}

export interface UserAPIKeyItem {
  id: number;
  name: string;
  key: string;
  disabled: boolean;
  daily_limit: number;
  total_quota: number;
  spending_limit: number;
  concurrency_limit: number;
  rpm_limit: number;
  tpm_limit: number;
  channel_groups: UserAPIKeyGroupItem[];
}

export async function fetchUserAPIKeys(): Promise<{ items: UserAPIKeyItem[] }> {
  return fetchJSON<{ items: UserAPIKeyItem[] }>("/keys", {
    method: "GET",
  });
}
