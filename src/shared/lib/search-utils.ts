import { MIN_SEARCH_LENGTH } from '@/lib/constants';

/**
 * Проверяет, следует ли выполнять поиск для данного запроса.
 * Используется для унификации логики поиска во всех вертикалях.
 * 
 * @param searchTerm - Поисковый запрос
 * @returns true если поиск следует выполнить
 */
export function shouldPerformSearch(searchTerm: string): boolean {
  const trimmedTerm = searchTerm.trim();
  return trimmedTerm.length >= MIN_SEARCH_LENGTH || trimmedTerm.length === 0;
}

/**
 * Проверяет, нужно ли применять debounce к поисковому запросу.
 * Debounce применяется только к непустым запросам для оптимизации.
 * 
 * @param searchTerm - Поисковый запрос
 * @returns true если нужно применить debounce
 */
export function shouldDebounceSearch(searchTerm: string): boolean {
  return searchTerm.trim().length > 0;
}

/**
 * Нормализует поисковый запрос - убирает лишние пробелы.
 * 
 * @param searchTerm - Поисковый запрос
 * @returns Нормализованный запрос
 */
export function normalizeSearchTerm(searchTerm: string): string {
  return searchTerm.trim();
} 