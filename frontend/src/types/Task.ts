/**
 * A single actionable item that belongs to a user and optionally
 * to a {@link TaskList}. Represents the core unit of work in the application.
 */
export interface Task {
  /** Unique database identifier for the task. */
  id: number;

  /** Short summary of what needs to be done (max 200 chars). */
  title: string;

  /** Longer details about the task (max 2000 chars, optional). */
  description?: string;

  /** Optional free-form notes (markdown, checklists, etc.). */
  notes?: string;

  /** Optional related URL (documentation link, ticket, reference). */
  url?: string;

  /** ISO 8601 date string for the task deadline, if set. */
  dueDate?: string;

  /** Urgency level used for sorting and visual indicators. */
  priority: "Low" | "Medium" | "High";

  /** Current workflow state of the task. */
  status: "Todo" | "InProgress" | "Done";

  /** User-defined labels for categorization and filtering. */
  tags: string[];

  /** Optional parent list ID. Null means the task lives in the default inbox. */
  listId?: number;

  /** ISO 8601 timestamp of when the task was created. */
  createdAt: string;

  /** ISO 8601 timestamp of the last modification. */
  updatedAt: string;
}
