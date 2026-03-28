const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (token) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.message || body.errors?.[0] || `Request failed (${res.status})`,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const api = {
  requestCode: (email: string) =>
    request<{ message: string }>("/auth/request-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifyCode: (email: string, code: string, rememberMe: boolean = false) =>
    request<{ token: string; user: import("../types").User }>(
      "/auth/verify-code",
      {
        method: "POST",
        body: JSON.stringify({ email, code, rememberMe }),
      },
    ),

  devLogin: (email: string) =>
    request<{ token: string; user: import("../types").User }>(
      "/auth/dev-login",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    ),

  demoLogout: () =>
    request<{ message: string }>("/auth/demo-logout", { method: "POST" }),

  // Profile
  getProfile: () => request<import("../types").User>("/profile"),

  updateProfile: (data: { displayName?: string; themePreference?: string }) =>
    request<import("../types").User>("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Tasks
  getTasks: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<import("../types").TaskListResponse>(`/tasks${query}`);
  },

  getTask: (id: number) => request<import("../types").Task>(`/tasks/${id}`),

  createTask: (data: Partial<import("../types").Task>) =>
    request<import("../types").Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTask: (id: number, data: Partial<import("../types").Task>) =>
    request<import("../types").Task>(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTask: (id: number) =>
    request<void>(`/tasks/${id}`, { method: "DELETE" }),

  // Lists
  getLists: () => request<import("../types").TaskList[]>("/lists"),

  createList: (data: { name: string; emoji?: string; color?: string }) =>
    request<import("../types").TaskList>("/lists", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateList: (
    id: number,
    data: { name?: string; emoji?: string; color?: string; sortOrder?: number },
  ) =>
    request<import("../types").TaskList>(`/lists/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteList: (id: number) =>
    request<void>(`/lists/${id}`, { method: "DELETE" }),

  // API Keys
  getApiKeys: () => request<import("../types").ApiKey[]>("/keys"),

  createApiKey: (name: string) =>
    request<import("../types").ApiKeyCreated>("/keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  revokeApiKey: (id: number) =>
    request<void>(`/keys/${id}`, { method: "DELETE" }),

  // Health
  getVersion: () =>
    request<{ name: string; version: string; status: string; database: string; timestamp: string }>("/version"),
};
