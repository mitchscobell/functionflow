import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getErrorMessage } from "../lib/errorUtils";
import toast from "react-hot-toast";
import type { TaskList } from "../types";

/** Query key for list-related queries. */
export const listKeys = {
  all: ["lists"] as const,
};

/** Fetches all task lists for the authenticated user. */
export function useLists() {
  return useQuery({
    queryKey: listKeys.all,
    queryFn: () => api.getLists(),
  });
}

/** Provides mutations for creating, updating, and deleting lists. */
export function useListMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: listKeys.all });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const createList = useMutation({
    mutationFn: (data: { name: string; emoji?: string; color?: string }) => api.createList(data),
    onSuccess: () => {
      toast.success("List created");
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateList = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; emoji?: string; color?: string; sortOrder?: number };
    }) => api.updateList(id, data),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteList = useMutation({
    mutationFn: (id: number) => api.deleteList(id),
    onSuccess: () => {
      toast.success("List deleted — tasks moved to Inbox");
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return { createList, updateList, deleteList };
}

/**
 * Creates a new list inline (e.g. from the task modal) and returns it.
 * Returns the created list or undefined on failure.
 */
export function useCreateListInline() {
  const queryClient = useQueryClient();

  return async (name: string, emoji?: string): Promise<TaskList | undefined> => {
    try {
      const created = await api.createList({ name, emoji });
      queryClient.invalidateQueries({ queryKey: listKeys.all });
      toast.success("List created");
      return created;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return undefined;
    }
  };
}
