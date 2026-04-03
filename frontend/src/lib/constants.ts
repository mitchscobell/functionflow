import type { Task } from "../types";

// ── Status ──

/** All valid task status values in workflow order. */
export const STATUSES = ["Todo", "InProgress", "Done"] as const;

/** Human-readable labels for each task status. */
export const STATUS_LABELS: Record<Task["status"], string> = {
  Todo: "To Do",
  InProgress: "In Progress",
  Done: "Done",
};

/** Status cycle for one-click toggling: Todo → InProgress → Done → Todo. */
export const NEXT_STATUS: Record<Task["status"], Task["status"]> = {
  Todo: "InProgress",
  InProgress: "Done",
  Done: "Todo",
};

/** Dropdown options for status filter/select elements. */
export const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

// ── Priority ──

/** All valid task priority values. */
export const PRIORITIES = ["High", "Medium", "Low"] as const;

/** Dropdown options for priority filter/select elements. */
export const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({ value: p, label: p }));

// ── Filter / Sort Types ──

/** Filter value for task status — empty string means no filter. */
export type StatusFilter = "" | Task["status"];

/** Filter value for task priority — empty string means no filter. */
export type PriorityFilter = "" | Task["priority"];

/** Sortable field options for the task list. */
export type SortField = "createdAt" | "dueDate" | "priority";

// ── Swimlane ──

/** Border color classes for each swimlane column header. */
export const SWIMLANE_COLORS: Record<Task["status"], string> = {
  Todo: "border-gray-400",
  InProgress: "border-blue-500",
  Done: "border-[var(--success)]",
};

// ── Sorting ──

/** Comparator that sorts Done tasks to the bottom of a list. */
export function sortDoneToBottom(a: Task, b: Task): number {
  if (a.status === "Done" && b.status !== "Done") return 1;
  if (a.status !== "Done" && b.status === "Done") return -1;
  return 0;
}

// ── Validation Limits (must match backend ValidationConstants.cs) ──

export const LIMITS = {
  TITLE: 200,
  DESCRIPTION: 2000,
  NOTES: 10000,
  URL: 2048,
  MAX_TAGS: 10,
  LIST_NAME: 100,
  DISPLAY_NAME: 100,
  AUTH_CODE: 6,
} as const;

// ── localStorage Keys ──

export const STORAGE_KEYS = {
  TOKEN: "token",
  USER: "user",
  IS_DEMO: "isDemo",
  THEME: "theme",
  CUSTOM_COLORS: "customThemeColors",
} as const;
