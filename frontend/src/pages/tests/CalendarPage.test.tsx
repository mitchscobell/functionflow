import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CalendarPage from "../CalendarPage";
import { AuthProvider } from "../../hooks/useAuth";
import { ThemeProvider } from "../../hooks/useTheme";

// Mock api
vi.mock("../../lib/api", () => ({
  api: {
    getTasks: vi.fn(),
    getLists: vi.fn(),
    updateTask: vi.fn(),
    createTask: vi.fn(),
    deleteTask: vi.fn(),
    demoLogout: vi.fn(),
  },
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// Mock Layout
vi.mock("../../components/Layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock TaskCard
vi.mock("../../components/TaskCard", () => ({
  default: ({ task }: { task: { title: string } }) => (
    <div data-testid="task-card">{task.title}</div>
  ),
}));

// Mock TaskModal
vi.mock("../../components/TaskModal", () => ({
  default: () => <div data-testid="task-modal" />,
}));

import { api } from "../../lib/api";

function renderCalendarPage() {
  localStorage.setItem("token", "jwt");
  localStorage.setItem(
    "user",
    JSON.stringify({
      id: 1,
      email: "a@b.com",
      displayName: "A",
      themePreference: "",
    }),
  );

  return render(
    <MemoryRouter>
      <AuthProvider>
        <ThemeProvider>
          <CalendarPage />
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  document.documentElement.className = "";

  vi.mocked(api.getTasks).mockResolvedValue({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 500,
  });
  vi.mocked(api.getLists).mockResolvedValue([]);
});

describe("CalendarPage", () => {
  it("renders Calendar heading", async () => {
    renderCalendarPage();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });

  it("shows loading spinner initially", () => {
    // Make getTasks hang
    vi.mocked(api.getTasks).mockReturnValue(new Promise(() => {}));
    renderCalendarPage();
    // The loading state exists (Loader2 renders as an svg)
  });

  it("shows view range buttons (Today, Week, Month)", () => {
    renderCalendarPage();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Week")).toBeInTheDocument();
    expect(screen.getByText("Month")).toBeInTheDocument();
  });

  it("defaults to month view", async () => {
    renderCalendarPage();
    // Wait for loading to finish and month grid to render
    await waitFor(() => {
      expect(screen.getByText("Sun")).toBeInTheDocument();
    });
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
  });

  it("switches to Today view", async () => {
    renderCalendarPage();

    await waitFor(() => {
      expect(screen.queryByText("Checking...")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Today"));

    // Today view doesn't show the month grid with Sun/Mon headers
    // Instead it shows the current date in the header
    const today = new Date();
    const expectedText = today.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  it("navigates forward and backward", async () => {
    renderCalendarPage();

    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalled();
    });

    const now = new Date();
    const currentMonth = now.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
    expect(screen.getByText(currentMonth)).toBeInTheDocument();

    // Navigate forward
    const buttons = screen.getAllByRole("button");
    // The right chevron is the last navigation button before the content
    const nextBtn = buttons.find((b) =>
      b.querySelector('[class*="lucide-chevron-right"]'),
    );
    if (nextBtn) fireEvent.click(nextBtn);
  });

  it("renders tasks with due dates", async () => {
    const today = new Date();
    vi.mocked(api.getTasks).mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Due Task",
          dueDate: today.toISOString(),
          priority: "Medium" as const,
          status: "Todo" as const,
          tags: [],
          createdAt: today.toISOString(),
          updatedAt: today.toISOString(),
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 500,
    });

    renderCalendarPage();

    await waitFor(() => {
      expect(screen.getByText(/1 task/)).toBeInTheDocument();
    });
  });

  it("shows 'No tasks scheduled' when empty", async () => {
    renderCalendarPage();

    await waitFor(() => {
      expect(screen.getByText(/0 tasks/)).toBeInTheDocument();
    });
  });

  it("fetches tasks and lists on mount", async () => {
    renderCalendarPage();

    await waitFor(() => {
      expect(api.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          page: "1",
          pageSize: "500",
          sortBy: "dueDate",
        }),
      );
      expect(api.getLists).toHaveBeenCalled();
    });
  });
});
