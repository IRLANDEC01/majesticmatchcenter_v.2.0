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
 * Статусы жизненного цикла для сущностей (турниры, карты и т.д.).
 * Используем единый набор для консистентности.
 */
export const LIFECYCLE_STATUSES = Object.freeze({
  PLANNED: 'PLANNED',     // Запланировано, еще не началось
  ACTIVE: 'ACTIVE',       // Идет прямо сейчас
  COMPLETED: 'COMPLETED',   // Завершено
  // Статус ARCHIVED обрабатывается через поле archivedAt, а не здесь.
});

/**
* Массив значений статусов для валидации в Mongoose.
* @type {string[]}
*/
export const LIFECYCLE_STATUSES_ENUM = Object.values(LIFECYCLE_STATUSES);

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
 * Задержка в миллисекундах для функции debounce при поиске.
 * Используется для оптимизации запросов к API, чтобы они не отправлялись на каждое нажатие клавиши.
 */
export const SEARCH_DEBOUNCE_DELAY_MS = 200;

/**
 * Ограничение на количество результатов, возвращаемых при поиске в админ-панели.
 * Используется для предотвращения перегрузки и повышения производительности.
 */
export const ADMIN_SEARCH_RESULTS_LIMIT = 15; 