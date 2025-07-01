import 'server-only';
import { getApiRedisClient, isCacheDisabled } from '@/lib/redis-clients';
import { cacheKeys } from './cache-policy';

const redis = getApiRedisClient();

/**
 * Обертка для операций с кэшем, которая автоматически отключается при сбое Redis.
 * Реализует паттерн "Cache-Aside".
 *
 * @template T Тип данных, которые кэшируются.
 * @param {string} key Ключ для кэша.
 * @param {() => Promise<T>} fetcher Функция для получения свежих данных, если их нет в кэше.
 * @param {number} ttl Время жизни кэша в секундах.
 * @param {string[]} tags Массив тегов для группировки ключей и последующей инвалидации.
 * @returns {Promise<T>}
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number,
  tags: string[] = []
): Promise<T> {
  if (isCacheDisabled()) {
    return fetcher();
  }

  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    const data = await fetcher();

    // Не кэшируем пустые значения (null/undefined)
    if (data === null || data === undefined) {
      return data;
    }

    const tx = redis.multi();
    tx.set(key, JSON.stringify(data), 'EX', ttl);
    if (tags.length > 0) {
      for (const tag of tags) {
        tx.sadd(tag, key);
      }
    }
    await tx.exec();

    return data;
  } catch (error) {
    console.error(`Cache Error (getOrSet for key: ${key}):`, error);
    // При любой ошибке кэша отдаем свежие данные, не прерывая запрос
    return fetcher();
  }
}

/**
 * Инвалидирует (удаляет) ключи кэша по одному или нескольким тегам.
 *
 * @param {string[]} tags Массив тегов для инвалидации.
 * @returns {Promise<void>}
 */
export async function invalidateByTags(tags: string[]): Promise<void> {
  if (isCacheDisabled()) {
    return;
  }

  try {
    const keysToDelete: string[] = [];
    const pipeline = redis.pipeline();

    for (const tag of tags) {
      const keys = await redis.smembers(tag);
      if (keys.length > 0) {
        keysToDelete.push(...keys);
      }
      // Также удаляем сам тег
      pipeline.del(tag);
    }

    if (keysToDelete.length > 0) {
      pipeline.del(...[...new Set(keysToDelete)]); // Удаляем уникальные ключи
    }

    await pipeline.exec();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Cache invalidated for tags: [${tags.join(', ')}]. Keys deleted: ${keysToDelete.length}`);
    }
  } catch (error) {
    console.error(`Cache Error (invalidateByTags for tags: [${tags.join(', ')}]):`, error);
    // Не прерываем выполнение, просто логируем ошибку
  }
}

/**
 * Увеличивает счетчик ревизий для указанного типа списка.
 * Это более эффективный способ инвалидации пагинированных списков.
 *
 * @param {keyof typeof cacheKeys} listRevKey Ключ из cacheKeys, указывающий на счетчик ревизий (напр., 'mapTemplatesRev').
 * @returns {Promise<number>} Новое значение счетчика.
 */
export async function incrementListRevision(revKey: string): Promise<number> {
  if (isCacheDisabled()) {
    return Date.now(); // Возвращаем уникальное число, чтобы гарантировать промах кэша
  }
  try {
    const newRev = await redis.incr(revKey);
    return newRev;
  } catch (error) {
    console.error(`Cache Error (incrementListRevision for key: ${revKey}):`, error);
    return Date.now();
  }
}

/**
 * Инвалидирует (удаляет) один ключ из кэша.
 * @param {string} key Ключ для удаления.
 */
export async function invalidate(key: string): Promise<void> {
  if (isCacheDisabled()) {
    return;
  }
  try {
    await redis.del(key);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🧹 [Cache] Инвалидирован ключ: ${key}`);
    }
  } catch (error) {
    console.error(`Ошибка при инвалидации ключа ${key}:`, error);
  }
}

/**
 * Очищает весь in-memory кэш.
 * ВНИМАНИЕ: Эта функция предназначена **только для использования в тестах**.
 */
export function clearMemoryCache(): void {
  if (process.env.NODE_ENV === 'test' && process.env.CACHE_DRIVER === 'memory') {
    (redis as any).flushall();
    console.log('🧹 [Cache] In-memory кэш очищен.');
  }
} 