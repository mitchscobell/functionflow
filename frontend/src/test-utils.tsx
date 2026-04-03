import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { getErrorMessage } from "./lib/errorUtils";
import toast from "react-hot-toast";
import type { ReactNode } from "react";

/** Creates a fresh QueryClient configured for tests (no retries, no gc). */
export function createTestQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => toast.error(getErrorMessage(error)),
    }),
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

/** Wraps children in a QueryClientProvider with a test-specific client. */
export function TestQueryProvider({ children }: { children: ReactNode }) {
  const client = createTestQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
