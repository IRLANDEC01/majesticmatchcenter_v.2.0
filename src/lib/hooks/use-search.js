import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import useSWR from 'swr';
import { SEARCH_DEBOUNCE_DELAY_MS } from '@/lib/constants';

/**
 * Универсальный хук для поиска сущностей через Meilisearch API.
 * Инкапсулирует логику debounce, SWR и обработку результатов.
 *
 * @param {Object} params - Параметры поиска
 * @param {string|string[]} params.entities - Сущность или массив сущностей для поиска ('mapTemplates', 'players', 'families', etc.)
 * @param {number} [params.minLength=2] - Минимальная длина запроса для выполнения поиска
 * @param {number} [params.debounceMs] - Задержка debounce в миллисекундах
 * @param {boolean} [params.enabled=true] - Включен ли поиск
 * 
 * @returns {{
 *   searchTerm: string,
 *   setSearchTerm: function,
 *   results: Object|Array,
 *   isLoading: boolean,
 *   isError: any,
 *   mutate: function,
 *   clearSearch: function
 * }}
 */
export function useSearch({
  entities,
  minLength = 2,
  debounceMs = SEARCH_DEBOUNCE_DELAY_MS,
  enabled = true,
} = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, debounceMs);

  // Определяем, должен ли выполняться запрос
  const shouldSearch = enabled && 
    debouncedSearch && 
    debouncedSearch.length >= minLength;

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
  let results;
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
    hasSearch: !!debouncedSearch,
    canSearch: shouldSearch,
  };
} 