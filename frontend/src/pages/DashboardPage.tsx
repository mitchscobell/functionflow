import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type { Task, TaskListResponse } from "../types";
import Layout from "../components/Layout";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

type StatusFilter = "" | "Todo" | "InProgress" | "Done";
type PriorityFilter = "" | "Low" | "Medium" | "High";
type SortField = "createdAt" | "dueDate" | "priority";

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

  const pageSize = 20;

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
  }, [fetchTasks]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

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
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to save task");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteTask(id);
      toast.success("Task deleted");
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete task");
    }
  };

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

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const openNew = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Layout>
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-[var(--muted)]">
            {totalCount} task{totalCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Plus size={16} />
          New Task
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="mb-4 space-y-3">
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

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--muted)]">
          <p className="text-lg font-medium mb-1">No tasks found</p>
          <p className="text-sm">
            {search || statusFilter || priorityFilter
              ? "Try adjusting your filters."
              : "Create your first task to get started!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
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

      {/* Modal */}
      <TaskModal
        task={editingTask}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSave}
      />
    </Layout>
  );
}
