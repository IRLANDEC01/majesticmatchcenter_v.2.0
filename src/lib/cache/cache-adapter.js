/**
 * Базовый класс-интерфейс для адаптеров кэша.
 * Определяет контракт, которому должны следовать все реализации кэша.
 */
export class CacheAdapter {
  /**
   * Получает значение из кэша по ключу.
   * @param {string} key - Ключ для поиска.
   * @returns {Promise<any | null>} - Значение или null, если не найдено.
   */
  async get(key) {
    throw new Error("Method 'get()' must be implemented.");
  }

  /**
   * Сохраняет значение в кэше.
   * @param {string} key - Ключ для сохранения.
   * @param {any} value - Значение для сохранения.
   * @param {object} [options] - Опции.
   * @param {number} [options.ttl] - Время жизни в секундах.
   * @param {string[]} [options.tags] - Теги для инвалидации.
   * @returns {Promise<void>}
   */
  async set(key, value, options) {
    throw new Error("Method 'set()' must be implemented.");
  }

  /**
   * Удаляет значение из кэша по ключу.
   * @param {string} key - Ключ для удаления.
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error("Method 'delete()' must be implemented.");
  }

  /**
   * Инвалидирует (удаляет) все записи, связанные с тегом.
   * @param {string} tag - Тег для инвалидации.
   * @returns {Promise<void>}
   */
  async invalidateByTag(tag) {
    throw new Error("Method 'invalidateByTag()' must be implemented.");
  }

  /**
   * Полностью очищает кэш (используется в основном для тестов).
   * @returns {Promise<void>}
   */
  async flush() {
    throw new Error("Method 'flush()' must be implemented.");
  }
} 