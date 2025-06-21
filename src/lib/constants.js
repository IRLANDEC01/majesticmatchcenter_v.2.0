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

/**
 * Статусы для турниров и карт.
 * Используем единый набор для консистентности.
 */
export const STATUSES = Object.freeze({
  PLANNED: 'PLANNED',     // Запланировано, еще не началось
  ACTIVE: 'ACTIVE',       // Идет прямо сейчас
  COMPLETED: 'COMPLETED',   // Завершено
  // Статус ARCHIVED обрабатывается через поле archivedAt, а не здесь.
});

/**
* Массив значений статусов для валидации в Mongoose.
* @type {string[]}
*/
export const STATUSES_ENUM = Object.values(STATUSES);

/**
 * @deprecated
 * Типы статусов турниров.
 */
export const TOURNAMENT_STATUS_VALUES = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
};

/**
 * @deprecated
 */
export const TOURNAMENT_STATUS_ENUM = Object.values(TOURNAMENT_STATUS_VALUES);

/**
 * @deprecated
 */
export const TOURNAMENT_STATUS = Object.freeze({
  ...TOURNAMENT_STATUS_VALUES,
});

/**
 * Категории/уровни результатов участия в турнире.
 * @enum {string}
 */
export const RESULT_TIERS_VALUES = Object.freeze({
  WINNER: 'winner', // Бесспорный победитель
  RUNNER_UP: 'runner-up', // Второе место, финалист
  SEMI_FINALIST: 'semi-finalist', // Участник, выбывший в полуфинале (3-4 места)
  QUARTER_FINALIST: 'quarter-finalist', // Участник, выбывший в четвертьфинале (5-8 места)
  TOP_TIER: 'top-tier', // Общая категория для участников из топа (например, топ-16)
  PARTICIPANT: 'participant', // Стандартный результат для всех остальных
  DISQUALIFIED: 'disqualified', // Дисквалифицированный участник
});

/**
 * Массив тиров результата для использования в валидаторах Mongoose.
 * @type {string[]}
 */
export const RESULT_TIERS_ENUM = Object.values(RESULT_TIERS_VALUES);

export const RESULT_TIERS = Object.freeze({
  ...RESULT_TIERS_VALUES,
});

/**
 * Типы событий для Pub/Sub.
 * @enum {string}
 */
export const EVENT_TYPES = {
  TOURNAMENT_CREATED: 'tournament_created',
  TOURNAMENT_UPDATED: 'tournament_updated',
  TOURNAMENT_DELETED: 'tournament_deleted',
  TOURNAMENT_STATUS_CHANGED: 'tournament_status_changed',
  TOURNAMENT_RESULT_UPDATED: 'tournament_result_updated',
  TOURNAMENT_PARTICIPANT_ADDED: 'tournament_participant_added',
  TOURNAMENT_PARTICIPANT_REMOVED: 'tournament_participant_removed',
  TOURNAMENT_RESULT_CALCULATED: 'tournament_result_calculated',
};

/**
 * Задержка в миллисекундах для функции debounce при поиске.
 * Используется для оптимизации запросов к API, чтобы они не отправлялись на каждое нажатие клавиши.
 */
export const SEARCH_DEBOUNCE_DELAY_MS = 200; 