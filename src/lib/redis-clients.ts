import 'server-only';
import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';

// --- Константы и конфигурации ---

/**
 * Базовая конфигурация для всех Redis клиентов.
 */
const baseRedisOptions: RedisOptions = {
  // lazyConnect: true, // Убрано, т.к. может скрывать проблемы при запуске
};

/**
 * Конфигурация для фоновых процессов (BullMQ).
 * Должна пытаться переподключиться "вечно", чтобы возобновить работу после сбоя.
 */
const workerRedisOptions: RedisOptions = {
  ...baseRedisOptions,
  maxRetriesPerRequest: null, // Бесконечные попытки для команд
  enableReadyCheck: false,
};

/**
 * Конфигурация для API-запросов (кэш).
 * Должна "быстро падать", чтобы не блокировать API.
 */
const apiRedisOptions: RedisOptions = {
  ...baseRedisOptions,
  maxRetriesPerRequest: 3, // Ограниченное количество попыток
  connectTimeout: 2000, // Таймаут на первое подключение
};

/**
 * Конфигурация для Auth.js сессий.
 * Надежное соединение для критичной аутентификации.
 */
const sessionRedisOptions: RedisOptions = {
  ...baseRedisOptions,
  maxRetriesPerRequest: 5, // Больше попыток для сессий
  connectTimeout: 3000, // Больше времени на подключение
  db: 2, // Отдельная база данных для сессий
};

// --- Синглтоны для клиентов ---
let apiRedisClient: Redis | null = null;
let backgroundRedisClient: Redis | null = null;
let sessionRedisClient: Redis | null = null;

// Состояние "размыкателя цепи" для API клиента
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF-OPEN';
let circuitState: CircuitState = 'CLOSED';
let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT = 60000; // 1 минута

function createClient(options: RedisOptions, clientType: 'API' | 'Worker' | 'Session'): Redis {
  // Сначала пытаемся получить URL из глобальной переменной (для тестов),
  // затем из process.env (для продакшена).
  let REDIS_URL = (globalThis as any).__REDIS_URL__ || process.env.REDIS_URL;
  
  // ✅ НОВОЕ: Для сессий используем отдельный URL если есть
  if (clientType === 'Session') {
    REDIS_URL = process.env.REDIS_SESSION_URL || REDIS_URL;
  }

  if (!REDIS_URL) {
    throw new Error(`[Redis:${clientType}] URL для подключения не найден ни в globalThis, ни в process.env.`);
  }
  const client = new Redis(REDIS_URL, options);

  client.on('connect', () => {
    console.log(`✅ [Redis:${clientType}] Клиент успешно подключен к ${client.options.host}:${client.options.port} (db=${client.options.db || 0})`);
    if (clientType === 'API') {
      consecutiveFailures = 0;
      if (circuitState !== 'CLOSED') {
        console.log('✅ [Redis:API] Circuit Breaker переведен в состояние CLOSED.');
        circuitState = 'CLOSED';
      }
    }
  });

  client.on('reconnecting', () => {
    console.log(`⏳ [Redis:${clientType}] Клиент пытается переподключиться к ${client.options.host}...`);
  });

  client.on('error', (err) => {
    console.error(`❌ [Redis:${clientType}] Ошибка клиента:`, err.message);

    if (clientType === 'API') {
      consecutiveFailures++;
      if (consecutiveFailures >= FAILURE_THRESHOLD && circuitState === 'CLOSED') {
        circuitState = 'OPEN';
        console.error('❌ [Redis:API] Circuit Breaker OPENED! Кэш временно отключен.');

        setTimeout(() => {
          console.log('⏳ [Redis:API] Circuit Breaker переведен в состояние HALF-OPEN. Попытка восстановить соединение...');
          circuitState = 'HALF-OPEN';
        }, RESET_TIMEOUT);
      }
    }
  });

  return client;
}

/**
 * Возвращает синглтон-экземпляр Redis клиента для API.
 * Создает его при первом вызове.
 */
export function getApiRedisClient(): Redis {
  if (!apiRedisClient) {
    apiRedisClient = createClient(apiRedisOptions, 'API');
  }
  return apiRedisClient;
}

/**
 * Возвращает синглтон-экземпляр Redis клиента для фоновых задач.
 * Создает его при первом вызове.
 */
export function getBackgroundRedisClient(): Redis {
  if (!backgroundRedisClient) {
    backgroundRedisClient = createClient(workerRedisOptions, 'Worker');
  }
  return backgroundRedisClient;
}

/**
 * ✅ НОВАЯ: Функция для получения Redis клиента для сессий Auth.js
 * Использует отдельную базу данных (db=2) для изоляции от основного кэша
 */
export function getSessionRedisClient(): Redis {
  if (!sessionRedisClient) {
    sessionRedisClient = createClient(sessionRedisOptions, 'Session');
  }
  return sessionRedisClient;
}

/**
 * Проверяет, активен ли "размыкатель цепи", что означает временное отключение кэша.
 * @returns {boolean} `true`, если кэш отключен, иначе `false`.
 */
export function isCacheDisabled(): boolean {
  // Кэш недоступен, если размыкатель открыт.
  // В режиме "HALF-OPEN" мы разрешаем одну пробную попытку,
  // которая либо закроет размыкатель, либо снова откроет его.
  return circuitState === 'OPEN';
}

// ✅ ЭКСПОРТ: Основной клиент для обратной совместимости
export const redis = getApiRedisClient(); 