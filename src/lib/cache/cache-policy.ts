import 'server-only';

/**
 * =================================================================================
 * ЦЕНТРАЛИЗОВАННАЯ ПОЛИТИКА КЭШИРОВАНИЯ
 * =================================================================================
 * Этот файл - единственный источник правды для всех настроек, связанных с кэшем.
 * Цель: избежать "магических строк" и чисел, разбросанных по кодовой базе.
 *
 * - `cacheTtls`: определяет время жизни (TTL) для разных типов данных.
 * - `cacheKeys`: фабрика для генерации консистентных ключей кэша.
 * - `cacheTags`: фабрика для генерации тегов для инвалидации.
 * =================================================================================
 */

/**
 * Централизованная политика времени жизни (TTL) для ключей кэша в секундах.
 * Это обеспечивает консистентность и упрощает управление кэшированием.
 */
export const cacheTTL = {
  // Короткое время жизни для часто меняющихся списков
  'map-templates:list': 60, // 1 минута
  'tournament-templates:list': 60,
  'players:list': 120, // 2 минуты
  'families:list': 120,

  // Среднее время жизни для отдельных сущностей, которые не так часто меняются
  'map-template': 10 * 60, // 10 минут
  'tournament-template': 10 * 60,
  'player': 15 * 60, // 15 минут
  'family': 15 * 60,

  // Длинное время жизни для почти статичных данных
  'config:global': 60 * 60, // 1 час
};

// Время жизни кэша в секундах
export const cacheTtls = {
  // Короткий кэш для часто меняющихся списков
  listShort: 60 * 5, // 5 минут
  // Средний кэш для отдельных сущностей
  entityMedium: 60 * 60, // 1 час
  // Длинный кэш для редко меняющихся данных
  staticLong: 60 * 60 * 24, // 24 часа
};

/**
 * Фабрика для создания ключей кэша.
 * Гарантирует консистентность по всему приложению.
 */
export const cacheKeys = {
  // Ключи для MapTemplate
  mapTemplate: (id: string) => `map-template:${id}`,
  mapTemplatesList: (page: number, limit: number, rev: number, q?: string, status?: string, sort?: string, order?: string) => {
    const queryPart = q ? `:q${Buffer.from(q, 'utf8').toString('base64')}` : '';
    const statusPart = status ? `:s${status}` : '';
    const sortPart = sort ? `:sort${sort}` : '';
    const orderPart = order ? `:ord${order}` : '';
    return `map-templates:list:p${page}:l${limit}:rev${rev}${queryPart}${statusPart}${sortPart}${orderPart}`;
  },
  mapTemplatesRev: () => 'rev:map-templates:list',

  // Добавьте другие сущности по аналогии...
  // player: (id: string) => `player:${id}`,
  // playersList: (page: number, limit: number, rev: number) => `players:list:p${page}:l${limit}:rev${rev}`,
  // playersRev: () => 'rev:players:list',
};

/**
 * Фабрика для создания тегов для инвалидации.
 * Теги позволяют группировать ключи для массовой инвалидации.
 */
export const cacheTags = {
  // Теги для MapTemplate
  mapTemplate: (id: string) => `map-template:${id}`, // Тег для конкретной сущности
  mapTemplatesList: () => `map-templates:list`,     // Тег для всех списков
  
  // Добавьте другие сущности по аналогии...
  // player: (id: string) => `player:${id}`,
  // playersList: () => `players:list`,
}; 