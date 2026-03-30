/**
 * A named collection of tasks belonging to a user.
 * Lists allow grouping tasks by project, context, or category.
 * Each list can have an emoji icon and a color theme.
 */
export interface TaskList {
  /** Unique database identifier for the list. */
  id: number;

  /** User-chosen name for the list (max 100 chars). */
  name: string;

  /** Single emoji character displayed next to the list name. */
  emoji?: string;

  /** Gradient/color theme key for the list background. */
  color: string;

  /** Display order within the user's sidebar (lower = higher). */
  sortOrder: number;

  /** Number of tasks currently in this list. */
  taskCount: number;

  /** ISO 8601 timestamp of when the list was created. */
  createdAt: string;
}
