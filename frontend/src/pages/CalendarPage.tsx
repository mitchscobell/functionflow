import { useState, useMemo, useCallback } from "react";
import { useTasks, useTaskMutations } from "../hooks/useTasks";
import { useLists, useCreateListInline } from "../hooks/useLists";

import type { Task } from "../types";
import Layout from "../components/Layout";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, Plus } from "lucide-react";
import toast from "react-hot-toast";

/** Calendar display granularity: single day, week, or full month. */
type ViewRange = "today" | "week" | "month";

/** Maps task priority levels to dot color classes for the month grid. */
const PRIORITY_DOT_COLORS: Record<string, string> = {
  High: "bg-red-500",
  Medium: "bg-yellow-500",
  Low: "bg-green-500",
};

/**
 * Returns the Sunday at the start of the week containing the given date.
 * @param date - Reference date.
 */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the Saturday at the end of the week containing the given date.
 * @param date - Reference date.
 */
function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Checks whether two dates fall on the same calendar day.
 * @param a - First date.
 * @param b - Second date.
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Returns the number of days in the given month.
 * @param year - Full year (e.g. 2025).
 * @param month - Zero-based month index (0 = January).
 */
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Calendar view page that displays tasks with due dates in today, week,
 * or month layouts. Supports navigating between time periods and
 * clicking individual days to see their tasks.
 */
