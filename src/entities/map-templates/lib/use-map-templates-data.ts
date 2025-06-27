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
 * Современный хук для работы с данными шаблонов карт.
 * Использует React 19 паттерны: useOptimistic, useTransition.
 */
export function useMapTemplatesData(): UseMapTemplatesDataReturn {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();

  // Определяем нужно ли загружать данные - только если есть поисковый запрос
  const shouldFetch = searchTerm.length >= MIN_SEARCH_LENGTH;
  const searchUrl = shouldFetch 
    ? `/api/admin/search?q=${encodeURIComponent(searchTerm)}&entities=mapTemplates`
    : null;

  // SWR для загрузки данных поиска
  const { data, error, isLoading, mutate } = useSWR(
    searchUrl,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      const result = await response.json();
      return result.data?.results?.mapTemplates || [];
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Если поиск не активен, показываем пустой массив
  const templates = shouldFetch ? (data || []) : [];

  // Оптимистичные обновления
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

  // Функция для архивации шаблона
  const markAsArchived = useCallback((id: string) => {
    startTransition(() => {
      setOptimisticTemplates({ type: 'archive', id });
    });
  }, [setOptimisticTemplates]);

  // Функция для восстановления шаблона
  const markAsRestored = useCallback((id: string) => {
    startTransition(() => {
      setOptimisticTemplates({ type: 'restore', id });
    });
  }, [setOptimisticTemplates]);

  // Функция для обновления данных
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