'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { Input } from '@/shared/ui/input';
import { X, Search } from 'lucide-react';
import { useSearch, type SearchEntity } from '@/shared/hooks/use-search';
import { MIN_SEARCH_LENGTH } from '@/lib/constants';

interface SearchMeta {
  isLoading: boolean;
  isError: any;
  hasSearch: boolean;
  canSearch: boolean;
  mutate: () => void;
}

interface EntitySearchProps {
  /** Сущности для поиска */
  entities: SearchEntity | SearchEntity[];
  /** Плейсхолдер для поля ввода */
  placeholder?: string;
  /** Коллбек, вызываемый при получении результатов поиска */
  onResults?: (results: any[] | Record<string, any[]>, meta: SearchMeta) => void;
  /** Коллбек, вызываемый при изменении поискового запроса */
  onSearchChange?: (term: string, meta: { hasSearch: boolean; canSearch: boolean }) => void;
  /** Дополнительные CSS классы */
  className?: string;
  /** Минимальная длина запроса для поиска */
  minLength?: number;
  /** Включен ли поиск */
  enabled?: boolean;
}

/**
 * Полностью интегрированный компонент поиска сущностей.
 * Объединяет UI компонент и логику поиска через Meilisearch.
 */
export function EntitySearch({
  entities,
  placeholder,
  onResults,
  onSearchChange,
  className = '',
  minLength = MIN_SEARCH_LENGTH,
  enabled = true,
}: EntitySearchProps) {
  // Используем useRef для стабильных ссылок и предотвращения лишних вызовов
  const onResultsRef = useRef(onResults);
  const onSearchChangeRef = useRef(onSearchChange);
  const previousResultsRef = useRef<any>(null);
  const previousMetaRef = useRef<SearchMeta | null>(null);

  // Обновляем рефы без триггера ре-рендеров
  onResultsRef.current = onResults;
  onSearchChangeRef.current = onSearchChange;

  // Автоматически генерируем placeholder на основе типа сущностей
  const defaultPlaceholder = React.useMemo(() => {
    if (placeholder) return placeholder;
    
    if (Array.isArray(entities)) {
      return `Поиск по ${entities.length} типам...`;
    }
    
    const entityNames: Record<SearchEntity, string> = {
      mapTemplates: 'шаблонам карт',
      tournamentTemplates: 'шаблонам турниров', 
      players: 'игрокам',
      families: 'семьям',
      tournaments: 'турнирам',
    };
    
    return `Поиск по ${entityNames[entities] || entities}...`;
  }, [entities, placeholder]);

  // Используем универсальный хук поиска
  const {
    searchTerm,
    setSearchTerm,
    results,
    isLoading,
    isError,
    mutate,
    clearSearch,
    hasSearch,
    canSearch,
  } = useSearch({
    entities,
    minLength,
    enabled,
  });

  // Вызываем коллбеки только при реальном изменении данных
  useEffect(() => {
    const currentMeta: SearchMeta = { isLoading, isError, hasSearch, canSearch, mutate };
    
    // Проверяем, действительно ли изменились результаты или мета-данные
    const resultsChanged = JSON.stringify(previousResultsRef.current) !== JSON.stringify(results);
    const metaChanged = JSON.stringify(previousMetaRef.current) !== JSON.stringify(currentMeta);
    
    if ((resultsChanged || metaChanged) && onResultsRef.current) {
      onResultsRef.current(results, currentMeta);
      previousResultsRef.current = results;
      previousMetaRef.current = currentMeta;
    }
  }, [results, isLoading, isError, hasSearch, canSearch, mutate]);

  // Для onSearchChange используем отдельный effect
  const previousSearchTermRef = useRef(searchTerm);
  useEffect(() => {
    if (previousSearchTermRef.current !== searchTerm && onSearchChangeRef.current) {
      onSearchChangeRef.current(searchTerm, { hasSearch, canSearch });
      previousSearchTermRef.current = searchTerm;
    }
  }, [searchTerm, hasSearch, canSearch]);

  const handleClear = useCallback(() => {
    clearSearch();
    // Вызываем коллбек для очистки только если есть активные результаты
    if (onResultsRef.current && (hasSearch || previousResultsRef.current)) {
      const emptyResults = Array.isArray(entities) ? {} : [];
      const emptyMeta: SearchMeta = { 
        isLoading: false, 
        isError: null, 
        hasSearch: false, 
        canSearch: false,
        mutate
      };
      onResultsRef.current(emptyResults, emptyMeta);
      previousResultsRef.current = emptyResults;
      previousMetaRef.current = emptyMeta;
    }
  }, [clearSearch, entities, hasSearch, mutate]);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        placeholder={defaultPlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10 pr-10"
        disabled={!enabled}
      />
      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex cursor-pointer items-center rounded-r-md px-3 text-muted-foreground transition-colors hover:text-primary"
          aria-label="Очистить поиск"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Дополнительный упрощенный хук для тех, кто хочет использовать только логику без UI
export { useSearch } from '@/shared/hooks/use-search';

export default EntitySearch; 