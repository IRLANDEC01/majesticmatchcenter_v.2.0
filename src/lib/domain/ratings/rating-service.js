/**
 * @typedef {import('@/models/family/Family').Family} Family
 * @typedef {import('@/models/player/Player').Player} Player
 * @typedef {import('@/models/map/Map').Map} Map
 */

import { familyRepository } from '@/lib/repos/families/family-repo';
import { playerRepository } from '@/lib/repos/players/player-repo';
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
   * Начисляет рейтинг игрокам на основе их статистики в карте.
   * @param {string} mapId - ID карты, за которую начисляется рейтинг.
   * @param {object} statistics - Объект со статистикой игроков.
   * @returns {Promise<void>}
   */
  async updatePlayerRatings(mapId, statistics) {
    // TODO: Реализовать логику начисления рейтинга игрокам (например, 1 kill = 1 очко).
    // 1. Найти всех игроков из статистики.
    // 2. Для каждого игрока посчитать изменение рейтинга.
    // 3. Атомарно обновить поле `rating` в модели Player.
    // 4. Создать запись в `PlayerRatingHistory`.
    console.log(`[RatingService] TODO: Update player ratings for map ${mapId}`, statistics);
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
   * @param {Array<{familyId: string, change: number}>} ratingChanges - Массив объектов с ID семей и очками рейтинга для добавления.
   * @returns {Promise<void>}
   */
  async updateFamilyRatings(mapId, ratingChanges) {
    const promises = ratingChanges.map(async ({ familyId, change }) => {
      if (typeof change !== 'number' || change < 0) {
        throw new ValidationError(`Invalid rating change for family ${familyId}: ${change}`);
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
          family: familyId,
          map: mapId,
          change,
          reason: RATING_REASONS.MAP_COMPLETION,
          previousRating: family.rating,
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
  familyRepo: familyRepository,
  playerRepo: playerRepository,
  familyRatingHistoryRepo: familyRatingHistoryRepository,
  playerRatingHistoryRepo: playerRatingHistoryRepository,
}); 