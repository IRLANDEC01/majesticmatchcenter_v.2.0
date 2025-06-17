/**
 * @file Этот файл содержит глобальные константы, используемые в приложении.
 * Цель - централизовать магические строки и числа для упрощения поддержки.
 */

/**
 * Типы валют, используемые для призовых фондов и заработков.
 * @enum {string}
 */
export const CURRENCY_TYPES = {
  MAJESTIC_COINS: 'MajesticCoins',
  GTA_DOLLARS: 'GTADollars',
  REAL_VALUE: 'RealValue',
};

/**
 * Массив значений валют для использования в валидаторах Mongoose (enum).
 * @type {string[]}
 */
export const CURRENCY_VALUES = Object.values(CURRENCY_TYPES);

/**
 * Причины изменения рейтинга для записи в историю.
 * @enum {string}
 */
export const RATING_REASONS = {
  MAP_COMPLETION: 'MAP_COMPLETION', // Начисление за завершение карты
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT', // Ручная корректировка администратором
  INITIAL_RATING: 'INITIAL_RATING', // Начальный рейтинг при создании
};

export const TOURNAMENT_TYPES = {
  TEAM: 'team',
  FAMILY: 'family',
};

export const RATING_CHANGE_REASONS = {
  MAP_COMPLETION: 'map_completion',
  MANUAL_ADJUSTMENT: 'manual_adjustment',
}; 