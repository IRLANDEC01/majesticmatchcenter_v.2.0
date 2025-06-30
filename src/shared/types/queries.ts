import type { EntityStatus } from './admin';

/**
 * Базовые типы для TanStack Query v5
 */

// Типы для query keys (массивный подход v5)
export type QueryKey = readonly unknown[];

// Параметры поиска для шаблонов карт (старый - для совместимости)
export interface MapTemplateSearchParams {
  /** Поисковый запрос */
  q?: string;
  /** Статус сущностей */
  status?: EntityStatus;
}

// ✅ НОВЫЕ параметры для серверной пагинации
export interface MapTemplatePaginationParams {
  page: number;
  limit: number;
  q?: string;
  status: EntityStatus;
}

// ✅ ИСПРАВЛЕННЫЕ Query keys для Map Templates (без объектов в ключах)
export interface MapTemplateQueryKey {
  /** Все шаблоны карт */
  all: readonly ['mapTemplates'];
  /** Старый поиск (DEPRECATED) */
  search: (params: MapTemplateSearchParams) => readonly ['mapTemplates', 'search', typeof params];
  /** ✅ НОВАЯ серверная пагинация (page-based) */
  paginated: (page: number, limit: number, q: string, status: EntityStatus) => readonly ['mapTemplates', 'paginated', number, number, string, EntityStatus];
  /** Конкретный шаблон карты */
  detail: (id: string) => readonly ['mapTemplates', 'detail', string];
}

// Фабрика query keys для map templates
export const mapTemplateKeys: MapTemplateQueryKey = {
  all: ['mapTemplates'] as const,
  search: (params) => ['mapTemplates', 'search', params] as const, // DEPRECATED
  paginated: (page, limit, q, status) => ['mapTemplates', 'paginated', page, limit, q?.trim() || '', status] as const, // ✅ НОВЫЙ
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
