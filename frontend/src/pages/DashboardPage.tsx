import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type { Task, TaskList, TaskListResponse } from "../types";
import Layout from "../components/Layout";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";
import EmojiPicker from "../components/EmojiPicker";
import {
  Plus,
  Search,
  Filter,
  Loader2,
  LayoutList,
  Columns3,
  Eye,
  EyeOff,
  Printer,
  FolderPlus,
  Inbox,
  Trash2,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";

/** Filter value for task status — empty string means no filter. */
type StatusFilter = "" | "Todo" | "InProgress" | "Done";

/** Filter value for task priority — empty string means no filter. */
type PriorityFilter = "" | "Low" | "Medium" | "High";

/** Sortable field options for the task list. */
type SortField = "createdAt" | "dueDate" | "priority";

/** Display mode for the task list. */
type ViewMode = "list" | "swimlane";

/** Ordered status columns used in swimlane view. */
const SWIMLANE_STATUSES: Task["status"][] = ["Todo", "InProgress", "Done"];

/** Human-readable labels for each swimlane column. */
const SWIMLANE_LABELS: Record<string, string> = {
  Todo: "To Do",
  InProgress: "In Progress",
  Done: "Done",
};

/** Border color classes for each swimlane column header. */
const SWIMLANE_COLORS: Record<string, string> = {
  Todo: "border-gray-400",
  InProgress: "border-blue-500",
  Done: "border-[var(--success)]",
};

/**
 * Main task management page. Features a list sidebar, search and filter controls,
 * list and swimlane view modes, pagination, and a print-friendly layout.
 */
export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showCompleted, setShowCompleted] = useState(true);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [activeListId, setActiveListId] = useState<number | null>(null); // null = inbox
  const [newListName, setNewListName] = useState("");
  const [editingList, setEditingList] = useState<number | null>(null);
  const [editListName, setEditListName] = useState("");
  const [emojiPickerListId, setEmojiPickerListId] = useState<number | null>(
    null,
  );

  const pageSize = 100; // fetch more for swimlane view

  /** Fetches all task lists for the sidebar. */
  const fetchLists = useCallback(async () => {
    try {
      const res = await api.getLists();
      setLists(res);
    } catch {
      // non-critical
    }
  }, []);

  /** Fetches tasks from the API with current filter, sort, and pagination state. */
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortDescending: "true",
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const res = await api.getTasks(params);
      setTasks(res.items);
      setTotalCount(res.totalCount);
    } catch (err: any) {
      toast.error(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter, sortBy]);

  useEffect(() => {
    fetchTasks();
    fetchLists();
  }, [fetchTasks, fetchLists]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  /**
   * Creates or updates a task and refreshes both the task list and sidebar counts.
   * @param data - Partial task fields from the modal form.
   */
  const handleSave = async (data: Partial<Task>) => {
    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, data);
        toast.success("Task updated");
      } else {
        // Assign to active list if one is selected
        if (activeListId !== null && !data.listId) {
          data = { ...data, listId: activeListId };
        }
        await api.createTask(data);
        toast.success("Task created");
      }
      setModalOpen(false);
      setEditingTask(null);
      fetchTasks();
      fetchLists();
    } catch (err: any) {
      toast.error(err.message || "Failed to save task");
    }
  };

  /**
   * Deletes a task and refreshes the list.
   * @param id - The task's database ID.
   */
  const handleDelete = async (id: number) => {
    try {
      await api.deleteTask(id);
      toast.success("Task deleted");
      fetchTasks();
      fetchLists();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete task");
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
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  /**
   * Opens the task modal in edit mode for the given task.
   * @param task - The task to edit.
   */
  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  /** Opens the task modal in create mode. */
  const openNew = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  /** Creates a new task list from the sidebar input. */
  const handleCreateList = async () => {
    const name = newListName.trim();
    if (!name) return;
    try {
      await api.createList({ name });
      setNewListName("");
      fetchLists();
      toast.success("List created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create list");
    }
  };

  /**
   * Deletes a task list. Tasks in the list are moved to the inbox.
   * @param id - The list's database ID.
   */
  const handleDeleteList = async (id: number) => {
    try {
      await api.deleteList(id);
      if (activeListId === id) setActiveListId(null);
      fetchLists();
      fetchTasks();
      toast.success("List deleted — tasks moved to Inbox");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete list");
    }
  };

  /**
   * Renames a task list currently being edited inline.
   * @param id - The list's database ID.
   */
  const handleRenameList = async (id: number) => {
    const name = editListName.trim();
    if (!name) return;
    try {
      await api.updateList(id, { name });
      setEditingList(null);
      setEditListName("");
      fetchLists();
    } catch (err: any) {
      toast.error(err.message || "Failed to rename list");
    }
  };

  /** Tasks filtered to the currently selected list (or all tasks if no list is active). */
  const filteredByList =
    activeListId === null
      ? tasks
      : tasks.filter((t) => t.listId === activeListId);

  /** Tasks visible after applying the completed-tasks toggle. */
  const visibleTasks = showCompleted
    ? filteredByList
    : filteredByList.filter((t) => t.status !== "Done");

  const totalPages = Math.ceil(totalCount / pageSize);

  /** Opens the browser's native print dialog for the current task view. */
  const handlePrint = () => {
    window.print();
  };

  return (
    <Layout>
      <div className="flex gap-6">
        {/* List sidebar */}
        <aside className="hidden md:block w-52 shrink-0 print:hidden">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
            Lists
          </h2>
          <nav className="space-y-0.5">
            <button
              onClick={() => setActiveListId(null)}
              className={`flex items-center gap-2 w-full rounded-lg px-3 py-1.5 text-sm transition-colors ${
                activeListId === null
                  ? "bg-[var(--accent)] text-white"
                  : "hover:bg-[var(--hover)]"
              }`}
            >
              <Inbox size={14} />
              All Tasks
            </button>
            {lists.map((list) => (
              <div key={list.id} className="group flex items-center">
                {editingList === list.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRenameList(list.id);
                    }}
                    className="flex-1 flex gap-1"
                  >
                    <input
                      value={editListName}
                      onChange={(e) => setEditListName(e.target.value)}
                      className="flex-1 rounded border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-xs"
                      autoFocus
                      onBlur={() => setEditingList(null)}
                    />
                  </form>
                ) : (
                  <button
                    onClick={() => setActiveListId(list.id)}
                    className={`flex items-center gap-2 flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      activeListId === list.id
                        ? "bg-[var(--accent)] text-white"
                        : "hover:bg-[var(--hover)]"
                    }`}
                  >
                    <span
                      className="relative cursor-pointer hover:scale-125 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEmojiPickerListId(
                          emojiPickerListId === list.id ? null : list.id,
                        );
                      }}
                      title="Change emoji"
                    >
                      {list.emoji || "📋"}
                      {emojiPickerListId === list.id && (
                        <div className="absolute top-6 left-0 z-50">
                          <EmojiPicker
                            onSelect={async (emoji) => {
                              try {
                                await api.updateList(list.id, { emoji });
                                fetchLists();
                              } catch {
                                toast.error("Failed to update emoji");
                              }
                              setEmojiPickerListId(null);
                            }}
                            onClose={() => setEmojiPickerListId(null)}
                          />
                        </div>
                      )}
                    </span>
                    <span className="truncate flex-1 text-left">
                      {list.name}
                    </span>
                    <span className="text-xs opacity-60">{list.taskCount}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingList(list.id);
                    setEditListName(list.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--hover)] rounded transition-all"
                  title="Rename"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleDeleteList(list.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--hover)] rounded text-red-500 transition-all"
                  title="Delete list"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </nav>
          <div className="mt-3 flex gap-1">
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="New list..."
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
            />
            <button
              onClick={handleCreateList}
              className="rounded-lg p-1 hover:bg-[var(--hover)] transition-colors text-[var(--accent)]"
              title="Create list"
            >
              <FolderPlus size={16} />
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {activeListId === null
                  ? "All Tasks"
                  : lists.find((l) => l.id === activeListId)?.name || "Tasks"}
              </h1>
              <p className="text-sm text-[var(--muted)]">
                {visibleTasks.length} task
                {visibleTasks.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--hover)] transition-colors print:hidden ${
                  !showCompleted ? "bg-[var(--hover)]" : ""
                }`}
                title={showCompleted ? "Hide completed" : "Show completed"}
              >
                {showCompleted ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button
                onClick={() =>
                  setViewMode(viewMode === "list" ? "swimlane" : "list")
                }
                className={`rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--hover)] transition-colors print:hidden`}
                title={viewMode === "list" ? "Swimlane view" : "List view"}
              >
                {viewMode === "list" ? (
                  <Columns3 size={16} />
                ) : (
                  <LayoutList size={16} />
                )}
              </button>
              <button
                onClick={handlePrint}
                className="rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--hover)] transition-colors print:hidden"
                title="Print"
              >
                <Printer size={16} />
              </button>
              <button
                onClick={openNew}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors print:hidden"
              >
                <Plus size={16} />
                New Task
              </button>
            </div>
          </div>

          {/* Search + filter bar */}
          <div className="mb-4 space-y-3 print:hidden">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-shadow"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--hover)] transition-colors ${
                  showFilters ? "bg-[var(--hover)]" : ""
                }`}
              >
                <Filter size={16} />
              </button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StatusFilter);
                    setPage(1);
                  }}
                  className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="Todo">To Do</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Done">Done</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value as PriorityFilter);
                    setPage(1);
                  }}
                  className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm"
                >
                  <option value="">All Priority</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortField);
                    setPage(1);
                  }}
                  className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm"
                >
                  <option value="createdAt">Newest First</option>
                  <option value="dueDate">Due Date</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            )}
          </div>

          {/* Task views */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2
                size={24}
                className="animate-spin text-[var(--accent)]"
              />
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--muted)]">
              <p className="text-lg font-medium mb-1">No tasks found</p>
              <p className="text-sm">
                {search || statusFilter || priorityFilter
                  ? "Try adjusting your filters."
                  : "Create your first task to get started!"}
              </p>
            </div>
          ) : viewMode === "swimlane" ? (
            /* Swimlane / Kanban view */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SWIMLANE_STATUSES.map((status) => {
                const columnTasks = visibleTasks.filter(
                  (t) => t.status === status,
                );
                return (
                  <div key={status} className="min-w-0">
                    <div
                      className={`border-t-2 ${SWIMLANE_COLORS[status]} rounded-t-lg px-3 py-2 bg-[var(--bg-secondary)]`}
                    >
                      <h3 className="text-sm font-semibold">
                        {SWIMLANE_LABELS[status]}{" "}
                        <span className="text-xs font-normal text-[var(--muted)]">
                          ({columnTasks.length})
                        </span>
                      </h3>
                    </div>
                    <div className="space-y-2 mt-2">
                      {columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          onToggleStatus={handleToggleStatus}
                        />
                      ))}
                      {columnTasks.length === 0 && (
                        <p className="text-xs text-[var(--muted)] text-center py-6">
                          No tasks
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List view */
            <>
              <div className="space-y-2">
                {visibleTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </div>

              {/* Printer-friendly view (only visible in print) */}
              <div className="hidden print:block mt-4">
                <h2 className="text-lg font-bold mb-2">
                  {activeListId === null
                    ? "All Tasks"
                    : lists.find((l) => l.id === activeListId)?.name}
                </h2>
                <ul className="space-y-1">
                  {visibleTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-gray-400">
                        {task.status === "Done" && "✓"}
                      </span>
                      <span
                        className={task.status === "Done" ? "line-through" : ""}
                      >
                        {task.title}
                        {task.dueDate && (
                          <span className="ml-2 text-xs text-gray-500">
                            (due {new Date(task.dueDate).toLocaleDateString()})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Pagination (list view only) */}
          {viewMode === "list" && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2 print:hidden">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--hover)] disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-[var(--muted)]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--hover)] disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <TaskModal
        task={editingTask}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSave}
        lists={lists}
        activeListId={activeListId}
      />
    </Layout>
  );
}
