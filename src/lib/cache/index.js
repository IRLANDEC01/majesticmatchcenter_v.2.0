import RedisAdapter from './redis-adapter';
// import MemoryAdapter from './memory-adapter'; // Для будущей реализации

let cacheInstance = null;

/**
 * Фабричная функция для получения синглтон-экземпляра адаптера кэша.
 * В соответствии с архитектурой, по умолчанию используется Redis.
 * @returns {RedisAdapter} Экземпляр адаптера кэша.
 */
function getCacheAdapter() {
  // Паттерн "синглтон", чтобы избежать создания множества экземпляров.
  if (!cacheInstance) {
    // const cacheDriver = process.env.CACHE_DRIVER || 'redis';
    // if (cacheDriver === 'redis') {
      cacheInstance = new RedisAdapter();
    // } else {
      // cacheInstance = new MemoryAdapter();
    // }
  }
  return cacheInstance;
}

// Экспортируем единый экземпляр, который будет использоваться во всем приложении.
export const cache = getCacheAdapter(); 