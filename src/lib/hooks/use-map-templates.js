import useSWR from 'swr';

/**
 * Кастомный хук для получения данных о шаблонах карт через новый API поиска.
 *
 * @param {object} params - Объект с параметрами для запроса.
 * @param {string} [params.search=''] - Поисковый запрос.
 * @returns {{
 *   data: Array<any> | undefined,
 *   isLoading: boolean,
 *   isError: any,
 *   mutate: import('swr').KeyedMutator<any>
 * }}
 */
export function useMapTemplates({ search = '' } = {}) {
  // Ключ SWR. Если search пустой, ключ будет null, и SWR не будет делать запрос.
  const key =
    search
      ? `/api/admin/search?q=${encodeURIComponent(search)}&entities=mapTemplates`
      : null;

  const { data: rawData, error, isLoading, mutate } = useSWR(
    key,
    {
      // Эта опция делает UX лучше: при новом поиске старые данные остаются видимыми,
      // пока не загрузятся новые.
      keepPreviousData: true,
    }
  );

  // Извлекаем данные из вложенной структуры
  const data = rawData?.data?.results?.mapTemplates;

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  };
} 