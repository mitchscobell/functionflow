import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTasks, taskKeys, useTaskMutations } from "../hooks/useTasks";
import { useLists, useListMutations, useCreateListInline } from "../hooks/useLists";
import { api } from "../lib/api";
import { getErrorMessage } from "../lib/errorUtils";
import type { Task } from "../types";
import Layout from "../components/Layout";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";
import ListSidebar from "../components/ListSidebar";
import TaskFilters from "../components/TaskFilters";
import { Plus, Loader2, LayoutList, Columns3, Eye, EyeOff, Printer } from "lucide-react";
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
  // --- Local UI state ---
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("");
  const [sortBy, setSortBy] = useState<SortField>("dueDate");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showCompleted, setShowCompleted] = useState(true);
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<string>("");
  const [newListName, setNewListName] = useState("");
  const [editingList, setEditingList] = useState<number | null>(null);
  const [editListName, setEditListName] = useState("");
  const [emojiPickerListId, setEmojiPickerListId] = useState<number | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  const pageSize = 100;

  // --- TanStack Query hooks ---
  const queryClient = useQueryClient();

  const params = useMemo(() => {
    const p: Record<string, string> = {
      page: String(page),
      pageSize: String(pageSize),
      sortBy,
      sortDir: sortBy === "dueDate" ? "asc" : "desc",
    };
    if (search) p.search = search;
    if (statusFilter) p.status = statusFilter;
    if (priorityFilter) p.priority = priorityFilter;
    if (activeTag) p.tag = activeTag;
    return p;
  }, [page, sortBy, search, statusFilter, priorityFilter, activeTag]);

  const { data: taskData, isLoading: loading } = useTasks(params);
  const tasks = taskData?.items ?? [];
  const totalCount = taskData?.totalCount ?? 0;

  const { data: lists = [] } = useLists();
  const { createTask, updateTask, deleteTask } = useTaskMutations();
  const { createList, updateList, deleteList: deleteListMutation } = useListMutations();
  const createListInline = useCreateListInline();

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
      if (activeListId !== null && !data.listId) {
        data = { ...data, listId: activeListId };
      }
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
    if (!window.confirm("Delete this task?")) return;
    deleteTask.mutate(id);
  };

  /**
   * Cycles a task's status: Todo → InProgress → Done → Todo.
   * Uses optimistic update to avoid scroll jump.
   * @param task - The task whose status should be toggled.
   */
  const handleToggleStatus = async (task: Task) => {
    const next: Record<string, string> = {
      Todo: "InProgress",
      InProgress: "Done",
      Done: "Todo",
    };
    const newStatus = next[task.status] as Task["status"];
    // Optimistic update — avoid scroll jump from full refetch
    queryClient.setQueryData(taskKeys.list(params), (old: typeof taskData) =>
      old
        ? {
            ...old,
            items: old.items.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)),
          }
        : old,
    );
    try {
      await api.updateTask(task.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    } catch (err) {
      toast.error(getErrorMessage(err));
      queryClient.invalidateQueries({ queryKey: taskKeys.list(params) });
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
  const handleCreateList = () => {
    const name = newListName.trim();
    if (!name) return;
    createList.mutate({ name });
    setNewListName("");
  };

  /**
   * Deletes a task list. Tasks in the list are moved to the inbox.
   * @param id - The list's database ID.
   */
  const handleDeleteList = (id: number) => {
    if (activeListId === id) setActiveListId(null);
    deleteListMutation.mutate(id);
  };

  /**
   * Renames a task list currently being edited inline.
   * @param id - The list's database ID.
   */
  const handleRenameList = (id: number) => {
    const name = editListName.trim();
    if (!name) return;
    updateList.mutate({ id, data: { name } });
    setEditingList(null);
    setEditListName("");
  };

  /** Tasks filtered to the currently selected list (or all tasks if no list is active). */
  const filteredByList =
    activeListId === null ? tasks : tasks.filter((t) => t.listId === activeListId);

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
      {/* Mobile list selector */}
      <div className="md:hidden mb-4 print:hidden">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
          Lists
        </label>
        <select
          value={activeListId ?? ""}
          onChange={(e) => setActiveListId(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option value="">📋 All Tasks</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.emoji ? `${l.emoji} ` : "📋 "}
              {l.name} ({l.taskCount})
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">
        {/* List sidebar */}
        <ListSidebar
          lists={lists}
          activeListId={activeListId}
          onSelectList={setActiveListId}
          onRenameList={handleRenameList}
          onDeleteList={handleDeleteList}
          onUpdateEmoji={(id, emoji) => updateList.mutate({ id, data: { emoji } })}
          onCreateList={handleCreateList}
          editingList={editingList}
          editListName={editListName}
          onEditListChange={setEditListName}
          onStartEditing={(id, name) => {
            setEditingList(id);
            setEditListName(name);
          }}
          onStopEditing={() => setEditingList(null)}
          emojiPickerListId={emojiPickerListId}
          onToggleEmojiPicker={setEmojiPickerListId}
          newListName={newListName}
          onNewListNameChange={setNewListName}
        />

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
                onClick={() => setViewMode(viewMode === "list" ? "swimlane" : "list")}
                className={`rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--hover)] transition-colors print:hidden`}
                title={viewMode === "list" ? "Swimlane view" : "List view"}
              >
                {viewMode === "list" ? <Columns3 size={16} /> : <LayoutList size={16} />}
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
          <TaskFilters
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            statusFilter={statusFilter}
            onStatusChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            priorityFilter={priorityFilter}
            onPriorityChange={(v) => {
              setPriorityFilter(v);
              setPage(1);
            }}
            sortBy={sortBy}
            onSortChange={(v) => {
              setSortBy(v);
              setPage(1);
            }}
          />

          {/* Active tag filter badge */}
          {activeTag && (
            <div className="mb-3 flex items-center gap-2 print:hidden">
              <span className="text-sm text-[var(--muted)]">Filtered by tag:</span>
              <button
                onClick={() => {
                  setActiveTag("");
                  setPage(1);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                {activeTag} ✕
              </button>
            </div>
          )}

          {/* Task views */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
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
                const columnTasks = visibleTasks.filter((t) => t.status === status);
                const isCollapsed = collapsedColumns.has(status);
                return (
                  <div key={status} className="min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedColumns((prev) => {
                          const next = new Set(prev);
                          if (next.has(status)) next.delete(status);
                          else next.add(status);
                          return next;
                        })
                      }
                      className={`w-full text-left border-t-2 ${SWIMLANE_COLORS[status]} rounded-t-lg px-3 py-2 bg-[var(--bg-secondary)] md:cursor-default`}
                    >
                      <h3 className="text-sm font-semibold flex items-center gap-1">
                        <span className="md:hidden text-xs">{isCollapsed ? "▶" : "▼"}</span>
                        {SWIMLANE_LABELS[status]}{" "}
                        <span className="text-xs font-normal text-[var(--muted)]">
                          ({columnTasks.length})
                        </span>
                      </h3>
                    </button>
                    {!isCollapsed && (
                      <div className="space-y-2 mt-2">
                        {columnTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onToggleStatus={handleToggleStatus}
                            onTagClick={(tag) => {
                              setActiveTag(tag);
                              setPage(1);
                            }}
                          />
                        ))}
                        {columnTasks.length === 0 && (
                          <p className="text-xs text-[var(--muted)] text-center py-6">No tasks</p>
                        )}
                      </div>
                    )}
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
                    onTagClick={(tag) => {
                      setActiveTag(tag);
                      setPage(1);
                    }}
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
                    <li key={task.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-gray-400">
                        {task.status === "Done" && "✓"}
                      </span>
                      <span className={task.status === "Done" ? "line-through" : ""}>
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
        onCreateList={createListInline}
      />
    </Layout>
  );
}
