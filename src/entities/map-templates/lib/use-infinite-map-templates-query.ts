'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useEffect, useCallback } from 'react';
import { usePacerDebounce } from '@/shared/hooks';
import { MIN_SEARCH_LENGTH, SEARCH_DEBOUNCE_DELAY_MS } from '@/lib/constants';
import type { EntityStatus } from '@/shared/types/admin';

export interface InfiniteMapTemplateParams {
  searchTerm: string;
  status: EntityStatus;
  sort?: string;
  order?: 'asc' | 'desc';
  enabled?: boolean;
}

interface MapTemplateApiResponse {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  pagination: {
    hasNext: boolean;
    page: number;
    totalPages: number;
  };
}

/**
 * Хук для infinite scroll шаблонов карт с TanStack Query useInfiniteQuery.
 * 
 * ОСОБЕННОСТИ:
 * - ✅ Автоматическая подгрузка страниц при скролле  
 * - ✅ Debounced поиск с TanStack Pacer
 * - ✅ Поддержка фильтрации и сортировки
 * - ✅ Автоматический сброс при изменении параметров
 * - ✅ Флэттенинг всех страниц в единый массив
 */
export function useInfiniteMapTemplatesQuery({
  searchTerm,
  status,
  sort = 'createdAt',
  order = 'desc',
  enabled = true,
}: InfiniteMapTemplateParams) {
  // ✅ Debounce поиска с TanStack Pacer
  const [debouncedSearchTerm, isDebouncing, cancelDebounce] = usePacerDebounce(
    searchTerm.trim(), 
    SEARCH_DEBOUNCE_DELAY_MS
  );

  // ✅ Cleanup debounce при размонтировании
  useEffect(() => {
    return () => {
      cancelDebounce();
    };
  }, [cancelDebounce]);

  // ✅ Мемоизированные параметры для стабильности queryKey
  const queryParams = useMemo(() => ({
    q: debouncedSearchTerm,
    status,
    sort,
    order,
  }), [debouncedSearchTerm, status, sort, order]);

  // ✅ ИСПРАВЛЕНО: enabled имеет строгий приоритет
  const shouldFetch = enabled ? (
    debouncedSearchTerm.length >= MIN_SEARCH_LENGTH || 
    debouncedSearchTerm.length === 0  // Только если enabled === true
  ) : false;

  // ✅ Основной infinite query
  const infiniteQuery = useInfiniteQuery<
    MapTemplateApiResponse,
    Error,
    any,
    any[],
    number
  >({
    queryKey: ['mapTemplates', 'infinite', queryParams],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }): Promise<MapTemplateApiResponse> => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '50', // Увеличенный лимит для infinite scroll
        status,
        sort,
        order,
      });
      
      // Добавляем поиск только если есть запрос
      if (debouncedSearchTerm) {
        params.set('q', debouncedSearchTerm);
      }

      const response = await fetch(`/api/admin/map-templates?${params}`, {
        signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // ✅ Приводим к ожидаемому формату
      return {
        data: result.data || [],
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 50,
        totalPages: result.totalPages || 1,
        pagination: {
          hasNext: (result.page || 1) < (result.totalPages || 1),
          page: result.page || 1,
          totalPages: result.totalPages || 1,
        },
      };
    },
    getNextPageParam: (lastPage) => {
      // ✅ Возвращаем следующую страницу или undefined если больше нет данных
      return lastPage.pagination.hasNext ? lastPage.page + 1 : undefined;
    },
    enabled: shouldFetch,
    staleTime: 0, // ✅ Всегда fresh data для админки
    gcTime: 5 * 60 * 1000, // ✅ Кэш на 5 минут
    refetchOnWindowFocus: false,
    retry: false, // ✅ Не повторяем в админке
  });

  // ✅ Flatten всех страниц в единый массив
  const allTemplates = useMemo(() => {
    return infiniteQuery.data?.pages.flatMap((page: MapTemplateApiResponse) => page.data) || [];
  }, [infiniteQuery.data]);

  // ✅ Метаданные для UI
  const totalCount = infiniteQuery.data?.pages[0]?.total || 0;
  const totalPages = infiniteQuery.data?.pages[0]?.totalPages || 0;
  const loadedPages = infiniteQuery.data?.pages.length || 0;

  // ✅ Функция для ручной подгрузки следующей страницы
  const loadMore = useCallback(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage();
    }
  }, [infiniteQuery]);

  return {
    // ✅ Основные данные
    templates: allTemplates,
    
    // ✅ Состояния загрузки
    isLoading: infiniteQuery.isLoading,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    isDebouncing,
    
    // ✅ Пагинация
    hasNextPage: infiniteQuery.hasNextPage,
    totalCount,
    totalPages,
    loadedPages,
    
    // ✅ Функции управления
    loadMore,
    refetch: infiniteQuery.refetch,
    
    // ✅ Параметры для debug
    queryParams,
    
    // ✅ Raw query object для продвинутого использования
    infiniteQuery,
  };
} 