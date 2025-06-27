import { useState } from 'react';
import { useDebounce } from 'use-debounce';
import useSWR from 'swr';
import { SEARCH_DEBOUNCE_DELAY_MS, MIN_SEARCH_LENGTH } from '@/lib/constants';

// Типы для поиска
export type SearchEntity = 'mapTemplates' | 'players' | 'families' | 'tournaments' | 'tournamentTemplates';

export interface SearchResults {
  [key: string]: any[]; // Результаты поиска по сущностям
}

export interface SearchParams {
  /** Сущность или массив сущностей для поиска */
  entities: SearchEntity | SearchEntity[];
  /** Минимальная длина запроса для выполнения поиска */
  minLength?: number;
  /** Задержка debounce в миллисекундах */
  debounceMs?: number;
  /** Включен ли поиск */
  enabled?: boolean;
}

export interface UseSearchReturn<T extends SearchEntity | SearchEntity[]> {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  results: T extends SearchEntity[] ? SearchResults : any[];
  isLoading: boolean;
  isError: any;
  mutate: () => void;
  clearSearch: () => void;
  hasSearch: boolean;
  canSearch: boolean;
}

/**
 * Универсальный хук для поиска сущностей через Meilisearch API.
 * Инкапсулирует логику debounce, SWR и обработку результатов.
 */
export function useSearch<T extends SearchEntity | SearchEntity[]>({
  entities,
  minLength = MIN_SEARCH_LENGTH,
  debounceMs = SEARCH_DEBOUNCE_DELAY_MS,
  enabled = true,
}: SearchParams): UseSearchReturn<T> {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch] = useDebounce<string>(searchTerm, debounceMs);

  // Определяем, должен ли выполняться запрос
  const shouldSearch = Boolean(enabled && 
    debouncedSearch && 
    debouncedSearch.length >= minLength);

  // Формируем ключ SWR
  const entitiesParam = Array.isArray(entities) ? entities.join(',') : entities;
  const searchKey = shouldSearch
    ? `/api/admin/search?q=${encodeURIComponent(debouncedSearch)}&entities=${entitiesParam}`
    : null;

  // SWR запрос
  const { data: rawData, error, isLoading, mutate } = useSWR(
    searchKey,
    {
      keepPreviousData: true,
      // Добавляем обработку ошибок
      onError: (error) => {
        console.error('Search error:', error);
      },
    }
  );

  // Обработка результатов
  let results: any;
  if (rawData?.data?.results) {
    if (Array.isArray(entities)) {
      // Если ищем по нескольким сущностям, возвращаем объект с результатами
      results = rawData.data.results;
    } else {
      // Если одна сущность, возвращаем массив результатов
      results = rawData.data.results[entities] || [];
    }
  } else {
    results = Array.isArray(entities) ? {} : [];
  }

  // Функция очистки поиска
  const clearSearch = () => {
    setSearchTerm('');
  };

  return {
    searchTerm,
    setSearchTerm,
    results,
    isLoading,
    isError: error,
    mutate,
    clearSearch,
    // Дополнительные полезные поля
    hasSearch: Boolean(debouncedSearch),
    canSearch: shouldSearch,
  };
} 