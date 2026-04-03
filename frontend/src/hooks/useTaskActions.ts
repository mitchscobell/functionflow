import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTaskMutations, taskKeys } from "./useTasks";
import { useCreateListInline } from "./useLists";
import { api } from "../lib/api";
import { getErrorMessage } from "../lib/errorUtils";
import { NEXT_STATUS } from "../lib/constants";
import type { Task, TaskList } from "../types";
import toast from "react-hot-toast";

/**
 * Options for configuring {@link useTaskActions}.
 */
interface UseTaskActionsOptions {
  /** Currently active list ID (pre-fills new tasks). */
  activeListId?: number | null;

  /**
   * Query params used for the current task list query.
   * When provided, enables optimistic status updates.
   */
  listParams?: Record<string, string>;
}

/**
 * Shared task CRUD actions used by DashboardPage and CalendarPage.
 * Centralises save, delete, toggle-status, and modal state so both
 * pages behave identically (confirm dialog, optimistic updates, etc.).
 */
export function useTaskActions(options: UseTaskActionsOptions = {}) {
  const { activeListId, listParams } = options;
  const queryClient = useQueryClient();
  const { createTask, updateTask, deleteTask } = useTaskMutations();
  const createListInline = useCreateListInline();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  /** Opens the task modal in edit mode. */
  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  }, []);

  /** Opens the task modal in create mode. */
  const openNew = useCallback(() => {
    setEditingTask(null);
    setModalOpen(true);
  }, []);

  /** Closes the modal and resets editing state. */
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingTask(null);
  }, []);

  /** Creates or updates a task via TanStack Query mutations. */
  const handleSave = useCallback(
    (data: Partial<Task>) => {
      if (editingTask) {
        updateTask.mutate(
          { id: editingTask.id, data },
          { onSuccess: () => toast.success("Task updated") },
        );
      } else {
        if (activeListId != null && !data.listId) {
          data = { ...data, listId: activeListId };
        }
        createTask.mutate(data);
      }
      setModalOpen(false);
      setEditingTask(null);
    },
    [editingTask, activeListId, createTask, updateTask],
  );

  /** Deletes a task after user confirmation. */
  const handleDelete = useCallback(
    (id: number) => {
      if (!window.confirm("Delete this task?")) return;
      deleteTask.mutate(id);
    },
    [deleteTask],
  );

  /**
   * Cycles a task's status using {@link NEXT_STATUS}.
   * When `listParams` is provided, performs an optimistic update to avoid scroll jump.
   */
  const handleToggleStatus = useCallback(
    async (task: Task) => {
      const newStatus = NEXT_STATUS[task.status];

      // Optimistic update when we know the query key
      if (listParams) {
        queryClient.setQueryData(
          taskKeys.list(listParams),
          (old: { items: Task[]; totalCount: number } | undefined) =>
            old
              ? {
                  ...old,
                  items: old.items.map((t) =>
                    t.id === task.id ? { ...t, status: newStatus } : t,
                  ),
                }
              : old,
        );
      }

      try {
        await api.updateTask(task.id, { status: newStatus });
        queryClient.invalidateQueries({ queryKey: ["lists"] });
        // If no optimistic update, invalidate tasks too
        if (!listParams) {
          queryClient.invalidateQueries({ queryKey: taskKeys.all });
        }
      } catch (err) {
        toast.error(getErrorMessage(err));
        if (listParams) {
          queryClient.invalidateQueries({ queryKey: taskKeys.list(listParams) });
        }
      }
    },
    [listParams, queryClient],
  );

  /** Inline list creation handler for the task modal. */
  const handleCreateListInline = useCallback(
    async (name: string, emoji?: string): Promise<TaskList | undefined> => {
      return createListInline(name, emoji);
    },
    [createListInline],
  );

  return {
    modalOpen,
    editingTask,
    openEdit,
    openNew,
    closeModal,
    handleSave,
    handleDelete,
    handleToggleStatus,
    handleCreateListInline,
  };
}
