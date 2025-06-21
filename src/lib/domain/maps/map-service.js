import { z } from 'zod';
import { mapRepo } from '@/lib/repos/maps/map-repo';
import { tournamentRepo } from '@/lib/repos/tournaments/tournament-repo.js';
import { mapTemplateRepo } from '@/lib/repos/map-templates/map-template-repo.js';
import { familyRepo } from '@/lib/repos/families/family-repo.js';
import { playerRepo } from '@/lib/repos/players/player-repo.js';
import { ratingService } from '@/lib/domain/ratings/rating-service';
import { statisticsService } from '@/lib/domain/statistics/statistics-service';
import { AchievementService } from '@/lib/domain/achievements/achievement-service';
import { ValidationError, NotFoundError, AppError } from '@/lib/errors';
import { STATUSES } from '@/lib/constants';
import { createMapSchema } from '@/lib/api/schemas/maps/map-schemas';

// Services are now injected, not instantiated here.
const achievementService = new AchievementService(); // This one remains as it's not refactored yet.

const completionSchema = z.object({
  winnerFamilyId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), 'Некорректный ID семьи-победителя.'),
  mvpPlayerId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), 'Некорректный ID MVP.'),
  familyRatingChange: z.number().nonnegative('Рейтинг не может быть отрицательным.'),
  familyResults: z.array(z.object({
    familyId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val)),
    points: z.number().nonnegative('Турнирные очки не могут быть отрицательными.'),
  })).optional(),
  playerStats: z.array(z.object({
    playerId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val)),
    // Мы не будем здесь валидировать всю структуру статистики,
    // доверяя, что она приходит в правильном формате.
    // Валидация будет на более глубоких слоях, если потребуется.
  }).passthrough()),
});

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

    // Привязываем контекст this ко всем методам, чтобы избежать его потери
    this.getAllMaps = this.getAllMaps.bind(this);
    this.getMapById = this.getMapById.bind(this);
    this.createMap = this.createMap.bind(this);
    this.updateMap = this.updateMap.bind(this);
    this.completeMap = this.completeMap.bind(this);
    this.rollbackMapCompletion = this.rollbackMapCompletion.bind(this);
    this.archiveMap = this.archiveMap.bind(this);
    this.unarchiveMap = this.unarchiveMap.bind(this);
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
   * @param {string} completionData.winnerFamilyId - ID победившей семьи/команды.
   * @param {string} completionData.mvpPlayerId - ID самого ценного игрока.
   * @param {number} completionData.familyRatingChange - Изменение рейтинга для семьи-победителя.
   * @param {Array<object>} completionData.playerStats - Статистика всех игроков.
   * @returns {Promise<import('@/models/map/Map').Map>}
   */
  async completeMap(mapId, completionData) {
    const validationResult = completionSchema.safeParse(completionData);
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

    // На следующих шагах мы раскомментируем и реализуем вызовы других сервисов.
    const updatedMapData = {
      status: STATUSES.COMPLETED,
      winner: winnerFamilyId,
      mvp: mvpPlayerId,
    };
    const completedMap = await this.repo.update(mapId, updatedMapData);
    
    // Шаг 2 - Вызвать ratingService для обновления рейтинга семьи и записи турнирных очков.
    await this.ratingService.recordFamiliesMapResults(mapId, completedMap.tournament, familyResults, { winnerFamilyId, familyRatingChange });

    // Шаг 3 - Вызвать statisticsService для сохранения статистики игроков
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

    // 1. Откатываем все связанные данные
    await this.ratingService.rollbackMapRatings(mapId);
    await this.statisticsService.rollbackMapStats(mapId);
    // await this.achievementService.rollbackMapAchievements(mapId);

    // 2. Сбрасываем состояние карты
    const rolledBackMapData = {
      status: STATUSES.ACTIVE,
      winner: null,
      mvp: null,
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

export const mapService = new MapService(
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