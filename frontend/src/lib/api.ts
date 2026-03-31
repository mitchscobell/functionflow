/** Base URL prefix for all API requests. */
const API_BASE = "/api";

/**
 * Internal fetch wrapper that handles authentication headers,
 * token refresh on 401, and JSON parsing.
 *
 * @template T - Expected response body type.
 * @param path - API path appended to {@link API_BASE} (e.g. "/tasks").
 * @param options - Standard `RequestInit` overrides (method, body, etc.).
 * @returns Parsed JSON response cast to `T`.
 * @throws Error with the server message on non-OK responses.
 */
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
    throw new Error(body.message || body.errors?.[0] || `Request failed (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/**
 * Centralized API client exposing typed methods for every backend endpoint.
 * All methods return promises that resolve to typed response bodies.
 */
export const api = {
  /**
   * Sends a one-time authentication code to the given email address.
   * @param email - Recipient email address.
   */
  requestCode: (email: string) =>
    request<{ message: string }>("/auth/request-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  /**
   * Verifies the one-time code and returns a JWT + user profile on success.
   * @param email - The email address the code was sent to.
   * @param code - Six-digit verification code.
   * @param rememberMe - If true, the token lasts 30 days; otherwise 7 days.
   */
  verifyCode: (email: string, code: string, rememberMe: boolean = false) =>
    request<{ token: string; user: import("../types").User }>("/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ email, code, rememberMe }),
    }),

  /**
   * Development-only login that bypasses email verification.
   * @param email - Email address to log in as.
   */
  devLogin: (email: string) =>
    request<{ token: string; user: import("../types").User }>("/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  /** Logs out a demo account and clears server-side session data. */
  demoLogout: () => request<{ message: string }>("/auth/demo-logout", { method: "POST" }),

  /**
   * Initiates conversion of a demo account to a permanent account by sending a verification code.
   * @param email - Email address to associate with the permanent account.
   * @param displayName - Optional display name for the new account.
   */
  convertDemo: (email: string, displayName?: string) =>
    request<{ message: string }>("/auth/convert-demo", {
      method: "POST",
      body: JSON.stringify({ email, displayName }),
    }),

  /**
   * Completes demo-to-permanent conversion after verifying the email code.
   * @param email - The email address the code was sent to.
   * @param code - Six-digit verification code.
   */
  verifyConversion: (email: string, code: string) =>
    request<{ token: string; user: import("../types").User }>("/auth/verify-conversion", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  /**
   * Fetches the authenticated user's profile.
   * @returns The current user's profile data.
   */
  getProfile: () => request<import("../types").User>("/profile"),

  /**
   * Updates the authenticated user's profile fields.
   * @param data - Fields to update (displayName and/or themePreference).
   */
  updateProfile: (data: { displayName?: string; themePreference?: string }) =>
    request<import("../types").User>("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Fetches a paginated list of the user's tasks with optional query filters.
   * @param params - Query string parameters (page, pageSize, status, priority, search, listId, etc.).
   */
  getTasks: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<import("../types").TaskListResponse>(`/tasks${query}`);
  },

  /**
   * Fetches a single task by its ID.
   * @param id - The task's database ID.
   */
  getTask: (id: number) => request<import("../types").Task>(`/tasks/${id}`),

  /**
   * Creates a new task with the given data.
   * @param data - Partial task fields (title is required by the server).
   */
  createTask: (data: Partial<import("../types").Task>) =>
    request<import("../types").Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Updates an existing task.
   * @param id - The task's database ID.
   * @param data - Fields to update.
   */
  updateTask: (id: number, data: Partial<import("../types").Task>) =>
    request<import("../types").Task>(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Soft-deletes a task.
   * @param id - The task's database ID.
   */
  deleteTask: (id: number) => request<void>(`/tasks/${id}`, { method: "DELETE" }),

  /**
   * Fetches all task lists for the authenticated user.
   * @returns Array of task lists ordered by sortOrder.
   */
  getLists: () => request<import("../types").TaskList[]>("/lists"),

  /**
   * Creates a new task list.
   * @param data - List name and optional emoji/color.
   */
  createList: (data: { name: string; emoji?: string; color?: string }) =>
    request<import("../types").TaskList>("/lists", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Updates an existing task list.
   * @param id - The list's database ID.
   * @param data - Fields to update.
   */
  updateList: (
    id: number,
    data: { name?: string; emoji?: string; color?: string; sortOrder?: number },
  ) =>
    request<import("../types").TaskList>(`/lists/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Deletes a task list. Tasks in the list are moved to the inbox.
   * @param id - The list's database ID.
   */
  deleteList: (id: number) => request<void>(`/lists/${id}`, { method: "DELETE" }),

  /**
   * Fetches all API keys for the authenticated user.
   * @returns Array of API key metadata (keys are not returned, only prefixes).
   */
  getApiKeys: () => request<import("../types").ApiKey[]>("/keys"),

  /**
   * Creates a new API key. The full key is returned only in this response.
   * @param name - Friendly label for the key.
   */
  createApiKey: (name: string) =>
    request<import("../types").ApiKeyCreated>("/keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  /**
   * Revokes an API key so it can no longer be used for authentication.
   * @param id - The API key's database ID.
   */
  revokeApiKey: (id: number) => request<void>(`/keys/${id}`, { method: "DELETE" }),

  /**
   * Fetches the server health/version information.
   * @returns Server name, version, status, database health, and timestamp.
   */
  getVersion: () =>
    request<{
      name: string;
      version: string;
      status: string;
      database: string;
      timestamp: string;
    }>("/version"),
};
