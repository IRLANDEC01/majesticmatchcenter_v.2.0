import RedisMock from 'ioredis-mock';
import { createCache } from '../../src/lib/cache/internal/cache-factory';

/**
 * Создает и возвращает экземпляр кэша, работающий на in-memory Redis.
 * Идеально для изолированных тестов.
 */
export function getMockCache() {
  const mockClient = new RedisMock();
  return createCache(mockClient as any);
} 