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
  MAP_COMPLETION: 'map_completion', // Начисление за завершение карты
  MANUAL_ADJUSTMENT: 'manual_adjustment', // Ручная корректировка администратором
  INITIAL_RATING: 'initial_rating', // Начальный рейтинг при создании
};

/**
 * Типы участников турнира (устарело, будет заменено на более гибкую систему).
 * @deprecated
 * @enum {string}
 */
export const TOURNAMENT_TYPES = {
  TEAM: 'team',
  FAMILY: 'family',
};

/**
 * Типы турниров в зависимости от логики определения победителя.
 * @enum {string}
 */
export const TOURNAMENT_SCORING_TYPES = {
  MANUAL_SELECTION: 'MANUAL_SELECTION', // Победитель определяется администратором вручную
  LEADERBOARD: 'LEADERBOARD', // Победитель определяется по очкам в таблице лидеров
};

/**
 * Массив значений типов подсчета очков в турнирах для использования в валидаторах Mongoose (enum).
 * @type {string[]}
 */
export const TOURNAMENT_SCORING_VALUES = Object.values(TOURNAMENT_SCORING_TYPES);

/**
 * Роли участников внутри семьи.
 * @enum {string}
 */
export const FAMILY_MEMBER_ROLES = {
  OWNER: 'owner', // Владелец, имеет все права
  CALLER: 'caller', // Капитан, координирует команду
  SCOUTER: 'scouter', // Разведчик, анализирует противников
};

/**
 * Массив значений ролей для использования в валидаторах Mongoose (enum).
 * @type {string[]}
 */
export const FAMILY_MEMBER_ROLE_VALUES = Object.values(FAMILY_MEMBER_ROLES); 