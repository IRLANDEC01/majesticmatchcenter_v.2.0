'use client';

import { useCallback, useTransition, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mapTemplateKeys, type MapTemplatePaginationParams } from '@/shared/types/queries';
import { ADMIN_TABLE_PAGE_SIZE } from '@/lib/constants';
import type { EntityStatus } from '@/shared/types/admin';

// ✅ Используем тот же интерфейс, что и в BaseRepo
interface MapTemplateWithPagination {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Хук для серверной пагинации шаблонов карт с URL-first подходом.
 * 
 * ПРЕИМУЩЕСТВА:
 * - ✅ URL как источник истины → sharable URLs
 * - ✅ useSearchParams для App Router совместимости  
 * - ✅ useTransition для неблокирующих обновлений URL
 * - ✅ Page-based кэширование с prefetching
 * - ✅ Автоматический сброс на страницу 1 при поиске
 */
export function useMapTemplatesServerPagination() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // ✅ URL → State (источник истины)
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const searchTerm = searchParams.get('q') || '';
  const status = (searchParams.get('status') as EntityStatus) || 'active';

  // ✅ ИСПРАВЛЕНИЕ: Локальный state для input с debounce
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // ✅ Синхронизация URL → local state при внешних изменениях
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // ✅ Debounced поиск (300ms задержка)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm !== searchTerm) {
        // Обновляем URL только если значение изменилось
        updateURL({ 
          q: localSearchTerm.trim() || null,
          page: '1' 
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Основной запрос текущей страницы (без объекта в queryKey)
  const query = useQuery({
    queryKey: mapTemplateKeys.paginated(currentPage, ADMIN_TABLE_PAGE_SIZE, searchTerm, status),
    queryFn: async (): Promise<MapTemplateWithPagination> => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ADMIN_TABLE_PAGE_SIZE.toString(),
        status,
      });
      
      if (searchTerm) {
        params.set('q', searchTerm);
      }

      const response = await fetch(`/api/admin/map-templates?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 0, // ✅ Всегда refetch для админки (fresh data)
    gcTime: 5 * 60 * 1000, // ✅ TanStack Query v5: cacheTime → gcTime
    retry: false, // ✅ Не повторяем при ошибках в админке
  });

  // ✅ ИСПРАВЛЕНИЕ: Smart prefetching с очисткой и проверкой isFetching
  const prefetchNextPage = useCallback(() => {
    // Не префетчим если идет загрузка или нет данных
    if (query.isFetching || !query.data?.totalPages) {
      return;
    }

    const hasNext = !!query.data && currentPage < query.data.totalPages;
    if (hasNext) {
      queryClient.prefetchQuery({
        queryKey: mapTemplateKeys.paginated(currentPage + 1, ADMIN_TABLE_PAGE_SIZE, searchTerm, status),
        queryFn: async () => {
          const params = new URLSearchParams({
            page: (currentPage + 1).toString(),
            limit: ADMIN_TABLE_PAGE_SIZE.toString(),
            status,
          });
          
          if (searchTerm) {
            params.set('q', searchTerm);
          }

          const response = await fetch(`/api/admin/map-templates?${params}`);
          return response.ok ? response.json() : null;
        },
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
      });
    }
  }, [currentPage, searchTerm, status, query.data, query.isFetching, queryClient]);

  // ✅ Очистка префетч при смене фильтров/поиска  
  useEffect(() => {
    // Отменяем все pending префетч-запросы при смене фильтров
    queryClient.cancelQueries({ queryKey: ['mapTemplates', 'paginated'] });
  }, [searchTerm, status, queryClient]);

  // ✅ Вызываем prefetch при получении данных
  useEffect(() => {
    if (query.data && !query.isLoading && !query.isFetching) {
      prefetchNextPage();
    }
  }, [query.data, query.isLoading, query.isFetching, prefetchNextPage]);

  // ✅ State → URL (неблокирующие обновления)
  const updateURL = useCallback((params: Record<string, string | null>) => {
    startTransition(() => {
      const newParams = new URLSearchParams(searchParams);
      
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });

      // ✅ scroll: false → не прыгаем наверх при смене страницы
      router.replace(`?${newParams.toString()}`, { scroll: false });
    });
  }, [searchParams, router]);

  // ✅ Функции навигации
  const updatePage = useCallback((page: number) => {
    updateURL({ page: page.toString() });
  }, [updateURL]);

  const updateSearch = useCallback((q: string) => {
    // ✅ ИСПРАВЛЕНИЕ: Обновляем локальный state, URL обновится через debounce
    setLocalSearchTerm(q);
  }, []);

  const updateSearchImmediate = useCallback((q: string) => {
    // ✅ Немедленное обновление URL (для кнопок, фильтров)
    setLocalSearchTerm(q);
    updateURL({ 
      q: q.trim() || null,
      page: '1' 
    });
  }, [updateURL]);

  const updateStatus = useCallback((newStatus: EntityStatus) => {
    // ✅ При смене статуса сбрасываем на страницу 1
    updateURL({ 
      status: newStatus, 
      page: '1' 
    });
  }, [updateURL]);

  return {
    // ✅ Данные и состояние
    templates: query.data?.data || [],
    pagination: query.data ? {
      page: query.data.page,
      limit: query.data.limit,
      total: query.data.total,
      totalPages: query.data.totalPages,
      hasNext: currentPage < query.data.totalPages,
      hasPrev: currentPage > 1,
    } : undefined,
    isLoading: query.isLoading,
    error: query.error,
    isPending, // transition pending state
    
    // ✅ Текущие параметры
    currentPage,
    searchTerm, // ✅ URL search term (committed)
    localSearchTerm, // ✅ НОВОЕ: Локальный input value (для связывания с input)
    status,
    
    // ✅ Функции навигации
    updatePage,
    updateSearch, // ✅ Для input onChange (с debounce)
    updateSearchImmediate, // ✅ НОВОЕ: Для кнопок/фильтров (без debounce)
    updateStatus,
    
    // ✅ Утилиты
    refetch: query.refetch,
    mutate: () => queryClient.invalidateQueries({ 
      queryKey: ['mapTemplates'] 
    }),
  };
} 