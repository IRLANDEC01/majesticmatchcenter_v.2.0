import { z } from 'zod';
import { mapRepo } from '@/lib/repos/maps/map-repo';
import { tournamentRepo } from '@/lib/repos/tournaments/tournament-repo.js';
import { mapTemplateRepo } from '@/lib/repos/map-templates/map-template-repo.js';
import { RatingService } from '@/lib/domain/ratings/rating-service';
import { StatisticsService } from '@/lib/domain/statistics/statistics-service';
import { AchievementService } from '@/lib/domain/achievements/achievement-service';
import { ValidationError, NotFoundError } from '@/lib/errors';

const ratingService = new RatingService();
const statisticsService = new StatisticsService();
const achievementService = new AchievementService();

const mapSchema = z.object({
  name: z.string().trim().min(1, 'Название карты обязательно.'),
  tournament: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), 'Некорректный ID турнира.'),
  template: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), 'Некорректный ID шаблона.'),
  startDateTime: z.coerce.date({ required_error: 'Дата и время начала обязательны.' }),
});

/**
 * Сервис для управления бизнес-логикой, связанной с картами.
 * инкапсулирует логику работы с репозиторием карт.
 */
class MapService {
  constructor(repos) {
    this.repo = repos.mapRepo;
    this.tournamentRepo = repos.tournamentRepo;
    this.mapTemplateRepo = repos.mapTemplateRepo;
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
   * Создает новую карту с уникальным slug.
   * @param {object} data - Данные для создания карты.
   * @returns {Promise<Map>}
   */
  async createMap(data) {
    const validationResult = mapSchema.safeParse(data);
    if (!validationResult.success) {
      throw new ValidationError('Ошибка валидации при создании карты', validationResult.error.flatten().fieldErrors);
    }
    const validatedData = validationResult.data;

    const tournament = await this.tournamentRepo.findById(validatedData.tournament);
    if (!tournament) {
      throw new NotFoundError(`Родительский турнир с id ${validatedData.tournament} не найден.`);
    }

    const template = await this.mapTemplateRepo.findById(validatedData.template);
    if (!template) {
      throw new NotFoundError(`Шаблон карты с id ${validatedData.template} не найден.`);
    }
    
    // Порядковый номер карты в турнире
    const mapCount = await this.repo.countByTournamentId(validatedData.tournament);
    const slug = `${tournament.slug}-${template.slug}-${mapCount + 1}`;
    
    const newMapData = {
      ...validatedData,
      slug,
    };
    
    return this.repo.create(newMapData);
  }

  /**
   * Обновляет карту по ID. Слаг не подлежит обновлению.
   * @param {string} id - ID карты.
   * @param {object} data - Данные для обновления.
   * @returns {Promise<Map|null>}
   */
  async updateMap(id, data) {
    // Удаляем slug из данных, чтобы его нельзя было изменить.
    const { slug, ...updateData } = data;
    if (slug) {
      // Можно логировать попытку изменения слага, если это важно.
      console.warn(`Попытка изменить неизменяемый slug для карты ${id} была проигнорирована.`);
    }
    return this.repo.update(id, updateData);
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

export const mapService = new MapService({
  mapRepo,
  tournamentRepo,
  mapTemplateRepo,
}); 