import 'server-only';
import Redis from 'ioredis';

/**
 * Глобальная переменная для хранения кешированного клиента Redis.
 */
let redis;

/**
 * Функция для получения клиента Redis.
 * Реализует паттерн "синглтон".
 * @returns {Redis.Redis} Клиент ioredis.
 */
function getRedisClient() {
  if (redis) {
    return redis;
  }

  const REDIS_URL = process.env.REDIS_URL;

  if (!REDIS_URL) {
    throw new Error(
      'Please define the REDIS_URL environment variable inside .env.local'
    );
  }
  
  // Создаем новый экземпляр, если он еще не был создан
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Отключаем повторные попытки на уровне команд
  });

  // Не регистрируем обработчики событий в тестовой среде, чтобы избежать асинхронных утечек
  if (process.env.NODE_ENV !== 'test') {
    redis.on('connect', () => console.log('=> connected to Redis'));
    redis.on('error', (err) => console.error('Redis Client Error', err));
  }

  return redis;
}

export default getRedisClient; 