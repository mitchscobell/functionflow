import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "../DashboardPage";
import { AuthProvider } from "../../hooks/useAuth";
import { ThemeProvider } from "../../hooks/useTheme";

// Mock api
vi.mock("../../lib/api", () => ({
  api: {
    getTasks: vi.fn(),
    getLists: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
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

// Mock heavy child components to keep tests focused
vi.mock("../../components/TaskCard", () => ({
  default: ({ task, onEdit, onDelete, onToggleStatus }: any) => (
    <div data-testid="task-card">
      <span>{task.title}</span>
      <button onClick={() => onEdit(task)}>edit</button>
      <button onClick={() => onDelete(task.id)}>delete</button>
      <button onClick={() => onToggleStatus(task)}>toggle</button>
    </div>
  ),
}));

vi.mock("../../components/TaskModal", () => ({
  default: ({ open, onClose, onSave, task }: any) =>
    open ? (
      <div data-testid="task-modal">
        <span>{task ? "Edit" : "Create"}</span>
        <button onClick={() => onSave({ title: "New Task" })}>
          save-modal
        </button>
        <button onClick={onClose}>close-modal</button>
      </div>
    ) : null,
}));

vi.mock("../../components/EmojiPicker", () => ({
  default: () => <div data-testid="emoji-picker" />,
}));

import { api } from "../../lib/api";
import toast from "react-hot-toast";

const emptyResponse = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: 100,
};

function renderDashboard() {
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
          <DashboardPage />
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  document.documentElement.className = "";

  vi.mocked(api.getTasks).mockResolvedValue(emptyResponse);
  vi.mocked(api.getLists).mockResolvedValue([]);
});

describe("DashboardPage", () => {
  it("renders All Tasks heading", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "All Tasks" })).toBeInTheDocument();
    });
  });

  it("shows search input", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search tasks..."),
      ).toBeInTheDocument();
    });
  });

  it("shows empty state when no tasks", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(
        screen.getByText(/No tasks yet|No tasks found/),
      ).toBeInTheDocument();
    });
  });

  it("renders tasks from API", async () => {
    vi.mocked(api.getTasks).mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Task One",
          priority: "High" as const,
          status: "Todo" as const,
          tags: [],
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          title: "Task Two",
          priority: "Low" as const,
          status: "Done" as const,
          tags: [],
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
      totalCount: 2,
      page: 1,
      pageSize: 100,
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText("Task One").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Task Two").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("opens task modal when New Task button clicked", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalled();
    });

    const newTaskBtn = screen.getByText("New Task");
    fireEvent.click(newTaskBtn);

    expect(screen.getByTestId("task-modal")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
  });

  it("creates task via modal save", async () => {
    vi.mocked(api.createTask).mockResolvedValueOnce({
      id: 99,
      title: "New Task",
      priority: "Medium" as const,
      status: "Todo" as const,
      tags: [],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    renderDashboard();

    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText("New Task"));
    fireEvent.click(screen.getByText("save-modal"));

    await waitFor(() => {
      expect(api.createTask).toHaveBeenCalled();
    });
    expect(toast.success).toHaveBeenCalledWith("Task created");
  });

  it("deletes task", async () => {
    vi.mocked(api.getTasks).mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Delete Me",
          priority: "Low" as const,
          status: "Todo" as const,
          tags: [],
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 100,
    });
    vi.mocked(api.deleteTask).mockResolvedValueOnce(undefined);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText("Delete Me").length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByText("delete"));

    await waitFor(() => {
      expect(api.deleteTask).toHaveBeenCalledWith(1);
    });
  });

  it("fetches tasks and lists on mount", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(api.getTasks).toHaveBeenCalled();
      expect(api.getLists).toHaveBeenCalled();
    });
  });

  it("shows All Tasks in sidebar", async () => {
    renderDashboard();

    await waitFor(() => {
      const buttons = screen.getAllByText("All Tasks");
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });
});
