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

/**
 * Политика именования тегов для инвалидации кэша.
 * Использование консистентных тегов - ключ к эффективной ревалидации.
 *
 * Формат: `entity` или `entity:id`
 */
export const cacheTags = {
  // Теги для списков
  mapTemplateList: () => 'map-templates:list',
  tournamentTemplateList: () => 'tournament-templates:list',
  playerList: () => 'players:list',
  familyList: () => 'families:list',

  // Теги для отдельных сущностей
  mapTemplate: (id: string) => `map-template:${id}`,
  tournamentTemplate: (id: string) => `tournament-template:${id}`,
  player: (id: string) => `player:${id}`,
  family: (id: string) => `family:${id}`,
}; 