import { Search, Filter } from "lucide-react";

/** Filter value for task status — empty string means no filter. */
type StatusFilter = "" | "Todo" | "InProgress" | "Done";

/** Filter value for task priority — empty string means no filter. */
type PriorityFilter = "" | "Low" | "Medium" | "High";

/** Sortable field options for the task list. */
type SortField = "createdAt" | "dueDate" | "priority";

interface TaskFiltersProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  priorityFilter: PriorityFilter;
  onPriorityChange: (value: PriorityFilter) => void;
  sortBy: SortField;
  onSortChange: (value: SortField) => void;
}

/** Search bar and collapsible filter controls for task lists. */
export default function TaskFilters({
  searchInput,
  onSearchChange,
  showFilters,
  onToggleFilters,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  sortBy,
  onSortChange,
}: TaskFiltersProps) {
  return (
    <div className="mb-4 space-y-3 print:hidden">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          />
          <input
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-shadow"
          />
        </div>
        <button
          onClick={onToggleFilters}
          className={`rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--hover)] transition-colors ${
            showFilters ? "bg-[var(--hover)]" : ""
          }`}
          title="Filters"
        >
          <Filter size={16} />
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
            className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm"
          >
            <option value="">All Status</option>
            <option value="Todo">To Do</option>
            <option value="InProgress">In Progress</option>
            <option value="Done">Done</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value as PriorityFilter)}
            className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm"
          >
            <option value="">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortField)}
            className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm"
          >
            <option value="createdAt">Newest First</option>
            <option value="dueDate">Due Date (Soonest)</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      )}
    </div>
  );
}
