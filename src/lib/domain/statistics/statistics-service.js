/**
 * Сервис для управления статистикой игроков и семей.
 */
export class StatisticsService {
  /**
   * Обновляет статистику игроков на основе данных с карты.
   * @param {string} mapId - ID карты.
   * @param {object[]} statistics - Массив статистики игроков.
   */
  async updatePlayerStatsFromMap(mapId, statistics) {
    // TODO: Реализовать логику
    // 1. Пройти по массиву статистики
    // 2. Найти каждого игрока
    // 3. Атомарно обновить его PlayerStats (общую, по оружию, месячную)
    console.log(`Updating player stats for map ${mapId}...`);
    return Promise.resolve();
  }

  /**
   * Обновляет статистику семей на основе результатов карты.
   * @param {string} mapId - ID карты.
   * @param {string} winnerId - ID победившей семьи/команды.
   */
  async updateFamilyStatsFromMap(mapId, winnerId) {
    // TODO: Реализовать логику
    // 1. Увеличить счетчик сыгранных карт для всех участников
    // 2. Увеличить счетчик побед для победителя
    console.log(`Updating family stats for map ${mapId}...`);
    return Promise.resolve();
  }

  /**
   * Откатывает изменения статистики, связанные с картой.
   * @param {string} mapId - ID карты.
   */
  async rollbackMapStats(mapId) {
    // TODO: Реализовать логику
    // 1. Найти всех участников карты
    // 2. Вычесть статистику из PlayerStats и FamilyStats
    console.log(`Rolling back stats for map ${mapId}...`);
    return Promise.resolve();
  }

  /**
   * Парсит JSON-статистику и обновляет данные игроков.
   * @param {string} mapId - ID карты, за которую обновляется статистика.
   * @param {Array<object>} statistics - Массив объектов со статистикой по каждому игроку.
   * @returns {Promise<void>}
   */
  async processAndApplyStatistics(mapId, statistics) {
    // TODO: Реализовать основную логику.
    // 1. Пройти по массиву.
    // 2. Для каждого игрока найти его в БД по `firstName` и `lastName`.
    // 3. Атомарно инкрементировать `PlayerStats` (общие и по оружию).
    // 4. Создать запись в `PlayerMapParticipation` с "замороженной" статистикой за эту карту.
    console.log(`[StatisticsService] TODO: Process statistics for map ${mapId}`, statistics);
  }

  /**
   * Откатывает изменения статистики, связанные с картой.
   * @param {string} mapId - ID карты для отката.
   * @returns {Promise<void>}
   */
  async rollbackStatistics(mapId) {
    // TODO: Реализовать логику отката.
    // 1. Найти все записи `PlayerMapParticipation` по `mapId`.
    // 2. Для каждой записи вычесть значения из `PlayerStats` игрока.
    // 3. Удалить найденные записи `PlayerMapParticipation`.
    console.log(`[StatisticsService] TODO: Rollback statistics for map ${mapId}`);
  }
}

export const statisticsService = new StatisticsService(); 