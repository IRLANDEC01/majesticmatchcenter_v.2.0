/**
 * @file Этот файл содержит глобальные константы, используемые в приложении.
 * Цель - централизовать магические строки и числа для упрощения поддержки.
 */

/**
 * Типы валют, используемые для призовых фондов и заработков.
 * @enum {string}
 */
export const CURRENCY_TYPES = {
  MM_COINS: 'mm_coins',
  GTA_DOLLARS: 'gta_dollars',
  RUB: 'rub',
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
export const LIFECYCLE_STATUSES = {
  PLANNED: 'planned',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

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
export const SEARCH_DEBOUNCE_DELAY_MS = 300;

/**
 * Ограничение на количество результатов, возвращаемых при поиске в админ-панели.
 * Используется для предотвращения перегрузки и повышения производительности.
 */
export const ADMIN_SEARCH_RESULTS_LIMIT = 15;

/**
 * Фиксированный размер страницы для админских таблиц с результатами поиска сущностей.
 * Используется в TanStack Table для серверной пагинации в админ-панели.
 * @constant {number}
 */
export const ADMIN_TABLE_PAGE_SIZE = 15;

/**
 * Максимальный размер страницы для защиты от DoS атак.
 * Предотвращает запросы с огромными limit значениями, которые могут перегрузить сервер.
 * @constant {number}
 */
export const MAX_PAGE_SIZE = 100;

// Для будущего использования на публичных страницах
// export const PUBLIC_TABLE_PAGE_SIZE = 25;

export const ROLES = {
  OWNER: 'owner',
  MEMBER: 'member',
};
export const ROLES_ENUM = Object.values(ROLES);

export const MAP_TEMPLATE_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};
export const MAP_TEMPLATE_STATUSES_ENUM = Object.values(MAP_TEMPLATE_STATUSES);

// Экспортируем базовые константы приложения
export const APP_NAME = 'MajesticMatchCenter';
export const APP_VERSION = '2.0';

// Константы для поиска
export const MIN_SEARCH_LENGTH = 2;

// Circuit Breaker для MeiliSearch
export const CIRCUIT_BREAKER_CONFIG = {
  /** Количество последовательных ошибок перед блокировкой MeiliSearch */
  FAILURE_THRESHOLD: 5,
  /** Время блокировки в секундах */
  TIMEOUT_SECONDS: 60,
  /** Redis ключ для хранения состояния circuit breaker */
  REDIS_KEY: 'search:circuit_breaker',
};

/**
 * @description Конфигурация для валидации загружаемых изображений.
 */
export const IMAGE_UPLOAD_CONFIG = {
  /** Допустимые MIME-типы изображений. */
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  /** Допустимые расширения файлов (для UI). */
  ACCEPTED_IMAGE_EXTENSIONS: ['.jpeg', '.jpg', '.png', '.webp'],
  /** Максимальный размер файла в MB (централизованная константа) */
  MAX_FILE_SIZE_MB: 5,
}; 