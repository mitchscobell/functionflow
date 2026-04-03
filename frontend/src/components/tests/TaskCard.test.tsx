import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskCard from "../TaskCard";
import type { Task } from "../../types";

const baseTask: Task = {
  id: 1,
  title: "Test Task",
  priority: "Medium",
  status: "Todo",
  tags: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("TaskCard", () => {
  it("renders task title", () => {
    render(
      <TaskCard task={baseTask} onEdit={vi.fn()} onDelete={vi.fn()} onToggleStatus={vi.fn()} />,
    );
    expect(screen.getByText("Test Task")).toBeInTheDocument();
  });

  it("renders priority badge", () => {
    render(
      <TaskCard task={baseTask} onEdit={vi.fn()} onDelete={vi.fn()} onToggleStatus={vi.fn()} />,
    );
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("renders description when present", () => {
    const task = { ...baseTask, description: "Some description" };
    render(<TaskCard task={task} onEdit={vi.fn()} onDelete={vi.fn()} onToggleStatus={vi.fn()} />);
    expect(screen.getByText("Some description")).toBeInTheDocument();
  });

  it("does not render description when absent", () => {
    render(
      <TaskCard task={baseTask} onEdit={vi.fn()} onDelete={vi.fn()} onToggleStatus={vi.fn()} />,
    );
    expect(screen.queryByText("Some description")).not.toBeInTheDocument();
  });

  it("renders tags", () => {
    const task = { ...baseTask, tags: ["work", "urgent"] };
    render(<TaskCard task={task} onEdit={vi.fn()} onDelete={vi.fn()} onToggleStatus={vi.fn()} />);
    expect(screen.getByText("work")).toBeInTheDocument();
    expect(screen.getByText("urgent")).toBeInTheDocument();
  });

  it("renders due date when present", () => {
    const task = { ...baseTask, dueDate: "2024-12-25T00:00:00Z" };
    render(<TaskCard task={task} onEdit={vi.fn()} onDelete={vi.fn()} onToggleStatus={vi.fn()} />);
    // Date format depends on locale/timezone — just check that the Calendar icon's parent span exists
    const expected = new Date("2024-12-25T00:00:00Z").toLocaleDateString();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("shows overdue styling for past due dates on non-Done tasks", () => {
    const task = {
      ...baseTask,
      dueDate: "2020-01-01T00:00:00Z",
      status: "Todo" as const,
    };
    const { container } = render(
      <TaskCard task={task} onEdit={vi.fn()} onDelete={vi.fn()} onToggleStatus={vi.fn()} />,
    );
    // The overdue span should have text-red-500
    const overdueDateSpan = container.querySelector(".text-red-500");
    expect(overdueDateSpan).not.toBeNull();
  });

  it("does not show overdue styling for Done tasks with past due dates", () => {
    const task = {
      ...baseTask,
      dueDate: "2020-01-01T00:00:00Z",
      status: "Done" as const,
    };
    const { container } = render(
      <TaskCard task={task} onEdit={vi.fn()} onDelete={vi.fn()} onToggleStatus={vi.fn()} />,
    );
    // The date span should not have text-red-500 font-medium for overdue
    const spans = container.querySelectorAll(".text-red-500.font-medium");
    expect(spans.length).toBe(0);
  });

  it("renders URL link when present", () => {
    const task = { ...baseTask, url: "https://example.com" };
    render(<TaskCard task={task} onEdit={vi.fn()} onDelete={vi.fn()} onToggleStatus={vi.fn()} />);
    const link = screen.getByText("Link");
    expect(link.closest("a")).toHaveAttribute("href", "https://example.com");
  });

  it("renders Notes indicator when notes present", () => {
    const task = { ...baseTask, notes: "some notes" };
    render(<TaskCard task={task} onEdit={vi.fn()} onDelete={vi.fn()} onToggleStatus={vi.fn()} />);
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("calls onEdit when edit button clicked", () => {
    const onEdit = vi.fn();
    render(
      <TaskCard task={baseTask} onEdit={onEdit} onDelete={vi.fn()} onToggleStatus={vi.fn()} />,
    );
    // Edit and delete buttons exist within the component
    const buttons = screen.getAllByRole("button");
    // First button is toggle status, then edit, then delete
    fireEvent.click(buttons[1]);
    expect(onEdit).toHaveBeenCalledWith(baseTask);
  });

  it("calls onDelete when delete button clicked", () => {
    const onDelete = vi.fn();
    render(
      <TaskCard task={baseTask} onEdit={vi.fn()} onDelete={onDelete} onToggleStatus={vi.fn()} />,
    );
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]);
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("calls onToggleStatus when status icon clicked", () => {
    const onToggleStatus = vi.fn();
    render(
      <TaskCard
        task={baseTask}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleStatus={onToggleStatus}
      />,
    );
    fireEvent.click(screen.getByTitle("Toggle status"));
    expect(onToggleStatus).toHaveBeenCalledWith(baseTask);
  });

  it("applies opacity-60 class for Done tasks", () => {
    const task = { ...baseTask, status: "Done" as const };
    const { container } = render(
      <TaskCard task={task} onEdit={vi.fn()} onDelete={vi.fn()} onToggleStatus={vi.fn()} />,
    );
    expect(container.firstChild).toHaveClass("opacity-60");
  });

  it("applies line-through for Done task title", () => {
    const task = { ...baseTask, status: "Done" as const };
    render(<TaskCard task={task} onEdit={vi.fn()} onDelete={vi.fn()} onToggleStatus={vi.fn()} />);
    const title = screen.getByText("Test Task");
    expect(title).toHaveClass("line-through");
  });

  // ── Click-to-edit ──

  it("opens edit when the card body is clicked", () => {
    const onEdit = vi.fn();
    const { container } = render(
      <TaskCard task={baseTask} onEdit={onEdit} onDelete={vi.fn()} onToggleStatus={vi.fn()} />,
    );
    // Click the card's root div
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onEdit).toHaveBeenCalledWith(baseTask);
  });

  // ── Tag click ──

  it("calls onTagClick when a tag badge is clicked", () => {
    const onTagClick = vi.fn();
    const task = { ...baseTask, tags: ["work", "urgent"] };
    render(
      <TaskCard
        task={task}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleStatus={vi.fn()}
        onTagClick={onTagClick}
      />,
    );
    fireEvent.click(screen.getByText("work"));
    expect(onTagClick).toHaveBeenCalledWith("work");
  });

  it("does not call onEdit when tag is clicked (stopPropagation)", () => {
    const onEdit = vi.fn();
    const onTagClick = vi.fn();
    const task = { ...baseTask, tags: ["work"] };
    render(
      <TaskCard
        task={task}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onToggleStatus={vi.fn()}
        onTagClick={onTagClick}
      />,
    );
    fireEvent.click(screen.getByText("work"));
    expect(onTagClick).toHaveBeenCalledWith("work");
    // onEdit should NOT be called because tag click stops propagation
    expect(onEdit).not.toHaveBeenCalled();
  });
});
