const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Unauthorized");
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

  verifyCode: (email: string, code: string) =>
    request<{ token: string; user: import("../types").User }>(
      "/auth/verify-code",
      {
        method: "POST",
        body: JSON.stringify({ email, code }),
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
};