export default function CalendarPage() {
  const [viewRange, setViewRange] = useState<ViewRange>("month");
  const [refDate, setRefDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskDueDate, setNewTaskDueDate] = useState<string | undefined>(undefined);

  /** Opens the task modal in create mode, optionally pre-filling a due date. */
  const openNewTask = (date?: Date) => {
    setEditingTask(null);
    setNewTaskDueDate(
      date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
        : undefined,
    );
    setModalOpen(true);
  };

  // --- TanStack Query hooks ---
  const calendarParams = useMemo(
    () => ({ page: "1", pageSize: "500", sortBy: "dueDate", sortDir: "asc" }),
    [],
  );
  const { data: taskData, isLoading: loading } = useTasks(calendarParams);
  const allTasks = taskData?.items ?? [];
  const tasks = useMemo(() => allTasks.filter((t) => t.dueDate), [allTasks]);

  const { data: lists = [] } = useLists();
  const { createTask, updateTask, deleteTask } = useTaskMutations();
  const createListInline = useCreateListInline();

  /**
   * Navigates forward or backward by one day, week, or month depending on the view.
   * @param dir - Direction: 1 for forward, -1 for backward.
   */
  const navigate = (dir: number) => {
    const d = new Date(refDate);
    if (viewRange === "today") d.setDate(d.getDate() + dir);
    else if (viewRange === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setRefDate(d);
    setSelectedDate(null);
  };

  /** Resets the calendar to today's date. */
  const goToday = () => {
    setRefDate(new Date());
    setSelectedDate(null);
  };

  /** Tasks filtered to the currently visible time range. */
  // Filtered tasks for the current view range
  const viewTasks = useMemo(() => {
    const now = refDate;
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      if (viewRange === "today") return isSameDay(d, now);
      if (viewRange === "week") {
        const ws = startOfWeek(now);
        const we = endOfWeek(now);
        return d >= ws && d <= we;
      }
      // month
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [tasks, refDate, viewRange]);

  /** Tasks for the selected calendar day, or all view tasks if no day is selected. Done tasks sorted to the bottom. */
  const selectedDateTasks = useMemo(() => {
    const filtered = selectedDate
      ? tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), selectedDate))
      : viewTasks;
    return [...filtered].sort((a, b) => {
      if (a.status === "Done" && b.status !== "Done") return 1;
      if (a.status !== "Done" && b.status === "Done") return -1;
      return 0;
    });
  }, [tasks, selectedDate, viewTasks]);

  /** 2D array of dates representing the month grid (weeks × days, null for empty cells). */
  // Generate month grid
  const monthGrid = useMemo(() => {
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const weeks: (Date | null)[][] = [];
    let week: (Date | null)[] = Array(firstDayOfWeek).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      week.push(new Date(year, month, day));
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    return weeks;
  }, [refDate]);

  const tasksOnDay = useCallback(
    (date: Date) => tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), date)),
    [tasks],
  );

  /**
   * Creates or updates a task via TanStack Query mutations.
   * @param data - Partial task fields from the modal form.
   */
  const handleSave = async (data: Partial<Task>) => {
    if (editingTask) {
      updateTask.mutate(
        { id: editingTask.id, data },
        { onSuccess: () => toast.success("Task updated") },
      );
    } else {
      createTask.mutate(data);
    }
    setModalOpen(false);
    setEditingTask(null);
  };

  /**
   * Deletes a task via mutation.
   * @param id - The task's database ID.
   */
  const handleDelete = (id: number) => {
    deleteTask.mutate(id);
  };

  /**
   * Cycles a task's status: Todo → InProgress → Done → Todo.
   * @param task - The task whose status should be toggled.
   */
  const handleToggleStatus = (task: Task) => {
    const next: Record<string, string> = {
      Todo: "InProgress",
      InProgress: "Done",
      Done: "Todo",
    };
    updateTask.mutate({
      id: task.id,
      data: { status: next[task.status] as Task["status"] },
    });
  };

  const headerLabel = useMemo(() => {
    if (viewRange === "today")
      return refDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    if (viewRange === "week") {
      const ws = startOfWeek(refDate);
      const we = endOfWeek(refDate);
      return `${ws.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${we.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return refDate.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }, [refDate, viewRange]);

  const today = new Date();

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays size={24} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold">Calendar</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openNewTask(selectedDate ?? undefined)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Plus size={16} />
            New Task
          </button>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] p-0.5">
            {(["today", "week", "month"] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setViewRange(range);
                  setSelectedDate(null);
                }}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  viewRange === range ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--hover)]"
                }`}
              >
                {range === "today" ? "Today" : range === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 hover:bg-[var(--hover)] transition-colors"
          title="Previous"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-semibold">{headerLabel}</h2>
          {!isSameDay(refDate, today) && (
            <button onClick={goToday} className="text-xs text-[var(--accent)] hover:underline">
              Go to today
            </button>
          )}
        </div>
        <button
          onClick={() => navigate(1)}
          className="rounded-lg p-2 hover:bg-[var(--hover)] transition-colors"
          title="Next"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
        </div>
      ) : (
        <>
          {/* Month grid */}
          {viewRange === "month" && (
            <div className="mb-6">
              <div className="grid grid-cols-7 text-center text-xs font-medium text-[var(--muted)] mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-lg overflow-hidden">
                {monthGrid.flat().map((date, i) => {
                  if (!date) {
                    return <div key={`empty-${i}`} className="bg-[var(--bg)] p-2 min-h-[60px]" />;
                  }
                  const dayTasks = tasksOnDay(date);
                  const isToday = isSameDay(date, today);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`bg-[var(--bg)] p-2 min-h-[60px] text-left transition-colors hover:bg-[var(--hover)] ${
                        isSelected ? "ring-2 ring-[var(--accent)] ring-inset" : ""
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          isToday
                            ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white font-bold"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {dayTasks.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {dayTasks.slice(0, 4).map((t) => (
                            <span
                              key={t.id}
                              className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT_COLORS[t.priority] || "bg-[var(--accent)]"}`}
                              title={`${t.title} (${t.priority})`}
                            />
                          ))}
                          {dayTasks.length > 4 && (
                            <span className="text-[8px] text-[var(--muted)]">
                              +{dayTasks.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Task list for the selected range/day */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">
                {selectedDate
                  ? `Tasks for ${selectedDate.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`
                  : `${viewTasks.length} task${viewTasks.length !== 1 ? "s" : ""} with due dates`}
              </h3>
              {selectedDate && (
                <button
                  onClick={() => openNewTask(selectedDate)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
                  title={`Add task for ${selectedDate.toLocaleDateString()}`}
                >
                  <Plus size={14} />
                  Add Task
                </button>
              )}
            </div>
            {selectedDateTasks.length === 0 ? (
              <p className="text-sm text-[var(--muted)] py-6 text-center">No tasks scheduled.</p>
            ) : (
              <div className="space-y-2">
                {selectedDateTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setModalOpen(true);
                    }}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <TaskModal
        task={editingTask}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
          setNewTaskDueDate(undefined);
        }}
        onSave={handleSave}
        lists={lists}
        defaultDueDate={editingTask ? undefined : newTaskDueDate}
        onCreateList={createListInline}
      />
    </Layout>
  );
}
