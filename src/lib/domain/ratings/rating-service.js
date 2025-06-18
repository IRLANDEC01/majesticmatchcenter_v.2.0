/**
 * @typedef {import('@/models/family/Family').Family} Family
 * @typedef {import('@/models/player/Player').Player} Player
 * @typedef {import('@/models/map/Map').Map} Map
 */

import { familyRepo } from '@/lib/repos/families/family-repo';
import { playerRepo } from '@/lib/repos/players/player-repo';
import { familyRatingHistoryRepository } from '@/lib/repos/ratings/family-rating-history-repo';
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
    familyRatingHistoryRepo,
    playerRatingHistoryRepo,
  }) {
    this.familyRepo = familyRepo;
    this.playerRepo = playerRepo;
    this.familyRatingHistoryRepo = familyRatingHistoryRepo;
    this.playerRatingHistoryRepo = playerRatingHistoryRepo;
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
    const promises = ratingChanges.map(async ({ familyId, change }) => {
      // Проверяем, что семья действительно является участником карты.
      if (!participantFamilyIds.includes(familyId)) {
        console.warn(`Попытка изменить рейтинг для семьи ${familyId}, которая не является участником карты ${mapId}. Пропускаем.`);
        return;
      }

      if (typeof change !== 'number' || change < 0) {
        throw new ValidationError(`Некорректное изменение рейтинга для семьи ${familyId}: ${change}`);
      }

      if (change === 0) {
        return;
      }

      const family = await this.familyRepo.findById(familyId);
      if (!family) {
        // Логируем предупреждение или пропускаем, так как выбрасывание ошибки может быть слишком строгим, если семья была удалена.
        console.warn(`Семья с id ${familyId} не найдена. Пропускаем обновление рейтинга.`);
        return;
      }

      await Promise.all([
        this.familyRepo.incrementRating(familyId, change),
        this.familyRatingHistoryRepo.create({
          familyId: familyId,
          mapId: mapId,
          change,
          reason: RATING_REASONS.MAP_COMPLETION,
          oldRating: family.rating,
          newRating: family.rating + change,
        }),
      ]);
    });

    await Promise.all(promises);
  }

  /**
   * Откатывает все изменения рейтинга, связанные с определенной картой.
   * @param {string} mapId - ID карты для отката.
   * @returns {Promise<void>}
   */
  async rollbackMapRatings(mapId) {
    const familyRollback = async () => {
      const familyHistoryRecords = await this.familyRatingHistoryRepo.findAndDeleteByMapId(mapId);
      const familyPromises = familyHistoryRecords.map(record =>
        this.familyRepo.incrementRating(record.family, -record.change)
      );
      await Promise.all(familyPromises);
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
  familyRatingHistoryRepo: familyRatingHistoryRepository,
  playerRatingHistoryRepo: playerRatingHistoryRepository,
}); 