/**
 * Сервис для управления статистикой игроков и семей.
 */
import { playerRepo } from '@/lib/repos/players/player-repo';
import { playerStatsRepository } from '@/lib/repos/statistics/player-stats-repo';
import { playerMapParticipationRepo } from '@/lib/repos/statistics/player-map-participation-repo';
import { RATING_REASONS } from '@/lib/constants';

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
      // Пока что логика начисления рейтинга простая: 1 убийство = 1 очко.
      const ratingChange = stats.kills - stats.deaths;

      // Создаем документ вручную, чтобы исключить проблемы со spread (...)
      const doc = {
        // Связи
        playerId: stats.playerId,
        familyId: stats.familyId,
        mapId,
        tournamentId,
        
        // Рейтинг
        ratingChange,
        reason: RATING_REASONS.MAP_COMPLETION,
        
        // Статистика
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

      // Сразу готовим промис для обновления основного рейтинга игрока
      if (ratingChange !== 0) {
        ratingUpdatePromises.push(
          this.playerRepo.incrementRating(stats.playerId, ratingChange)
        );
      }
    }

    // Выполняем все операции параллельно
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
    // 1. Найти все записи, которые нужно откатить
    const participationRecords = await this.playerMapParticipationRepo.findByMapId(mapId);
    if (!participationRecords || participationRecords.length === 0) {
      return; // Нечего откатывать
    }
    
    // 2. Сформировать промисы для отката рейтинга в основной модели Player
    const rollbackPromises = participationRecords.map(record => {
      // Важно: инвертируем изменение. Если было +15, станет -15.
      const ratingChange = -record.ratingChange;
      return this.playerRepo.incrementRating(record.playerId, ratingChange);
    });
    
    // 3. Дождаться отката рейтингов
    await Promise.all(rollbackPromises);

    // 4. Удалить сами записи об участии
    await this.playerMapParticipationRepo.deleteByMapId(mapId);
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
  playerRepo,
  playerStatsRepo: playerStatsRepository,
  playerMapParticipationRepo,
}); 