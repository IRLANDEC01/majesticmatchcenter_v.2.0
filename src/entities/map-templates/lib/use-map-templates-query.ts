'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import { SEARCH_DEBOUNCE_DELAY_MS, MIN_SEARCH_LENGTH } from '../../../lib/constants';
import { usePacerDebounce } from '../../../shared/hooks';
import { queryKeys } from '../../../shared/types/queries';
import type { EntityStatus } from '../../../shared/types/admin';

export interface MapTemplateSearchParams {
  searchTerm: string;
  status: EntityStatus;
}

interface MapTemplateQueryParams extends MapTemplateSearchParams {
  enabled?: boolean;
}

/**
 * Хук для поиска шаблонов карт (только при наличии поискового запроса)
 * Повторяет логику старого useMapTemplatesData
 */
export function useMapTemplatesQuery({
  searchTerm,
  status,
  enabled = true,
}: MapTemplateQueryParams) {
  // Debounce для предотвращения лишних запросов (TanStack Pacer)
  const [debouncedSearchTerm, isDebouncing, cancelDebounce] = usePacerDebounce(searchTerm.trim(), SEARCH_DEBOUNCE_DELAY_MS);

  // Cleanup debounce при размонтировании компонента
  useEffect(() => {
    return () => {
      cancelDebounce();
    };
  }, [cancelDebounce]);

  // ✅ ИСПРАВЛЕНО: Мемоизированные params для стабильного query key
  const params = useMemo(() => ({ 
    status, 
    q: debouncedSearchTerm 
  }), [status, debouncedSearchTerm]);

  // ✅ ИСПРАВЛЕНО: Используем MIN_SEARCH_LENGTH константу
  const shouldFetch = enabled && debouncedSearchTerm.length >= MIN_SEARCH_LENGTH;

  return useQuery({
    queryKey: queryKeys.mapTemplates.search(params),
    queryFn: async ({ signal }) => {
      // Используем существующий API endpoint для поиска
      const searchParams = new URLSearchParams({
        q: debouncedSearchTerm,
        entities: 'mapTemplates',
        status,
      });
      
      const response = await fetch(`/api/admin/search?${searchParams}`, {
        signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data?.results?.mapTemplates || [];
    },
    enabled: shouldFetch,
    refetchOnWindowFocus: false,
    retry: false, // Не повторяем запросы поиска
  });
}
