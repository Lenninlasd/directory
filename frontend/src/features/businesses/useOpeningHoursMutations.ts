import { useMutation, useQueryClient } from '@tanstack/react-query';
import { interpretOpeningHours, saveOpeningHours } from '../../api/openingHours.ts';
import { BUSINESSES_QUERY_KEY } from './queryKeys.ts';

// The only places that call the opening hours API (design D-13). Mutations do not retry by default,
// which is wanted here: each interpretation is a billed model call, and the admin decides to try again.

export function useInterpretOpeningHours() {
  return useMutation({ mutationFn: interpretOpeningHours });
}

/**
 * Saves a week, then loads the list again so the "Horario" row shows it. `onSuccess` returns the
 * invalidation, so the mutation stays pending until the list has been reloaded.
 */
export function useSaveOpeningHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveOpeningHours,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BUSINESSES_QUERY_KEY }),
  });
}
