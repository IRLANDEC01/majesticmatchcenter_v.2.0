/**
 * @typedef {import('@/models/family/Family').Family} Family
 * @typedef {import('@/models/player/Player').Player} Player
 * @typedef {import('@/models/map/Map').Map} Map
 */

import { ValidationError } from '@/lib/errors';

/**
 * Сервис для управления рейтингами игроков и семей.
 * Обеспечивает консистентность данных между основной моделью и историей.
 */
class RatingService {
  constructor(repos) {
    this.familyRepo = repos.familyRepo;
    this.playerRepo = repos.playerRepo;
    this.playerMapParticipationRepo = repos.playerMapParticipationRepo;
    this.familyMapParticipationRepo = repos.familyMapParticipationRepo;
    this.rollbackMapRatings = this.rollbackMapRatings.bind(this);
  }

  /**
   * Обновляет рейтинги игроков и дополняет их записи участия контекстом рейтинга.
   * Предполагается, что `statistics-service` уже создал базовые записи участия.
   * @param {Array<{playerId: string, kills: number}>} parsedStats - Статистика игроков.
   * @returns {Promise<void>}
   */
  async updatePlayerRatings(parsedStats) {
    const promises = parsedStats.map(async (stat) => {
      const { playerId, kills, mapId } = stat;
      const change = kills || 0;

      if (change === 0) return;

      const player = await this.playerRepo.findById(playerId);
      if (!player) {
        console.warn(`Игрок с id ${playerId} не найден. Пропускаем обновление рейтинга.`);
        return;
      }

      const previousRating = player.rating;
      const newRating = previousRating + change;

      // Обновляем и рейтинг, и запись участия
      await Promise.all([
        this.playerRepo.incrementRating(playerId, change),
        this.playerMapParticipationRepo.upsert({ playerId, mapId }, {
          previousRating,
          newRating,
          ratingChange: change,
        }),
      ]);
    });

    await Promise.all(promises);
  }

  /**
   * Обновляет рейтинги семей и создает записи их участия в карте.
   * @param {object} map - Документ карты.
   * @param {Array<{familyId: string, change: number, isWinner: boolean}>} ratingChanges - Изменения рейтинга.
   * @returns {Promise<void>}
   */
  async updateFamilyRatings(map, ratingChanges) {
    const participantFamilyIds = map.participants.map(p => p.participant._id.toString());
    
    const promises = ratingChanges.map(async ({ familyId, change, isWinner }) => {
      if (!participantFamilyIds.includes(familyId)) {
        console.warn(`Попытка изменить рейтинг для семьи ${familyId}, которая не участник карты ${map._id}.`);
        return;
      }
      if (typeof change !== 'number' || change < 0) {
        throw new ValidationError(`Некорректное изменение рейтинга для семьи ${familyId}: ${change}`);
      }

      if (change === 0) return;

      const family = await this.familyRepo.findById(familyId);
      if (!family) {
        console.warn(`Семья с id ${familyId} не найдена. Пропускаем.`);
        return;
      }

      const previousRating = family.rating;
      const newRating = previousRating + change;

      await Promise.all([
        this.familyRepo.incrementRating(familyId, change),
        this.familyMapParticipationRepo.upsert({ familyId, mapId: map._id }, {
          tournamentId: map.tournament,
          isWinner,
          previousRating,
          newRating,
          ratingChange: change,
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
    // Откат для семей
    const familyParticipations = await this.familyMapParticipationRepo.findAndDeleteByMapId(mapId);
    const familyPromises = familyParticipations.map(record =>
      this.familyRepo.incrementRating(record.familyId, -record.ratingChange)
    );

    // Откат для игроков
    const playerParticipations = await this.playerMapParticipationRepo.findAndDeleteByMapId(mapId);
    const playerPromises = playerParticipations.map(record =>
      this.playerRepo.incrementRating(record.playerId, -record.ratingChange)
    );

    await Promise.all([...familyPromises, ...playerPromises]);
  }
}

export { RatingService }; 