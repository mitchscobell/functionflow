import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Task } from "../types";
import { getErrorMessage } from "../lib/errorUtils";
import toast from "react-hot-toast";

/** Query key factory for task-related queries. */
export const taskKeys = {
  all: ["tasks"] as const,
  list: (params: Record<string, string>) => ["tasks", params] as const,
};

/**
 * Fetches a paginated, filtered list of tasks.
 * Wraps `api.getTasks` with TanStack Query caching and automatic refetching.
 */
export function useTasks(params: Record<string, string>) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => api.getTasks(params),
  });
}

/**
 * Provides mutations for creating, updating, and deleting tasks.
 * Each mutation invalidates the tasks and lists queries on success.
 */
export function useTaskMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: taskKeys.all });
    queryClient.invalidateQueries({ queryKey: ["lists"] });
  };

  const createTask = useMutation({
    mutationFn: (data: Partial<Task>) => api.createTask(data),
    onSuccess: () => {
      toast.success("Task created");
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) => api.updateTask(id, data),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => api.deleteTask(id),
    onSuccess: () => {
      toast.success("Task deleted");
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return { createTask, updateTask, deleteTask };
}
