import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "../api";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  localStorage.clear();
});

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function noContentResponse() {
  return Promise.resolve({
    ok: true,
    status: 204,
    json: () => Promise.resolve(undefined),
  });
}

describe("request() internals", () => {
  it("attaches Authorization header when token exists", async () => {
    localStorage.setItem("token", "test-jwt");
    fetchMock.mockReturnValueOnce(
      jsonResponse({ items: [], totalCount: 0, page: 1, pageSize: 20 }),
    );

    await api.getTasks();

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers["Authorization"]).toBe("Bearer test-jwt");
  });

  it("omits Authorization header when no token", async () => {
    fetchMock.mockReturnValueOnce(
      jsonResponse({ items: [], totalCount: 0, page: 1, pageSize: 20 }),
    );

    await api.getTasks();

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers["Authorization"]).toBeUndefined();
  });

  it("redirects to /login on 401 when token exists", async () => {
    localStorage.setItem("token", "old-jwt");
    localStorage.setItem("user", '{"id":1}');

    const locationHref = vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      href: "/",
    });
    const locationSet = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue(
      Object.defineProperty({ ...window.location }, "href", {
        set: locationSet,
        get: () => "/",
      }) as Location,
    );

    fetchMock.mockReturnValueOnce(
      jsonResponse({ message: "Unauthorized" }, 401),
    );

    await expect(api.getTasks()).rejects.toThrow("Unauthorized");
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(locationSet).toHaveBeenCalledWith("/login");

    locationHref.mockRestore();
  });

  it("throws error message from response body on non-ok", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ message: "Not Found" }, 404));

    await expect(api.getTask(999)).rejects.toThrow("Not Found");
  });

  it("throws generic error when body cannot be parsed", async () => {
    fetchMock.mockReturnValueOnce(
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("parse error")),
      }),
    );

    await expect(api.getTask(1)).rejects.toThrow("Request failed (500)");
  });

  it("returns undefined for 204 responses", async () => {
    fetchMock.mockReturnValueOnce(noContentResponse());

    const result = await api.deleteTask(1);
    expect(result).toBeUndefined();
  });
});

describe("api methods", () => {
  it("requestCode sends POST to /api/auth/request-code", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ message: "ok" }));

    await api.requestCode("test@example.com");

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/request-code");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ email: "test@example.com" });
  });

  it("verifyCode sends POST with email, code, and rememberMe", async () => {
    fetchMock.mockReturnValueOnce(
      jsonResponse({ token: "jwt", user: { id: 1, email: "a@b.com" } }),
    );

    await api.verifyCode("a@b.com", "123456", true);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/verify-code");
    expect(JSON.parse(opts.body)).toEqual({
      email: "a@b.com",
      code: "123456",
      rememberMe: true,
    });
  });

  it("devLogin sends POST to /api/auth/dev-login", async () => {
    fetchMock.mockReturnValueOnce(
      jsonResponse({ token: "jwt", user: { id: 1, email: "dev@test.com" } }),
    );

    await api.devLogin("dev@test.com");

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/dev-login");
    expect(JSON.parse(opts.body)).toEqual({ email: "dev@test.com" });
  });

  it("getTasks appends query params", async () => {
    fetchMock.mockReturnValueOnce(
      jsonResponse({ items: [], totalCount: 0, page: 1, pageSize: 20 }),
    );

    await api.getTasks({ status: "Todo", search: "hello" });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/tasks?");
    expect(url).toContain("status=Todo");
    expect(url).toContain("search=hello");
  });

  it("getTasks sends no query if no params", async () => {
    fetchMock.mockReturnValueOnce(
      jsonResponse({ items: [], totalCount: 0, page: 1, pageSize: 20 }),
    );

    await api.getTasks();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/tasks");
  });

  it("createTask sends POST to /api/tasks", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ id: 1, title: "New" }));

    await api.createTask({ title: "New" });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/tasks");
    expect(opts.method).toBe("POST");
  });

  it("updateTask sends PUT to /api/tasks/:id", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ id: 5, title: "Updated" }));

    await api.updateTask(5, { title: "Updated" });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/tasks/5");
    expect(opts.method).toBe("PUT");
  });

  it("deleteTask sends DELETE to /api/tasks/:id", async () => {
    fetchMock.mockReturnValueOnce(noContentResponse());

    await api.deleteTask(3);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/tasks/3");
    expect(opts.method).toBe("DELETE");
  });

  it("getLists sends GET to /api/lists", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse([]));

    await api.getLists();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/lists");
  });

  it("createList sends POST to /api/lists", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ id: 1, name: "Work" }));

    await api.createList({ name: "Work", color: "blue" });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/lists");
    expect(opts.method).toBe("POST");
  });

  it("deleteList sends DELETE to /api/lists/:id", async () => {
    fetchMock.mockReturnValueOnce(noContentResponse());

    await api.deleteList(2);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/lists/2");
    expect(opts.method).toBe("DELETE");
  });

  it("getApiKeys sends GET to /api/keys", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse([]));

    await api.getApiKeys();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/keys");
  });

  it("createApiKey sends POST to /api/keys", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ id: 1, key: "abc" }));

    await api.createApiKey("My Script");

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/keys");
    expect(JSON.parse(opts.body)).toEqual({ name: "My Script" });
  });

  it("revokeApiKey sends DELETE to /api/keys/:id", async () => {
    fetchMock.mockReturnValueOnce(noContentResponse());

    await api.revokeApiKey(4);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/keys/4");
    expect(opts.method).toBe("DELETE");
  });

  it("getVersion sends GET to /api/version", async () => {
    fetchMock.mockReturnValueOnce(
      jsonResponse({ status: "healthy", version: "1.0.0" }),
    );

    const result = await api.getVersion();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/version");
    expect(result.status).toBe("healthy");
  });

  it("demoLogout sends POST to /api/auth/demo-logout", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ message: "ok" }));

    await api.demoLogout();

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/demo-logout");
    expect(opts.method).toBe("POST");
  });

  it("convertDemo sends POST to /api/auth/convert-demo", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ message: "ok" }));

    await api.convertDemo("a@b.com", "Test User");

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/convert-demo");
    expect(JSON.parse(opts.body)).toEqual({
      email: "a@b.com",
      displayName: "Test User",
    });
  });

  it("verifyConversion sends POST to /api/auth/verify-conversion", async () => {
    fetchMock.mockReturnValueOnce(
      jsonResponse({ token: "jwt", user: { id: 1 } }),
    );

    await api.verifyConversion("a@b.com", "123456");

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/verify-conversion");
    expect(JSON.parse(opts.body)).toEqual({ email: "a@b.com", code: "123456" });
  });

  it("getProfile sends GET to /api/profile", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ id: 1, email: "a@b.com" }));

    await api.getProfile();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/profile");
  });

  it("updateProfile sends PUT to /api/profile", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ id: 1, displayName: "New" }));

    await api.updateProfile({ displayName: "New" });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/profile");
    expect(opts.method).toBe("PUT");
  });

  it("updateList sends PUT to /api/lists/:id", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ id: 1, name: "Updated" }));

    await api.updateList(1, { name: "Updated" });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/lists/1");
    expect(opts.method).toBe("PUT");
  });

  it("getTask sends GET to /api/tasks/:id", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ id: 7, title: "Test" }));

    const result = await api.getTask(7);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/tasks/7");
    expect(result.title).toBe("Test");
  });
});
