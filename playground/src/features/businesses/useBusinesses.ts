import { useQuery } from '@tanstack/react-query';
import { fetchBusinesses } from '../../api/businesses.ts';
import { BUSINESSES_QUERY_KEY } from './queryKeys.ts';

// The only place that calls the businesses API (plan 001 section 5).
export function useBusinesses() {
  return useQuery({ queryKey: BUSINESSES_QUERY_KEY, queryFn: fetchBusinesses });
}
