import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../useAuth";

function TestConsumer() {
  const { user, token, isDemo, login, logout, updateUser } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.displayName : "null"}</span>
      <span data-testid="token">{token ?? "null"}</span>
      <span data-testid="isDemo">{String(isDemo)}</span>
      <button
        onClick={() =>
          login("jwt-123", {
            id: 1,
            email: "a@b.com",
            displayName: "Alice",
            themePreference: "dark",
          })
        }
      >
        login
      </button>
      <button
        onClick={() =>
          login(
            "demo-jwt",
            {
              id: 2,
              email: "demo@demo.com",
              displayName: "Demo",
              themePreference: "function",
            },
            true,
          )
        }
      >
        loginDemo
      </button>
      <button onClick={logout}>logout</button>
      <button
        onClick={() =>
          updateUser({
            id: 1,
            email: "a@b.com",
            displayName: "Updated",
            themePreference: "light",
          })
        }
      >
        update
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("AuthProvider", () => {
  it("starts with null user and token when nothing stored", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.getByTestId("token").textContent).toBe("null");
    expect(screen.getByTestId("isDemo").textContent).toBe("false");
  });

  it("restores user and token from localStorage on mount", () => {
    localStorage.setItem("token", "stored-jwt");
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: 1,
        email: "a@b.com",
        displayName: "Stored",
        themePreference: "",
      }),
    );
    localStorage.setItem("isDemo", "true");

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("user").textContent).toBe("Stored");
    expect(screen.getByTestId("token").textContent).toBe("stored-jwt");
    expect(screen.getByTestId("isDemo").textContent).toBe("true");
  });

  it("login sets token, user, and isDemo in state and localStorage", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    act(() => screen.getByText("login").click());

    expect(screen.getByTestId("user").textContent).toBe("Alice");
    expect(screen.getByTestId("token").textContent).toBe("jwt-123");
    expect(screen.getByTestId("isDemo").textContent).toBe("false");
    expect(localStorage.getItem("token")).toBe("jwt-123");
    expect(localStorage.getItem("isDemo")).toBeNull();
  });

  it("login with demo=true sets isDemo", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    act(() => screen.getByText("loginDemo").click());

    expect(screen.getByTestId("isDemo").textContent).toBe("true");
    expect(localStorage.getItem("isDemo")).toBe("true");
  });

  it("logout clears everything", () => {
    localStorage.setItem("token", "jwt");
    localStorage.setItem("user", '{"id":1}');
    localStorage.setItem("isDemo", "true");

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    act(() => screen.getByText("logout").click());

    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.getByTestId("token").textContent).toBe("null");
    expect(screen.getByTestId("isDemo").textContent).toBe("false");
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("isDemo")).toBeNull();
  });

  it("updateUser updates user in state and localStorage", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    act(() => screen.getByText("login").click());
    act(() => screen.getByText("update").click());

    expect(screen.getByTestId("user").textContent).toBe("Updated");
    expect(JSON.parse(localStorage.getItem("user")!).displayName).toBe(
      "Updated",
    );
  });
});

describe("useAuth outside provider", () => {
  it("throws when used outside AuthProvider", () => {
    // Suppress React error boundary output
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useAuth must be used within AuthProvider",
    );
    spy.mockRestore();
  });
});
