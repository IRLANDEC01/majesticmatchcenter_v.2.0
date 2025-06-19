/**
 * @typedef {import('@/models/family/Family').Family} Family
 * @typedef {import('@/models/player/Player').Player} Player
 * @typedef {import('@/models/map/Map').Map} Map
 */

import { familyRepo } from '@/lib/repos/families/family-repo';
import { playerRepo } from '@/lib/repos/players/player-repo';
import { familyMapParticipationRepo } from '@/lib/repos/ratings/family-map-participation-repo';
import { playerRatingHistoryRepository } from '@/lib/repos/ratings/player-rating-history-repo';
import { ValidationError } from '@/lib/errors';
import { RATING_REASONS } from '@/lib/constants';

/**
 * Сервис для управления рейтингами игроков и семей.
 * Инкапсулирует логику начисления и отката изменений рейтинга.
 */
export class RatingService {
  constructor({
    familyRepo,
    playerRepo,
    familyMapParticipationRepo,
    playerRatingHistoryRepo,
  }) {
    this.familyRepo = familyRepo;
    this.playerRepo = playerRepo;
    this.familyMapParticipationRepo = familyMapParticipationRepo;
    this.playerRatingHistoryRepo = playerRatingHistoryRepo;
  }

  /**
   * @deprecated Используйте recordFamiliesMapResults для записи результатов всех участников.
   * Записывает результат участия семьи в карте.
   * Атомарно обновляет рейтинг семьи и создает запись об участии.
   * @param {string} mapId - ID карты.
   * @param {string} familyId - ID семьи-победителя.
   * @param {number} ratingChange - Изменение рейтинга.
   */
  async recordFamilyMapResult(mapId, familyId, ratingChange) {
    if (ratingChange < 0) {
      throw new ValidationError('Изменение рейтинга не может быть отрицательным.');
    }

    if (ratingChange === 0) {
      return; // Ничего не делаем, если изменение рейтинга равно нулю.
    }

    // Эта операция должна быть атомарной. В идеале - транзакция.
    // Пока что для простоты делаем последовательно.
    await this.familyRepo.incrementRating(familyId, ratingChange);
    await this.familyMapParticipationRepo.create({
      mapId,
      familyId,
      ratingChange,
      reason: RATING_REASONS.MAP_COMPLETION,
    });
  }

  /**
   * Записывает результаты всех семей-участниц карты, включая турнирные очки.
   * @param {string} mapId - ID карты.
   * @param {string} tournamentId - ID турнира.
   * @param {Array<{familyId: string, points: number}>} familyResults - Результаты семей.
   * @param {{winnerFamilyId: string, familyRatingChange: number}} winnerInfo - Информация о победителе для начисления глобального рейтинга.
   */
  async recordFamiliesMapResults(mapId, tournamentId, familyResults = [], winnerInfo = {}) {
    if (!familyResults || familyResults.length === 0) {
      console.log(`[RatingService] Для карты ${mapId} не переданы результаты семей. Пропускаем начисление очков.`);
      return;
    }

    // Используем последовательный цикл for...of для большей надежности и упрощения отладки,
    // вместо параллельного выполнения через Promise.all.
    for (const result of familyResults) {
      const isWinner = result.familyId === winnerInfo.winnerFamilyId;
      const ratingChange = isWinner ? (winnerInfo.familyRatingChange || 0) : 0;

      const participationData = {
        mapId,
        tournamentId,
        familyId: result.familyId,
        tournamentPoints: result.points,
        ratingChange,
        reason: RATING_REASONS.MAP_COMPLETION,
      };
      
      // Последовательно создаем запись об участии
      await this.familyMapParticipationRepo.create(participationData);
      
      // И если это победитель, последовательно обновляем его рейтинг
      if (isWinner && ratingChange > 0) {
        await this.familyRepo.incrementRating(result.familyId, ratingChange);
      }
    }
  }

  /**
   * Обновляет рейтинги игроков на основе их результатов (убийств).
   * @param {string} mapId - ID завершаемой карты.
   * @param {Array<object>} parsedStats - Обработанная статистика игроков из матча, ожидаются объекты с `playerId` и `kills`.
   * @returns {Promise<void>}
   */
  async updatePlayerRatings(mapId, parsedStats) {
    const promises = parsedStats.map(async (stat) => {
      const { playerId, kills } = stat;
      // Рейтинг начисляется по количеству убийств
      const change = kills || 0;

      if (change === 0) {
        return;
      }

      const player = await this.playerRepo.findById(playerId);
      if (!player) {
        console.warn(`Игрок с id ${playerId} не найден. Пропускаем обновление рейтинга.`);
        return;
      }

      await Promise.all([
        this.playerRepo.incrementRating(playerId, change),
        this.playerRatingHistoryRepo.create({
          player: playerId,
          map: mapId,
          change,
          reason: RATING_REASONS.MAP_COMPLETION,
          previousRating: player.rating,
          newRating: player.rating + change,
        }),
      ]);
    });

    await Promise.all(promises);
  }

  /**
   * Обновляет рейтинги семей на основе ручного ввода администратора.
   * @param {string} mapId - ID завершаемой карты.
   * @param {Array<{familyId: string, change: number}>} ratingChanges - Массив объектов с ID семей и очками рейтинга.
   * @param {Array<string>} participantFamilyIds - "Белый список" ID семей, которые действительно участвовали в карте.
   * @returns {Promise<void>}
   */
  async updateFamilyRatings(mapId, ratingChanges, participantFamilyIds) {
    // Этот метод устарел и будет удален.
    // Логика перенесена в recordFamilyMapResult и будет расширена для всех участников.
    console.warn('DEPRECATED: updateFamilyRatings is called');
  }

  /**
   * Откатывает все изменения рейтинга, связанные с определенной картой.
   * @param {string} mapId - ID карты для отката.
   * @returns {Promise<void>}
   */
  async rollbackMapRatings(mapId) {
    const familyRollback = async () => {
      // Находим все записи, чтобы знать, на сколько откатывать рейтинг
      const participations = await this.familyMapParticipationRepo.findByMapId(mapId);
      
      const promises = participations.map(p => 
        this.familyRepo.incrementRating(p.familyId, -p.ratingChange)
      );
      
      await Promise.all(promises);
      
      // Удаляем записи только после успешного отката рейтинга
      if (participations.length > 0) {
        await this.familyMapParticipationRepo.deleteByMapId(mapId);
      }
    };

    const playerRollback = async () => {
      const playerHistoryRecords = await this.playerRatingHistoryRepo.findAndDeleteByMapId(mapId);
      const playerPromises = playerHistoryRecords.map(record =>
        this.playerRepo.incrementRating(record.player, -record.change)
      );
      await Promise.all(playerPromises);
    };

    await Promise.all([familyRollback(), playerRollback()]);
  }
}

export const ratingService = new RatingService({
  familyRepo,
  playerRepo,
  familyMapParticipationRepo,
  playerRatingHistoryRepo: playerRatingHistoryRepository,
}); 