import { apiClient } from "@/lib/http/client";

export interface ApiKeyEntry {
  id?: number;
  key: string;
  name?: string;
  "user-id"?: number;
  disabled?: boolean;
  "daily-limit"?: number;
  "total-quota"?: number;
  "spending-limit"?: number;
  "concurrency-limit"?: number;
  "rpm-limit"?: number;
  "tpm-limit"?: number;
  "allowed-models"?: string[];
  "allowed-channels"?: string[];
  "allowed-channel-groups"?: string[];
  "permission-profile-id"?: string;
  "system-prompt"?: string;
  "created-at"?: string;
}

export const apiKeysApi = {
  async list(): Promise<string[]> {
    const data = await apiClient.get<Record<string, unknown>>("/api-keys");
    const keys = (data?.["api-keys"] ?? data?.apiKeys) as unknown;
    return Array.isArray(keys) ? keys.map((key) => String(key)) : [];
  },

  replace: (keys: string[]) => apiClient.put("/api-keys", keys),

  update: (index: number, value: string) => apiClient.patch("/api-keys", { index, value }),

  delete: (index: number) => apiClient.delete(`/api-keys?index=${index}`),
};

export interface ApiKeyEntryPageParams {
  page: number;
  page_size: number;
  search?: string;
  status?: string;
  user_id?: number;
  channel_group?: string;
}

export const apiKeyEntriesApi = {
  async list(): Promise<ApiKeyEntry[]> {
    const data = await apiClient.get<Record<string, unknown>>("/api-key-entries");
    const entries = data?.["api-key-entries"] as unknown;
    return Array.isArray(entries) ? entries : [];
  },

  async listPage(params: ApiKeyEntryPageParams): Promise<{ entries: ApiKeyEntry[]; total: number }> {
    const query = new URLSearchParams();
    query.set("page", String(params.page));
    query.set("page_size", String(params.page_size));
    if (params.search) query.set("search", params.search);
    if (params.status) query.set("status", params.status);
    if (params.user_id !== undefined) query.set("user_id", String(params.user_id));
    if (params.channel_group) query.set("channel_group", params.channel_group);
    const data = await apiClient.get<Record<string, unknown>>(`/api-key-entries?${query.toString()}`);
    const entries = data?.["api-key-entries"] as unknown;
    const total = data?.total as unknown;
    return {
      entries: Array.isArray(entries) ? (entries as ApiKeyEntry[]) : [],
      total: typeof total === "number" ? total : 0,
    };
  },

  create: (entry: ApiKeyEntry) => apiClient.post("/api-key-entries", entry),

  replace: (entries: ApiKeyEntry[]) => apiClient.put("/api-key-entries", entries),

  update: (payload: { index?: number; match?: string; value: Partial<ApiKeyEntry> }) =>
    apiClient.patch("/api-key-entries", payload),

  delete: (params: { id?: number; index?: number; key?: string; deleteLogs?: boolean }) => {
    const query = new URLSearchParams();
    if (params.id !== undefined && params.id > 0) {
      query.set("id", String(params.id));
    } else if (params.key) {
      query.set("key", params.key);
    } else if (params.index !== undefined) {
      query.set("index", String(params.index));
    }
    if (params.deleteLogs !== undefined) {
      query.set("delete_logs", String(params.deleteLogs));
    }
    return apiClient.delete(`/api-key-entries?${query.toString()}`);
  },
};
