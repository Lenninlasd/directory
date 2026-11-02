import { QueryClient } from '@tanstack/react-query';

// Plan 001 section 5 and D-6: the only defaults are 2 automatic retries, 1 second apart (AC-6.1).
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 2, retryDelay: 1000 },
    },
  });
}
