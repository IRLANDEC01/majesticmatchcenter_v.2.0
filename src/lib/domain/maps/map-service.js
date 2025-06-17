import { mapRepo } from '@/lib/repos/maps/map-repo';
import Map from '@/models/map/Map';
import Tournament from '@/models/tournament/Tournament.js';
import { mapTemplateRepository } from '@/lib/repos/map-templates/map-template-repo.js';
import { ratingService } from '@/lib/domain/ratings/rating-service';
import { statisticsService } from '@/lib/domain/statistics/statistics-service';
import { achievementService } from '@/lib/domain/achievements/achievement-service';

/**
 * Сервис для управления бизнес-логикой, связанной с картами.
 * инкапсулирует логику работы с репозиторием карт.
 */
class MapService {
  constructor(repo) {
    this.repo = repo;
  }

  /**
   * Получает все карты.
   * @param {object} [options] - Опции для получения карт.
   * @returns {Promise<Map[]>}
   */
  async getAllMaps(options) {
    return this.repo.getAll(options);
  }

  /**
   * Находит карту по ID.
   * @param {string} id - ID карты.
   * @returns {Promise<Map|null>}
   */
  async getMapById(id) {
    return this.repo.findById(id);
  }

  /**
   * Создает новую карту.
   * @param {object} data - Данные для создания карты.
   * @returns {Promise<Map>}
   */
  async createMap(data) {
    // В будущем здесь может быть более сложная бизнес-логика
    return this.repo.create(data);
  }

  /**
   * Обновляет карту по ID.
   * @param {string} id - ID карты.
   * @param {object} data - Данные для обновления.
   * @returns {Promise<Map|null>}
   */
  async updateMap(id, data) {
    return this.repo.update(id, data);
  }

  /**
   * Завершает карту, обновляет статистики и рейтинги.
   * @param {string} mapId - ID карты.
   * @param {object} completionData - Данные для завершения.
   * @param {string} completionData.winnerId - ID победителя.
   * @param {string} completionData.mvpPlayerId - ID MVP.
   * @param {object[]} [completionData.statistics] - Опциональная статистика.
   * @param {object[]} [completionData.familyRatingChanges] - Опциональные изменения рейтинга семей.
   */
  async completeMap(mapId, { winnerId, mvpPlayerId, statistics, familyRatingChanges }) {
    // TODO: Добавить валидацию, что карта в статусе 'active'

    if (statistics) {
      await ratingService.updatePlayerRatingsFromStats(mapId, statistics);
      await statisticsService.updatePlayerStatsFromMap(mapId, statistics);
      await achievementService.createMapAchievements(mapId, mvpPlayerId, statistics);
    }
    
    if (familyRatingChanges) {
      await ratingService.updateFamilyRatings(mapId, familyRatingChanges);
    }
    
    await statisticsService.updateFamilyStatsFromMap(mapId, winnerId);

    const updatedMap = await this.repo.update(mapId, {
      status: 'completed',
      winner: winnerId,
      mvp: mvpPlayerId,
    });

    return updatedMap;
  }

  /**
   * Откатывает результаты завершенной карты.
   * @param {string} mapId - ID карты.
   */
  async rollbackMapCompletion(mapId) {
    // TODO: Добавить валидацию, что карта в статусе 'completed'
    
    await ratingService.rollbackMapRatings(mapId);
    await statisticsService.rollbackMapStats(mapId);
    await achievementService.deleteMapAchievements(mapId);

    const rolledBackMap = await this.repo.update(mapId, {
      status: 'active',
      winner: null,
      mvp: null,
    });

    return rolledBackMap;
  }

  /**
   * Архивирует карту.
   * @param {string} mapId - ID карты для архивации.
   */
  async archiveMap(mapId) {
    return this.repo.archive(mapId);
  }
  
  /**
   * Восстанавливает карту из архива.
   * @param {string} mapId - ID карты для восстановления.
   */
  async unarchiveMap(mapId) {
    return this.repo.unarchive(mapId);
  }
}

export const mapService = new MapService(mapRepo); 