import type { EntityStatus } from './admin';

/**
 * Базовые типы для TanStack Query v5
 */

// Типы для query keys (массивный подход v5)
export type QueryKey = readonly unknown[];

// Параметры поиска для шаблонов карт
export interface MapTemplateSearchParams {
  /** Поисковый запрос */
  q?: string;
  /** Статус сущностей */
  status?: EntityStatus;
}

// Query keys для Map Templates
export interface MapTemplateQueryKey {
  /** Все шаблоны карт */
  all: readonly ['mapTemplates'];
  /** Поиск шаблонов карт */
  search: (params: MapTemplateSearchParams) => readonly ['mapTemplates', 'search', typeof params];
  /** Конкретный шаблон карты */
  detail: (id: string) => readonly ['mapTemplates', 'detail', string];
}

// Фабрика query keys для map templates
export const mapTemplateKeys: MapTemplateQueryKey = {
  all: ['mapTemplates'] as const,
  search: (params) => ['mapTemplates', 'search', params] as const,
  detail: (id) => ['mapTemplates', 'detail', id] as const,
};

// Общий тип для всех query keys (пока только Map Templates)
export type AllQueryKeys = 
  | typeof mapTemplateKeys.all
  | ReturnType<typeof mapTemplateKeys.search>
  | ReturnType<typeof mapTemplateKeys.detail>;

/**
 * Центральный объект для query keys в приложении.
 * Пока содержит только Map Templates - эталонную вертикаль.
 */
export const queryKeys = {
  mapTemplates: mapTemplateKeys,
  // TODO: Добавить другие сущности после завершения миграции Map Templates
} as const;
