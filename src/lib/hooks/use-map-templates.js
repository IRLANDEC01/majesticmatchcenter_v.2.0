import useSWR from 'swr';

/**
 * Кастомный хук для получения данных о шаблонах карт.
 * Инкапсулирует логику SWR, включая обработку поискового запроса.
 * Делает запрос только при наличии поискового термина.
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
  const key = search ? `/api/admin/map-templates?search=${search}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    {
      // Эта опция делает UX лучше: при новом поиске старые данные остаются видимыми,
      // пока не загрузятся новые.
      keepPreviousData: true,
    }
  );

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  };
} 