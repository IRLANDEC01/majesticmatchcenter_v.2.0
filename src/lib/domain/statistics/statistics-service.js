/**
 * Сервис для управления статистикой игроков и семей.
 */
import { RATING_REASONS } from '@/lib/constants';

export default class StatisticsService {
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
   * Записывает статистику всех игроков за одну карту.
   * @param {string} mapId - ID карты.
   * @param {string} tournamentId - ID турнира.
   * @param {Array<object>} playerStats - Массив объектов со статистикой каждого игрока.
   */
  async recordPlayerMapStats(mapId, tournamentId, playerStats) {
    if (!playerStats || playerStats.length === 0) {
      return;
    }

    const participationDocs = [];
    const ratingUpdatePromises = [];

    for (const stats of playerStats) {
      const ratingChange = (stats.kills || 0) - (stats.deaths || 0);

      const doc = {
        playerId: stats.playerId,
        familyId: stats.familyId,
        mapId,
        tournamentId,
        ratingChange,
        reason: RATING_REASONS.MAP_COMPLETION,
        kills: stats.kills,
        deaths: stats.deaths,
        damageDealt: stats.damageDealt,
        shotsFired: stats.shotsFired,
        hits: stats.hits,
        hitAccuracy: stats.hitAccuracy,
        headshots: stats.headshots,
        headshotAccuracy: stats.headshotAccuracy,
        weaponStats: stats.weaponStats,
      };
      participationDocs.push(doc);

      if (ratingChange !== 0) {
        ratingUpdatePromises.push(
          this.playerRepo.incrementRating(stats.playerId, ratingChange)
        );
      }
    }

    await Promise.all([
      this.playerMapParticipationRepo.createMany(participationDocs),
      ...ratingUpdatePromises,
    ]);
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
    // DEPRECATED
    console.warn('DEPRECATED: parseAndApplyMapStats is called');
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

        enrichedStats.push({ ...stat, playerId });
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
    const participationRecords = await this.playerMapParticipationRepo.findByMapId(mapId);
    if (!participationRecords || participationRecords.length === 0) {
      return;
    }
    
    const rollbackPromises = participationRecords.map(record => {
      const ratingChange = -record.ratingChange;
      return this.playerRepo.incrementRating(record.playerId, ratingChange);
    });
    
    await Promise.all(rollbackPromises);

    await this.playerMapParticipationRepo.deleteByMapId(mapId);
  }

  /**
   * Откатывает изменения статистики, связанные с картой.
   * @param {string} mapId - ID карты для отката.
   * @returns {Promise<void>}
   */
  async rollbackStatistics(mapId) {
    // TODO: Implement logic to rollback statistics for a map.
    // This could involve deleting created stats entries or reverting to a previous state.
  }

  async updatePlayerStatsForMap(mapId, playerStats) {
    // TODO: Implement logic to update player statistics based on map results.
    // This will involve finding the relevant PlayerStats documents and updating them.
    // Здесь должна быть логика для поиска и обновления статистики игроков.
    // Пока что просто выводим информацию в консоль.
  }

  /**
   * Обновляет статистику семей на основе результатов карты.
   * @param {string} mapId - ID карты.
   * @param {string} winnerId - ID победившей семьи/команды.
   */
  async updateFamilyStatsForMap(mapId, winnerId) {
    // This will involve finding the relevant FamilyStats documents and updating them.
    // Здесь должна быть логика для поиска и обновления статистики семей.
    // Пока что просто выводим информацию в консоль.
  }

  async rollbackMapStatistics(mapId) {
    // TODO: Implement logic to rollback statistics for a map.
    // This could involve deleting created stats entries or reverting to a previous state.
  }
} 