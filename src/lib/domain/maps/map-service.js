import { mapRepo } from '@/lib/repos/maps/map-repo';
import Map from '@/models/map/Map';
import Tournament from '@/models/tournament/Tournament.js';
import { mapTemplateRepository } from '@/lib/repos/map-templates/map-template-repo.js';
import { RatingService } from '@/lib/domain/ratings/rating-service';
import { StatisticsService } from '@/lib/domain/statistics/statistics-service';
import { AchievementService } from '@/lib/domain/achievements/achievement-service';

const ratingService = new RatingService();
const statisticsService = new StatisticsService();
const achievementService = new AchievementService();

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
   * @param {string} completionData.winnerId - ID победившей семьи/команды.
   * @param {string} completionData.mvpId - ID самого ценного игрока.
   * @param {Array<{familyId: string, change: number}>} [completionData.ratingChanges] - Опциональные изменения рейтинга семей.
   * @param {Array<object>} [completionData.statistics] - Опциональная статистика игроков из JSON.
   * @returns {Promise<import('@/models/map/Map').Map>}
   */
  async completeMap(mapId, { winnerId, mvpId, ratingChanges, statistics }) {
    if (!winnerId || !mvpId) {
      throw new Error('Winner and MVP must be selected to complete a map.');
    }

    // 1. Обновляем саму карту
    const updatedMapData = {
      status: 'completed',
      winner: winnerId,
      mvp: mvpId,
      ratingChanges, // Сохраняем для истории и отката
    };
    const completedMap = await this.repo.update(mapId, updatedMapData);

    // 2. Обновляем рейтинги семей (если данные предоставлены)
    if (ratingChanges && ratingChanges.length > 0) {
      await ratingService.updateFamilyRatings(mapId, ratingChanges);
    }

    // 3. Обрабатываем статистику и рейтинг игроков (если данные предоставлены)
    if (statistics && statistics.length > 0) {
      await statisticsService.processAndApplyStatistics(mapId, statistics);
      await ratingService.updatePlayerRatings(mapId, statistics);
    }

    // 4. Генерируем достижения
    await achievementService.processMapCompletionAchievements(mapId, completedMap, statistics || []);

    return completedMap;
  }

  /**
   * Откатывает завершение карты, возвращая ее в активное состояние.
   * @param {string} mapId - ID карты для отката.
   * @returns {Promise<import('@/models/map/Map').Map>}
   */
  async rollbackMapCompletion(mapId) {
    // 1. Откатываем все связанные данные
    await ratingService.rollbackMapRatings(mapId);
    await statisticsService.rollbackStatistics(mapId);
    await achievementService.rollbackMapAchievements(mapId);

    // 2. Сбрасываем состояние карты
    const rolledBackMapData = {
      status: 'active',
      winner: null,
      mvp: null,
      ratingChanges: [],
    };
    const rolledBackMap = await this.repo.update(mapId, rolledBackMapData);

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