import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskModal from "../TaskModal";
import type { Task, TaskList } from "../../types";

const baseLists: TaskList[] = [
  {
    id: 1,
    name: "Work",
    emoji: "💼",
    color: "blue",
    sortOrder: 0,
    taskCount: 3,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Home",
    color: "green",
    sortOrder: 1,
    taskCount: 1,
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const existingTask: Task = {
  id: 5,
  title: "Existing Task",
  description: "A description",
  notes: "Some notes",
  url: "https://example.com",
  priority: "High",
  status: "InProgress",
  dueDate: "2024-06-15T00:00:00Z",
  tags: ["work", "urgent"],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  listId: 1,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TaskModal", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <TaskModal open={false} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders 'New Task' title when no task provided", () => {
    render(<TaskModal open={true} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("New Task")).toBeInTheDocument();
  });

  it("renders 'Edit Task' title when task provided", () => {
    render(
      <TaskModal
        open={true}
        task={existingTask}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("Edit Task")).toBeInTheDocument();
  });

  it("populates fields from existing task", () => {
    render(
      <TaskModal
        open={true}
        task={existingTask}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Existing Task")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A description")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Some notes")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("work, urgent")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2024-06-15")).toBeInTheDocument();
  });

  it("shows Status field only when editing existing task", () => {
    const { rerender } = render(
      <TaskModal open={true} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    // No status dropdown for new task
    expect(screen.queryByDisplayValue("To Do")).not.toBeInTheDocument();

    rerender(
      <TaskModal
        open={true}
        task={existingTask}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    // Status dropdown present for editing
    expect(screen.getByDisplayValue("In Progress")).toBeInTheDocument();
  });

  it("renders list dropdown when lists are provided", () => {
    render(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        lists={baseLists}
      />,
    );

    expect(screen.getByText("Inbox (no list)")).toBeInTheDocument();
    expect(screen.getByText("💼 Work")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("does not render list dropdown when no lists", () => {
    render(<TaskModal open={true} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.queryByText("Inbox (no list)")).not.toBeInTheDocument();
  });

  it("calls onSave with form data on submit", () => {
    const onSave = vi.fn();
    render(<TaskModal open={true} onClose={vi.fn()} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText("What needs to be done?"), {
      target: { value: "My Task" },
    });
    fireEvent.change(screen.getByPlaceholderText("work, personal, urgent"), {
      target: { value: "tag1, tag2" },
    });

    fireEvent.click(screen.getByText("Create"));

    expect(onSave).toHaveBeenCalledTimes(1);
    const data = onSave.mock.calls[0][0];
    expect(data.title).toBe("My Task");
    expect(data.tags).toEqual(["tag1", "tag2"]);
    expect(data.priority).toBe("Medium"); // default
    expect(data.status).toBeUndefined(); // no status for new tasks
  });

  it("calls onSave with status for existing tasks", () => {
    const onSave = vi.fn();
    render(
      <TaskModal
        open={true}
        task={existingTask}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByText("Update"));

    const data = onSave.mock.calls[0][0];
    expect(data.status).toBe("InProgress");
  });

  it("calls onClose when Cancel button clicked", () => {
    const onClose = vi.fn();
    render(<TaskModal open={true} onClose={onClose} onSave={vi.fn()} />);

    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(<TaskModal open={true} onClose={onClose} onSave={vi.fn()} />);

    // Click the backdrop (outer div)
    const backdrop = screen.getByText("New Task").closest(".fixed");
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close when inner modal clicked", () => {
    const onClose = vi.fn();
    render(<TaskModal open={true} onClose={onClose} onSave={vi.fn()} />);

    // Click the inner content area
    fireEvent.click(screen.getByText("New Task"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("defaults listId from activeListId for new tasks", () => {
    const onSave = vi.fn();
    render(
      <TaskModal
        open={true}
        onClose={vi.fn()}
        onSave={onSave}
        lists={baseLists}
        activeListId={2}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("What needs to be done?"), {
      target: { value: "Listed Task" },
    });

    fireEvent.click(screen.getByText("Create"));

    const data = onSave.mock.calls[0][0];
    expect(data.listId).toBe(2);
  });

  it("strips empty tags from comma-separated input", () => {
    const onSave = vi.fn();
    render(<TaskModal open={true} onClose={vi.fn()} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText("What needs to be done?"), {
      target: { value: "Task" },
    });
    fireEvent.change(screen.getByPlaceholderText("work, personal, urgent"), {
      target: { value: "a, , b, " },
    });

    fireEvent.click(screen.getByText("Create"));

    expect(onSave.mock.calls[0][0].tags).toEqual(["a", "b"]);
  });
});
