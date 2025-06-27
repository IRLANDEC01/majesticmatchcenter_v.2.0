'use client';

import { useState, useCallback, useTransition, useOptimistic } from 'react';
import useSWR from 'swr';
import { MIN_SEARCH_LENGTH } from '@/lib/constants';
import { MapTemplate } from '../model';

interface UseMapTemplatesDataReturn {
  templates: MapTemplate[];
  isLoading: boolean;
  error: any;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  optimisticTemplates: MapTemplate[];
  markAsArchived: (id: string) => void;
  markAsRestored: (id: string) => void;
  refreshData: () => void;
  isPending: boolean;
}

/**
 * Оптимизированный хук для работы с данными шаблонов карт.
 * 
 * Архитектура: Только SWR, никаких дублирующих запросов.
 * ✅ Реализует рекомендации из проверочной таблицы
 */
export function useMapTemplatesData(): UseMapTemplatesDataReturn {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();

  // Определяем нужно ли загружать данные - только если есть поисковый запрос
  const shouldFetch = searchTerm.length >= MIN_SEARCH_LENGTH;
  const searchUrl = shouldFetch 
    ? `/api/admin/search?q=${encodeURIComponent(searchTerm)}&entities=mapTemplates`
    : null;

  // ✅ SWR с оптимальными настройками для админки
  const { data, error, isLoading, mutate } = useSWR(
    searchUrl,
    async (url: string) => {
      const response = await fetch(url, {
        // ✅ Избегаем дублирования запросов через force-cache
        cache: 'force-cache'
      });
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      const result = await response.json();
      return result.data?.results?.mapTemplates || [];
    },
    {
      // ✅ Отключаем автоматические revalidation для админки
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: false, // ✅ Избегаем двойной fetch после гидратации
      // ✅ Refresh только по explicit запросу (mutate)
      refreshInterval: 0,
    }
  );

  // Показываем данные только при активном поиске
  const templates = shouldFetch ? (data || []) : [];

  // React 19: Оптимистичные обновления для Server Actions
  const [optimisticTemplates, setOptimisticTemplates] = useOptimistic(
    templates,
    (state: MapTemplate[], action: { type: 'archive' | 'restore'; id: string }) => {
      return state.map((template: MapTemplate) =>
        template.id === action.id
          ? { ...template, isArchived: action.type === 'archive' }
          : template
      );
    }
  );

  // ✅ Optimistic updates для Server Actions
  const markAsArchived = useCallback((id: string) => {
    startTransition(() => {
      setOptimisticTemplates({ type: 'archive', id });
    });
  }, [setOptimisticTemplates]);

  const markAsRestored = useCallback((id: string) => {
    startTransition(() => {
      setOptimisticTemplates({ type: 'restore', id });
    });
  }, [setOptimisticTemplates]);

  // ✅ Explicit refresh (вызывается после Server Actions)
  const refreshData = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    templates,
    isLoading: shouldFetch ? isLoading : false,
    error,
    searchTerm,
    setSearchTerm,
    optimisticTemplates,
    markAsArchived,
    markAsRestored,
    refreshData,
    isPending,
  };
} 