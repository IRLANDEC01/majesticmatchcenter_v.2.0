// Переиспользуемые хуки

// TanStack виртуализация - универсальный хук для любых таблиц
export { 
  useMaybeVirtualizer, 
  useMapTemplatesVirtualizer,
  usePlayersVirtualizer,
  useTournamentsVirtualizer,
  useAdminTableVirtualizer,
  usePublicRatingsVirtualizer,
  useImageTableVirtualizer,
  VirtualizerPresets,
  type VirtualizerConfig,
  type VirtualizerResult 
} from './use-maybe-virtualizer';

// ⚠️ ВНИМАНИЕ: Хук использует новый TanStack Pacer (вместо use-debounce)
/** @deprecated Рассмотрите использование TanStack Query вместо SWR для новых компонентов */
export { useSearch } from './use-search';

// TanStack Pacer хуки для debounce/throttle
export { usePacerDebounce, usePacerDebouncedCallback } from './use-pacer-debounce';

// Универсальный хук для server-side ошибок в формах
export { useServerErrors, type ServerErrors } from './use-server-errors';