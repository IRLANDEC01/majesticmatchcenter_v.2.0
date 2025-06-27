import { z } from 'zod';
import { ValidationError, NotFoundError, AppError, DuplicateError } from '@/lib/errors';
import { LIFECYCLE_STATUSES as STATUSES } from '@/lib/constants';
import { createMapSchema, updateMapSchema, completeMapSchema } from '@/lib/api/schemas/maps/map-schemas';

// Импортируем все зависимости как синглтоны
import mapRepo from '@/lib/repos/maps/map-repo';
import tournamentRepo from '@/lib/repos/tournaments/tournament-repo';
import mapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';
import familyRepo from '@/lib/repos/families/family-repo';
import playerRepo from '@/lib/repos/players/player-repo';
import ratingService from '@/lib/domain/ratings/rating-service';
import statisticsService from '@/lib/domain/statistics/statistics-service';
import achievementService from '@/lib/domain/achievements/achievement-service';

/**
 * Сервис для управления бизнес-логикой, связанной с картами.
 * инкапсулирует логику работы с репозиторием карт.
 */
class MapService {
  constructor(repos, services) {
    this.repo = repos.mapRepo;
    this.tournamentRepo = repos.tournamentRepo;
    this.mapTemplateRepo = repos.mapTemplateRepo;
    this.familyRepo = repos.familyRepo;
    this.playerRepo = repos.playerRepo;

    this.ratingService = services.ratingService;
    this.statisticsService = services.statisticsService;
    this.achievementService = services.achievementService;
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
    try {
      const validationResult = createMapSchema.safeParse(data);
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
      if (template.archivedAt) {
        throw new ValidationError('Нельзя создать карту из архивного шаблона.');
      }
      
      const mapCount = await this.repo.countByTournamentId(validatedData.tournament);
      const slug = `${tournament.slug}-${template.slug}-${mapCount + 1}`;
      
      const newMapData = {
        ...validatedData,
        slug,
      };
      
      return await this.repo.create(newMapData);
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicateError('Карта с таким slug уже существует.');
      }
      throw error;
    }
  }

  /**
   * Обновляет карту по ID. Слаг не подлежит обновлению.
   * @param {string} id - ID карты.
   * @param {object} data - Данные для обновления.
   * @returns {Promise<Map|null>}
   */
  async updateMap(id, data) {
    const validationResult = updateMapSchema.safeParse(data);
    if (!validationResult.success) {
      throw new ValidationError('Ошибка валидации при обновлении карты', validationResult.error.flatten().fieldErrors);
    }
    
    const { slug, ...updateData } = validationResult.data;
    if (data.slug) {
      console.warn(`Попытка изменить неизменяемый slug для карты ${id} была проигнорирована.`);
    }
    return this.repo.update(id, updateData);
  }

  /**
   * Завершает карту, обновляет статистики и рейтинги.
   * @param {string} mapId - ID карты.
   * @param {object} completionData - Данные для завершения.
   * @returns {Promise<import('@/models/map/Map').Map>}
   */
  async completeMap(mapId, completionData) {
    const validationResult = completeMapSchema.safeParse(completionData);
    if (!validationResult.success) {
      throw new ValidationError('Ошибка валидации при завершении карты', validationResult.error.flatten().fieldErrors);
    }
    const { winnerFamilyId, mvpPlayerId, familyRatingChange, familyResults, playerStats } = validationResult.data;

    const map = await this.repo.findById(mapId);
    if (!map) {
      throw new NotFoundError(`Карта с ID ${mapId} не найдена.`);
    }
    if (map.status !== STATUSES.ACTIVE) {
      throw new AppError(`Нельзя завершить карту со статусом '${map.status}'. Карта должна быть активна.`, 409);
    }

    const updatedMapData = {
      status: STATUSES.COMPLETED,
      winner: winnerFamilyId,
      mvp: mvpPlayerId,
    };
    const completedMap = await this.repo.update(mapId, updatedMapData);
    
    const winnerInfo = { winnerFamilyId, familyRatingChange };
    await this.ratingService.recordFamiliesMapResults(
      mapId,
      completedMap.tournament,
      familyResults,
      winnerInfo
    );

    await this.statisticsService.recordPlayerMapStats(mapId, completedMap.tournament, playerStats);
    
    return completedMap;
  }

  /**
   * Откатывает завершение карты, возвращая ее в активное состояние.
   * @param {string} mapId - ID карты для отката.
   * @returns {Promise<import('@/models/map/Map').Map>}
   */
  async rollbackMapCompletion(mapId) {
    const map = await this.repo.findById(mapId);
    if (!map) {
      throw new NotFoundError(`Карта с ID ${mapId} не найдена.`);
    }

    if (map.status !== STATUSES.COMPLETED) {
      throw new AppError(`Откатить можно только завершенную карту. Текущий статус: '${map.status}'.`, 409);
    }

    await this.ratingService.rollbackMapRatings(mapId);
    await this.statisticsService.rollbackMapStats(mapId);
    // await this.achievementService.rollbackMapCompletion(mapId);

    const rolledBackMapData = {
      status: STATUSES.ACTIVE,
      winner: null,
      mvp: null,
    };
    return this.repo.update(mapId, rolledBackMapData);
  }

  /**
   * Архивирует карту.
   * @param {string} mapId - ID карты для архивации.
   */
  async archiveMap(mapId) {
    const map = await this.repo.findById(mapId);
    if (!map) {
      throw new NotFoundError(`Карта с ID ${mapId} для архивации не найдена.`);
    }
    return this.repo.archive(mapId);
  }
  
  /**
   * Восстанавливает карту из архива.
   * @param {string} mapId - ID карты для восстановления.
   */
  async unarchiveMap(mapId) {
    const map = await this.repo.findById(mapId);
    if (!map) {
      throw new NotFoundError(`Карта с ID ${mapId} для восстановления не найдена.`);
    }
    return this.repo.unarchive(mapId);
  }
}

// Создаем единственный экземпляр сервиса со всеми зависимостями
const mapService = new MapService(
  {
    mapRepo,
    tournamentRepo,
    mapTemplateRepo,
    familyRepo,
    playerRepo,
  },
  {
    ratingService,
    statisticsService,
    achievementService,
  }
);

export default mapService;