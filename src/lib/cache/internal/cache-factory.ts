import type { Redis } from 'ioredis';
import { cacheTTL as cachePolicy } from '../cache-policy';

// Внутреннее хранилище для отслеживания запросов, которые уже в процессе выполнения.
// Это необходимо для защиты от "cache stampede".
const inflightRequests = new Map<string, Promise<any>>();

// Вспомогательная функция для формирования ключа тега.
function tagKey(tags: string[]) {
  // Используем префикс для ясности в Redis.
  return `tag:${tags.join(':')}`;
}

/**
 * Чистая функция-фабрика, которая создает экземпляр кэша.
 * @param client - Экземпляр ioredis-клиента (реальный или мок).
 * @returns Объект с методами для работы с кэшем.
 */
export function createCache(client: Redis) {
  return {
    // ВАЖНО: Выставляем клиент наружу, чтобы тесты могли управлять его жизненным циклом (например, disconnect).
    client,

    /**
     * Получает значение из кэша по ключу.
     */
    async get<T>(key: string): Promise<T | null> {
      const raw = await client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    },

    /**
     * Получает значение из кэша или, если его нет, выполняет loader,
     * сохраняет результат и возвращает его.
     * Содержит защиту от "cache stampede".
     */
    async getOrSet<T>(key: string, loader: () => Promise<T>, opts: { ttl?: number; tags?: string[] } = {}): Promise<T> {
      const cachedValue = await this.get<T>(key);
      if (cachedValue !== null) {
        return cachedValue;
      }

      // Защита от "cache stampede": если запрос на этот ключ уже "в полете",
      // возвращаем существующий промис, а не создаем новый.
      if (inflightRequests.has(key)) {
        return inflightRequests.get(key)!;
      }

      const promise = loader()
        .then(async (freshValue) => {
          await this.set(key, freshValue, opts);
          return freshValue;
        })
        .finally(() => {
          // Очищаем промис из карты после его завершения (успешного или нет).
          inflightRequests.delete(key);
        });

      inflightRequests.set(key, promise);
      return promise;
    },

    /**
     * Сохраняет значение в кэше.
     */
    async set(key: string, value: unknown, opts: { ttl?: number; tags?: string[] } = {}): Promise<void> {
      // TTL по умолчанию берется из политики, либо 60с.
      const ttl = opts.ttl ?? cachePolicy[key as keyof typeof cachePolicy] ?? 60;
      const serializedValue = JSON.stringify(value);

      const multi = client.multi();
      multi.set(key, serializedValue, 'EX', ttl);
      
      if (opts.tags && opts.tags.length > 0) {
        // Для каждого тега добавляем текущий ключ в соответствующее множество.
        for (const tag of opts.tags) {
            multi.sadd(tagKey([tag]), key);
        }
      }

      await multi.exec();
    },

    /**
     * Инвалидирует (удаляет) все ключи, связанные с тегом.
     */
    async invalidateByTag(tag: string): Promise<void> {
      const tagSetKey = tagKey([tag]);
      const members = await client.smembers(tagSetKey);
      
      const multi = client.multi();
      if (members.length > 0) {
        multi.del(...members);
      }
      // Удаляем и само множество тегов.
      multi.del(tagSetKey);
      
      await multi.exec();
    },

     /**
     * Полностью очищает кэш (для тестов).
     */
    async flush(): Promise<void> {
        await client.flushdb();
    }
  };
} 