import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchMenu, fetchMenus, interpretMessage } from './api.ts';
import type { Catalog } from './types.ts';

const MENUS_QUERY_KEY = ['store', 'menus'] as const;

export function useMenus() {
  return useQuery({ queryKey: MENUS_QUERY_KEY, queryFn: fetchMenus, staleTime: Infinity });
}

export function useMenu(id: string) {
  return useQuery({ queryKey: [...MENUS_QUERY_KEY, id], queryFn: () => fetchMenu(id), staleTime: Infinity });
}

export function useInterpretMessage() {
  return useMutation({
    mutationFn: ({ message, catalog }: { message: string; catalog: Catalog }) => interpretMessage(message, catalog),
  });
}
