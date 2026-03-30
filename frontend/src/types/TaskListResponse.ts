import type { Task } from "./Task";

/**
 * Paginated response returned by the task listing API endpoint.
 * Contains the current page of tasks along with pagination metadata.
 */
export interface TaskListResponse {
  /** Array of tasks for the current page. */
  items: Task[];

  /** Total number of tasks matching the query across all pages. */
  totalCount: number;

  /** Current page number (1-based). */
  page: number;

  /** Maximum number of items per page. */
  pageSize: number;
}
