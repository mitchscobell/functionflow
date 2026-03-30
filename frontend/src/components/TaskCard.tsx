import { clsx } from "clsx";
import type { Task } from "../types";
import {
  Calendar,
  Tag,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  StickyNote,
} from "lucide-react";

/** Maps priority levels to their Tailwind color classes for the badge. */
const priorityColors: Record<string, string> = {
  High: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

/** Maps task statuses to their corresponding icon elements. */
const statusIcons: Record<string, React.ReactNode> = {
  Todo: <Circle size={16} className="text-gray-400" />,
  InProgress: <Clock size={16} className="text-blue-500" />,
  Done: <CheckCircle2 size={16} className="text-[var(--success)]" />,
};

/** Props for the {@link TaskCard} component. */
interface Props {
  /** The task to display. */
  task: Task;

  /** Callback invoked when the user clicks the edit button. */
  onEdit: (task: Task) => void;

  /** Callback invoked when the user clicks the delete button. */
  onDelete: (id: number) => void;

  /** Callback invoked when the user toggles the task's completion status. */
  onToggleStatus: (task: Task) => void;
}

/**
 * Renders an individual task as a card with status toggle, priority badge,
 * due date, tags, and action buttons for editing and deleting.
 */
export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onToggleStatus,
}: Props) {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "Done";

  return (
    <div
      className={clsx(
        "group rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition-all hover:shadow-md",
        task.status === "Done" && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={() => onToggleStatus(task)}
            className="mt-0.5 shrink-0 hover:scale-110 transition-transform"
            title="Toggle status"
          >
            {statusIcons[task.status]}
          </button>

          <div className="min-w-0 flex-1">
            <h3
              className={clsx(
                "font-medium truncate",
                task.status === "Done" && "line-through text-gray-400",
              )}
            >
              {task.title}
            </h3>

            {task.description && (
              <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  priorityColors[task.priority],
                )}
              >
                {task.priority}
              </span>

              {task.dueDate && (
                <span
                  className={clsx(
                    "flex items-center gap-1 text-xs",
                    isOverdue
                      ? "text-red-500 font-medium"
                      : "text-[var(--muted)]",
                  )}
                >
                  <Calendar size={12} />
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}

              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-[var(--hover)] px-2 py-0.5 text-xs text-[var(--muted)]"
                >
                  <Tag size={10} />
                  {tag}
                </span>
              ))}

              {task.url && (
                <a
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={10} />
                  Link
                </a>
              )}

              {task.notes && (
                <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                  <StickyNote size={10} />
                  Notes
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="rounded-lg p-1.5 hover:bg-[var(--hover)] transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="rounded-lg p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
