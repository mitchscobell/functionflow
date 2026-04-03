import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getErrorMessage } from "../lib/errorUtils";
import toast from "react-hot-toast";

/** Query key for API key queries. */
export const apiKeyKeys = {
  all: ["apiKeys"] as const,
};

/** Fetches all API keys for the authenticated user. */
export function useApiKeys() {
  return useQuery({
    queryKey: apiKeyKeys.all,
    queryFn: () => api.getApiKeys(),
  });
}

/** Provides mutations for creating and revoking API keys. */
export function useApiKeyMutations() {
  const queryClient = useQueryClient();

  const createApiKey = useMutation({
    mutationFn: (name: string) => api.createApiKey(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
      toast.success("API key created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const revokeApiKey = useMutation({
    mutationFn: (id: number) => api.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
      toast.success("API key revoked");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return { createApiKey, revokeApiKey };
}
