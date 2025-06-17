/**
 * Сервис для управления статистикой игроков и семей.
 */
import { playerRepository } from '@/lib/repos/players/player-repo';
import { playerStatsRepository } from '@/lib/repos/statistics/player-stats-repo';
import { playerMapParticipationRepository } from '@/lib/repos/statistics/player-map-participation-repo';

export class StatisticsService {
  constructor({
    playerRepo,
    playerStatsRepo,
    playerMapParticipationRepo,
  }) {
    this.playerRepo = playerRepo;
    this.playerStatsRepo = playerStatsRepo;
    this.playerMapParticipationRepo = playerMapParticipationRepo;
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
   * @param {Array<object>} rawStats - Массив с "сырой" статистикой из JSON-файла.
   * @param {Array<object>} mapParticipants - Участники карты для сопоставления имен игроков.
   * @returns {Promise<Array<object>>} Промис, который разрешается в обработанную статистику с добавленными ID игроков.
   */
  async parseAndApplyMapStats(mapId, tournamentId, rawStats, mapParticipants) {
    const playerLookup = new Map(
      mapParticipants.map(p => [`${p.firstName}${p.lastName}`, p._id.toString()])
    );

    const statsWithPlayerIds = [];
    const updatePromises = [];

    for (const rawStat of rawStats) {
      const lookupKey = `${rawStat.firstName}${rawStat.lastName}`;
      const playerId = playerLookup.get(lookupKey);

      if (playerId) {
        const statWithId = { ...rawStat, playerId };
        statsWithPlayerIds.push(statWithId);

        const { weaponStats, ...overallChange } = rawStat;
        overallChange.mapsPlayed = 1;

        updatePromises.push(
          this.playerStatsRepo.applyOverallStatsChange(playerId, overallChange, 1),
          this.playerMapParticipationRepo.create({
            ...rawStat,
            playerId,
            mapId,
            tournamentId,
          })
        );
      } else {
        console.warn(`Игрок "${rawStat.firstName} ${rawStat.lastName}" из файла статистики не найден среди участников карты.`);
      }
    }

    await Promise.all(updatePromises);

    return statsWithPlayerIds;
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

export const statisticsService = new StatisticsService({
  playerRepo: playerRepository,
  playerStatsRepo: playerStatsRepository,
  playerMapParticipationRepo: playerMapParticipationRepository,
}); 