import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../lib/api";
import { getErrorMessage } from "../lib/errorUtils";
import type { Task, TaskList } from "../types";
import Layout from "../components/Layout";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";

/** Calendar display granularity: single day, week, or full month. */
type ViewRange = "today" | "week" | "month";

/** Maps task-list color keys to their Tailwind background classes. */
const LIST_COLORS: Record<string, string> = {
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  cyan: "bg-cyan-500",
  fuchsia: "bg-fuchsia-500",
  orange: "bg-orange-500",
  lime: "bg-lime-500",
  sky: "bg-sky-500",
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewRange, setViewRange] = useState<ViewRange>("month");
  const [refDate, setRefDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  /** Fetches all tasks (with due dates) and all lists from the API. */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, listsRes] = await Promise.all([
        api.getTasks({ page: "1", pageSize: "500", sortBy: "dueDate" }),
        api.getLists(),
      ]);
      setTasks(tasksRes.items.filter((t) => t.dueDate));
      setLists(listsRes);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Maps list IDs to their Tailwind background color classes. */
  const listColorMap = useMemo(() => {
    const map: Record<number, string> = {};
    lists.forEach((l) => {
      map[l.id] = LIST_COLORS[l.color] || "bg-[var(--accent)]";
    });
    return map;
  }, [lists]);

  /**
   * Returns the Tailwind background color class for a task based on its list.
   * Falls back to the accent color for tasks without a list.
   * @param task - The task to get the color for.
   */
  const getListColor = (task: Task) => {
    if (task.listId && listColorMap[task.listId]) return listColorMap[task.listId];
    return "bg-[var(--accent)]";
  };

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

  /** Tasks for the selected calendar day, or all view tasks if no day is selected. */
  // Tasks for selected date (click on a calendar day)
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return viewTasks;
    return tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), selectedDate));
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
   * Creates or updates a task and refreshes the calendar data.
   * @param data - Partial task fields from the modal form.
   */
  const handleSave = async (data: Partial<Task>) => {
    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, data);
        toast.success("Task updated");
      } else {
        await api.createTask(data);
        toast.success("Task created");
      }
      setModalOpen(false);
      setEditingTask(null);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  /**
   * Deletes a task and refreshes the calendar data.
   * @param id - The task's database ID.
   */
  const handleDelete = async (id: number) => {
    try {
      await api.deleteTask(id);
      toast.success("Task deleted");
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  /**
   * Cycles a task's status: Todo → InProgress → Done → Todo.
   * @param task - The task whose status should be toggled.
   */
  const handleToggleStatus = async (task: Task) => {
    const next: Record<string, string> = {
      Todo: "InProgress",
      InProgress: "Done",
      Done: "Todo",
    };
    try {
      await api.updateTask(task.id, {
        status: next[task.status] as Task["status"],
      });
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
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

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 hover:bg-[var(--hover)] transition-colors"
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
                              className={`h-1.5 w-1.5 rounded-full ${getListColor(t)}`}
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
            <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
              {selectedDate
                ? `Tasks for ${selectedDate.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`
                : `${viewTasks.length} task${viewTasks.length !== 1 ? "s" : ""} with due dates`}
            </h3>
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
        }}
        onSave={handleSave}
        lists={lists}
      />
    </Layout>
  );
}
