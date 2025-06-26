import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getMockCache } from '../../../tests/helpers/mock-cache';

// Используем type alias для улучшения читаемости и надежности.
type Cache = ReturnType<typeof getMockCache>;

describe('Cache (Factory-based)', () => {
  let cache: Cache;

  beforeEach(() => {
    // Получаем чистый, изолированный экземпляр кэша для каждого теста.
    cache = getMockCache();
  });

  afterEach(async () => {
    // Явно разрываем соединение с моком Redis после каждого теста.
    // Это предотвращает предупреждения "No open handles" в Vitest.
    if (cache.client && typeof cache.client.disconnect === 'function') {
      await cache.client.disconnect();
    }
  });

  it('set -> get: должен сохранять и возвращать значение', async () => {
    await cache.set('test-key', { success: true });
    const result = await cache.get('test-key');
    expect(result).toEqual({ success: true });
  });

  it('get: должен возвращать null для несуществующего ключа', async () => {
    const result = await cache.get('nonexistent-key');
    expect(result).toBeNull();
  });
  
  it('invalidateByTag: должен удалять ключи по тегу', async () => {
    // Arrange
    await cache.set('player:1', { id: 1 }, { tags: ['players'] });
    await cache.set('player:2', { id: 2 }, { tags: ['players'] });
    await cache.set('family:1', { id: 1 }, { tags: ['families'] });
    
    // Act
    await cache.invalidateByTag('players');
    
    // Assert
    expect(await cache.get('player:1')).toBeNull();
    expect(await cache.get('player:2')).toBeNull();
    expect(await cache.get('family:1')).not.toBeNull();
  });

  it('TTL: ключ должен истекать после указанного времени', async () => {
    vi.useFakeTimers();
    const key = 'temporary-key';
    const ttlInSeconds = 200;

    await cache.set(key, { data: 'is-temporary' }, { ttl: ttlInSeconds });
    
    // Перематываем время на 201 секунду вперед
    vi.advanceTimersByTime(201 * 1000);

    expect(await cache.get(key)).toBeNull();
    vi.useRealTimers();
  });

  it('getOrSet (stampede): loader должен вызываться только один раз при конкурентных запросах', async () => {
    let loaderCalls = 0;
    const loader = async () => {
      loaderCalls++;
      return { success: true };
    };

    // Имитируем 20 одновременных запросов к одному и тому же ключу
    const promises = Array.from({ length: 20 }, () => cache.getOrSet('stampede-key', loader));
    const results = await Promise.all(promises);

    // Проверяем, что loader был вызван всего один раз
    expect(loaderCalls).toBe(1);
    // Проверяем, что все 20 вызовов вернули один и тот же результат
    expect(results).toHaveLength(20);
    expect(results[0]).toEqual({ success: true });
  });

  it('flush: должен удалять все ключи', async () => {
    // Arrange
    await cache.set('key1', 1);
    await cache.set('key2', 2);
    
    // Act
    await cache.flush();
    
    // Assert
    expect(await cache.get('key1')).toBeNull();
    expect(await cache.get('key2')).toBeNull();
  });
}); 