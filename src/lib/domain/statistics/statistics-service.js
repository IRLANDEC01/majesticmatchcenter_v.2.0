import { z } from 'zod';
import { playerRepo } from '@/lib/repos/players/player-repo';
import { playerMapParticipationRepo } from '@/lib/repos/statistics/player-map-participation-repo';
import { familyMapParticipationRepo } from '@/lib/repos/statistics/family-map-participation-repo';
import { playerStatsRepo } from '@/lib/repos/statistics/player-stats-repo';
import { NotFoundError, AppError, PlayerNotFoundError } from '@/lib/errors';

/**
 * Сервис для обработки и сохранения статистики игроков и семей.
 */
class StatisticsService {
  constructor({ playerRepo, playerMapParticipationRepo, familyMapParticipationRepo, playerStatsRepo }) {
    this.playerRepo = playerRepo;
    this.playerMapParticipationRepo = playerMapParticipationRepo;
    this.familyMapParticipationRepo = familyMapParticipationRepo;
    this.playerStatsRepo = playerStatsRepo;

    // Привязка контекста
    this.parseAndApplyMapStats = this.parseAndApplyMapStats.bind(this);
    this.rollbackMapStats = this.rollbackMapStats.bind(this);
  }

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
   * Парсит "сырую" статистику матча, находит соответствующих игроков и обновляет их документы со статистикой.
   * @param {string} mapId - ID карты.
   * @param {string} tournamentId - ID родительского турнира.
   * @param {Array<object>} rawStats - Массив с "сырой" статистикой. Ожидается, что каждый объект содержит `firstName` и `lastName`.
   * @returns {Promise<Array<object>>} Промис, который разрешается в массив `rawStats` с добавленным `playerId`.
   */
  async parseAndApplyMapStats(mapId, tournamentId, rawStats) {
    const enrichedStats = [];
    const updatePromises = [];

    for (const stat of rawStats) {
      if (!stat.firstName || !stat.lastName) {
        console.warn('Статистика получена без имени/фамилии и будет проигнорирована:', stat);
        continue;
      }

      const players = await this.playerRepo.findAll({ filter: { firstName: stat.firstName, lastName: stat.lastName } });
      const player = players[0];

      if (player) {
        const playerId = player._id;

        const statsChange = { ...stat };
        delete statsChange.firstName;
        delete statsChange.lastName;

        // Собираем все обещания в один массив
        updatePromises.push(
          this.playerStatsRepo.applyOverallStatsChange(playerId, statsChange, 1)
        );
        updatePromises.push(
          this.playerMapParticipationRepo.create({
            ...stat,
            playerId,
            mapId,
            tournamentId,
          })
        );

        enrichedStats.push({ ...stat, playerId, mapId });
      } else {
        console.warn(`Игрок "${stat.firstName} ${stat.lastName}" не найден в базе данных. Статистика проигнорирована.`);
      }
    }

    // Дожидаемся выполнения всех операций с базой данных
    await Promise.all(updatePromises);

    return enrichedStats;
  }

  /**
   * Откатывает все изменения статистики игроков, связанные с определенной картой.
   * @param {string} mapId - ID карты для отката.
   * @returns {Promise<void>}
   */
  async rollbackMapStats(mapId) {
    const participationRecords = await this.playerMapParticipationRepo.findAndDeleteByMapId(mapId);

    const rollbackPromises = participationRecords.map(record => {
      const { weaponStats, ...overallChange } = record;
      overallChange.mapsPlayed = 1;

      return this.playerStatsRepo.applyOverallStatsChange(record.playerId, overallChange, -1);
    });

    await Promise.all(rollbackPromises);
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

export { StatisticsService }; 