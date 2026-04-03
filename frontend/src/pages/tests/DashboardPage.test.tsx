import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "../DashboardPage";
import type { Task } from "../../types";
import { AuthProvider } from "../../hooks/useAuth";
import { ThemeProvider } from "../../hooks/useTheme";
import { TestQueryProvider } from "../../test-utils";

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
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock heavy child components to keep tests focused
vi.mock("../../components/TaskCard", () => ({
  default: ({
    task,
    onEdit,
    onDelete,
    onToggleStatus,
    onTagClick,
  }: {
    task: { id: number; title: string; tags?: string[] };
    onEdit: (task: { id: number; title: string }) => void;
    onDelete: (id: number) => void;
    onToggleStatus: (task: { id: number; title: string }) => void;
    onTagClick?: (tag: string) => void;
  }) => (
    <div data-testid="task-card">
      <span>{task.title}</span>
      <button onClick={() => onEdit(task)}>edit</button>
      <button onClick={() => onDelete(task.id)}>delete</button>
      <button onClick={() => onToggleStatus(task)}>toggle</button>
      {task.tags?.map((tag) => (
        <button key={tag} onClick={() => onTagClick?.(tag)}>
          {tag}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../../components/TaskModal", () => ({
  default: ({
    open,
    onClose,
    onSave,
    task,
  }: {
    open: boolean;
    onClose: () => void;
    onSave: (data: { title: string }) => void;
    task: { title: string } | null;
  }) =>
    open ? (
      <div data-testid="task-modal">
        <span>{task ? "Edit" : "Create"}</span>
        <button onClick={() => onSave({ title: "New Task" })}>save-modal</button>
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
      <TestQueryProvider>
        <AuthProvider>
          <ThemeProvider>
            <DashboardPage />
          </ThemeProvider>
        </AuthProvider>
      </TestQueryProvider>
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
      expect(screen.getByPlaceholderText("Search tasks...")).toBeInTheDocument();
    });
  });

  it("shows empty state when no tasks", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/No tasks yet|No tasks found/)).toBeInTheDocument();
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
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);

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

  it("does not delete task when confirm is cancelled", async () => {
    vi.mocked(api.getTasks).mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Keep Me",
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
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText("Keep Me").length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByText("delete"));

    expect(window.confirm).toHaveBeenCalledWith("Delete this task?");
    expect(api.deleteTask).not.toHaveBeenCalled();
  });

  it("optimistically updates task status without full refetch", async () => {
    vi.mocked(api.getTasks).mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Toggle Me",
          priority: "Medium" as const,
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
    vi.mocked(api.updateTask).mockResolvedValueOnce({} as Task);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText("Toggle Me").length).toBeGreaterThanOrEqual(1);
    });

    const callCountBefore = vi.mocked(api.getTasks).mock.calls.length;

    fireEvent.click(screen.getByText("toggle"));

    await waitFor(() => {
      expect(api.updateTask).toHaveBeenCalledWith(1, { status: "InProgress" });
    });

    // Should NOT have re-fetched tasks (optimistic update)
    expect(vi.mocked(api.getTasks).mock.calls.length).toBe(callCountBefore);
  });

  it("shows Lists label on mobile list dropdown", async () => {
    vi.mocked(api.getLists).mockResolvedValue([
      {
        id: 1,
        name: "Work",
        emoji: "\ud83d\udcbc",
        color: "blue",
        sortOrder: 0,
        taskCount: 3,
        createdAt: "2024-01-01T00:00:00Z",
      },
    ]);

    renderDashboard();

    await waitFor(() => {
      // Both mobile label and sidebar heading say "Lists"
      const matches = screen.getAllByText("Lists");
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Filter & Sort ──

  /** Helper: find the filter toggle button next to the search input. */
  function getFilterButton() {
    const searchInput = screen.getByPlaceholderText("Search tasks...");
    // Walk up to the flex row containing both search and filter button
    const row = searchInput.parentElement!.parentElement!;
    return row.querySelector(":scope > button") as HTMLButtonElement;
  }

  it("toggles filter panel open and closed", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalled();
    });

    // Filter panel should not be open initially
    expect(screen.queryByText("All Status")).not.toBeInTheDocument();

    fireEvent.click(getFilterButton());

    expect(screen.getByText("All Status")).toBeInTheDocument();
    expect(screen.getByText("All Priority")).toBeInTheDocument();
    expect(screen.getByText("Newest First")).toBeInTheDocument();
  });

  it("applies status filter", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalled();
    });

    fireEvent.click(getFilterButton());

    const statusSelect = screen.getByDisplayValue("All Status");
    fireEvent.change(statusSelect, { target: { value: "Todo" } });

    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalledWith(
        expect.objectContaining({ status: "Todo" }),
      );
    });
  });

  it("applies priority filter", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalled();
    });

    fireEvent.click(getFilterButton());

    const prioritySelect = screen.getByDisplayValue("All Priority");
    fireEvent.change(prioritySelect, { target: { value: "High" } });

    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalledWith(
        expect.objectContaining({ priority: "High" }),
      );
    });
  });

  it("changes sort order", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalled();
    });

    fireEvent.click(getFilterButton());

    const sortSelect = screen.getByDisplayValue("Newest First");
    fireEvent.change(sortSelect, { target: { value: "dueDate" } });

    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "dueDate" }),
      );
    });
  });

  // ── View modes ──

  it("switches to swimlane view and shows columns", async () => {
    vi.mocked(api.getTasks).mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Todo Task",
          priority: "Medium" as const,
          status: "Todo" as const,
          tags: [],
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          title: "Done Task",
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
      expect(screen.getAllByText("Todo Task").length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByTitle("Swimlane view"));

    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("hides completed tasks when eye toggle is clicked", async () => {
    vi.mocked(api.getTasks).mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Active Task",
          priority: "Medium" as const,
          status: "Todo" as const,
          tags: [],
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          title: "Completed Task",
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
      expect(screen.getAllByText("Active Task").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Completed Task").length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByTitle("Hide completed"));

    expect(screen.getAllByText("Active Task").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Completed Task")).not.toBeInTheDocument();
  });

  // ── Edit task ──

  it("opens modal in edit mode when edit is clicked", async () => {
    vi.mocked(api.getTasks).mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Edit Me",
          priority: "Medium" as const,
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

    renderDashboard();
    await waitFor(() => {
      expect(screen.getAllByText("Edit Me").length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByText("edit"));

    expect(screen.getByTestId("task-modal")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("updates task via modal save", async () => {
    vi.mocked(api.getTasks).mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Update Me",
          priority: "Medium" as const,
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
    vi.mocked(api.updateTask).mockResolvedValueOnce({} as Task);

    renderDashboard();
    await waitFor(() => {
      expect(screen.getAllByText("Update Me").length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByText("edit"));
    fireEvent.click(screen.getByText("save-modal"));

    await waitFor(() => {
      expect(api.updateTask).toHaveBeenCalled();
    });
    expect(toast.success).toHaveBeenCalledWith("Task updated");
  });

  // ── List management ──

  it("creates a new list from sidebar input", async () => {
    vi.mocked(api.createList).mockResolvedValueOnce({
      id: 1,
      name: "My List",
      color: "blue",
      sortOrder: 0,
      taskCount: 0,
      createdAt: "2024-01-01T00:00:00Z",
    });

    renderDashboard();
    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText("New list...");
    fireEvent.change(input, { target: { value: "My List" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(api.createList).toHaveBeenCalledWith({ name: "My List" });
    });
    expect(toast.success).toHaveBeenCalledWith("List created");
  });

  it("deletes a list", async () => {
    vi.mocked(api.getLists).mockResolvedValue([
      {
        id: 1,
        name: "Delete List",
        color: "blue",
        sortOrder: 0,
        taskCount: 0,
        createdAt: "2024-01-01T00:00:00Z",
      },
    ]);
    vi.mocked(api.deleteList).mockResolvedValueOnce(undefined);

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText("Delete List")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle("Delete list");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.deleteList).toHaveBeenCalledWith(1);
    });
    expect(toast.success).toHaveBeenCalledWith("List deleted — tasks moved to Inbox");
  });

  it("enters rename mode for a list", async () => {
    vi.mocked(api.getLists).mockResolvedValue([
      {
        id: 1,
        name: "Rename Me",
        color: "blue",
        sortOrder: 0,
        taskCount: 0,
        createdAt: "2024-01-01T00:00:00Z",
      },
    ]);

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText("Rename Me")).toBeInTheDocument();
    });

    const renameBtn = screen.getByTitle("Rename");
    fireEvent.click(renameBtn);

    expect(screen.getByDisplayValue("Rename Me")).toBeInTheDocument();
  });

  // ── Error handling ──

  it("shows error toast when task creation fails", async () => {
    vi.mocked(api.createTask).mockRejectedValueOnce(new Error("Server error"));

    renderDashboard();
    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText("New Task"));
    fireEvent.click(screen.getByText("save-modal"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Server error");
    });
  });

  it("shows error toast when task load fails", async () => {
    vi.mocked(api.getTasks).mockRejectedValue(new Error("Network failure"));

    renderDashboard();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network failure");
    });
  });

  it("reverts optimistic update on toggle failure", async () => {
    vi.mocked(api.getTasks).mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Revert Me",
          priority: "Medium" as const,
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
    vi.mocked(api.updateTask).mockRejectedValueOnce(new Error("Update failed"));

    renderDashboard();
    await waitFor(() => {
      expect(screen.getAllByText("Revert Me").length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByText("toggle"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed");
    });
    // fetchTasks should be called again to revert
    expect(vi.mocked(api.getTasks).mock.calls.length).toBeGreaterThan(1);
  });

  // ── Search ──

  it("debounces search input before calling API", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalled();
    });

    const callsBefore = vi.mocked(api.getTasks).mock.calls.length;

    const searchInput = screen.getByPlaceholderText("Search tasks...");
    fireEvent.change(searchInput, { target: { value: "hello" } });

    // Immediately after typing, no new API call yet
    expect(vi.mocked(api.getTasks).mock.calls.length).toBe(callsBefore);

    // After debounce delay, the search param should be sent
    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalledWith(
        expect.objectContaining({ search: "hello" }),
      );
    });
  });

  // ── Print ──

  it("calls window.print when print button is clicked", async () => {
    vi.spyOn(window, "print").mockImplementation(() => {});

    renderDashboard();
    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByTitle("Print"));

    expect(window.print).toHaveBeenCalled();
  });

  // ── List filtering ──

  it("filters tasks by selected list", async () => {
    vi.mocked(api.getLists).mockResolvedValue([
      {
        id: 10,
        name: "Work",
        emoji: "💼",
        color: "blue",
        sortOrder: 0,
        taskCount: 1,
        createdAt: "2024-01-01T00:00:00Z",
      },
    ]);
    vi.mocked(api.getTasks).mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Work Task",
          priority: "Medium" as const,
          status: "Todo" as const,
          tags: [],
          listId: 10,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          title: "Inbox Task",
          priority: "Low" as const,
          status: "Todo" as const,
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
      expect(screen.getAllByText("Work Task").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Inbox Task").length).toBeGreaterThanOrEqual(1);
    });

    // Click on Work list in sidebar
    fireEvent.click(screen.getByText("Work"));

    // After selecting a list, only matching tasks should be visible
    expect(screen.getAllByText("Work Task").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Inbox Task")).not.toBeInTheDocument();
  });

  // ── Empty state messaging ──

  it("shows filter-specific empty message when filters active", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalled();
    });

    fireEvent.click(getFilterButton());

    const statusSelect = screen.getByDisplayValue("All Status");
    fireEvent.change(statusSelect, { target: { value: "InProgress" } });

    await waitFor(() => {
      expect(screen.getByText("No tasks found")).toBeInTheDocument();
    });
    expect(screen.getByText("Try adjusting your filters.")).toBeInTheDocument();
  });

  it("shows task count in summary", async () => {
    vi.mocked(api.getTasks).mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Only Task",
          priority: "Medium" as const,
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

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText("1 task")).toBeInTheDocument();
    });
  });

  // ── Tag filtering ──

  it("shows active tag badge when a tag is clicked and clears on dismiss", async () => {
    vi.mocked(api.getTasks).mockResolvedValue({
      items: [
        {
          id: 1,
          title: "Tagged Task",
          priority: "Medium" as const,
          status: "Todo" as const,
          tags: ["urgent"],
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 100,
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getAllByText("Tagged Task").length).toBeGreaterThanOrEqual(1);
    });

    // Click the tag on the TaskCard
    const tagButtons = screen.getAllByText("urgent");
    fireEvent.click(tagButtons[0]);

    // Active tag badge should appear
    await waitFor(() => {
      expect(screen.getByText("Filtered by tag:")).toBeInTheDocument();
      expect(screen.getByText("urgent ✕")).toBeInTheDocument();
    });

    // getTasks should be called with tag param
    await waitFor(() => {
      const calls = vi.mocked(api.getTasks).mock.calls;
      const lastCall = calls[calls.length - 1]?.[0];
      expect(lastCall).toEqual(expect.objectContaining({ tag: "urgent" }));
    });

    // Clear the tag filter
    fireEvent.click(screen.getByText("urgent ✕"));
    await waitFor(() => {
      expect(screen.queryByText("Filtered by tag:")).not.toBeInTheDocument();
    });
  });

  // ── Due date sort direction ──

  it("sends ascending sort direction when sorting by due date", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(vi.mocked(api.getTasks)).toHaveBeenCalled();
    });

    // Open filters to access the sort select
    fireEvent.click(getFilterButton());
    const sortSelect = screen.getByDisplayValue("Newest First");
    fireEvent.change(sortSelect, { target: { value: "dueDate" } });

    await waitFor(() => {
      const calls = vi.mocked(api.getTasks).mock.calls;
      const lastCall = calls[calls.length - 1]?.[0];
      expect(lastCall).toEqual(expect.objectContaining({ sortBy: "dueDate", sortDir: "asc" }));
    });
  });
});
