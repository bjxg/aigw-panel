import { apiClient } from "@/lib/http/client";

export interface User {
  id: number;
  name: string;
  username?: string | null;
  email?: string | null;
  role: string;
  last_seen_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
}

export const usersApi = {
  async list(params: {
    page?: number;
    page_size?: number;
    search?: string;
    role?: string;
  }): Promise<UserListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    if (params.search) query.set("search", params.search);
    if (params.role) query.set("role", params.role);
    const data = await apiClient.get<Record<string, unknown>>(
      `/users?${query.toString()}`,
    );
    const users = (data?.users ?? []) as unknown;
    const total = (data?.total ?? 0) as unknown;
    return {
      users: Array.isArray(users) ? users : [],
      total: typeof total === "number" ? total : 0,
    };
  },

  create: (user: {
    name: string;
    username?: string | null;
    email?: string | null;
    role?: string;
  }) => apiClient.post("/users", user),

  update: (id: number, updates: Partial<User>) =>
    apiClient.put(`/users/${id}`, updates),

  delete: (id: number) => apiClient.delete(`/users/${id}`),
};
