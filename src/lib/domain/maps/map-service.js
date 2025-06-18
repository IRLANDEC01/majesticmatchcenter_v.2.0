import { z } from 'zod';
import { ValidationError, NotFoundError, AppError } from '@/lib/errors';

// Больше нет прямых импортов репозиториев и сервисов
// Они будут передаваться через конструктор

// Схемы валидации Zod, которые были случайно удалены
const mapSchema = z.object({
  name: z.string().trim().min(1, 'Название карты обязательно.'),
  tournament: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), 'Некорректный ID турнира.'),
  template: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), 'Некорректный ID шаблона.'),
  startDateTime: z.coerce.date({ required_error: 'Дата и время начала обязательны.' }),
});

const completionSchema = z.object({
  winnerFamilyId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), 'Некорректный ID семьи-победителя.'),
  mvpPlayerId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), 'Некорректный ID MVP.'),
  ratingChanges: z.array(z.object({
    familyId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val)),
    change: z.number().nonnegative(),
  })).optional(),
  playerStats: z.array(z.any()).optional(),
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
   * @param {string} completionData.winnerFamilyId - ID победившей семьи/команды.
   * @param {string} completionData.mvpPlayerId - ID самого ценного игрока.
   * @param {Array<{familyId: string, change: number}>} [completionData.ratingChanges] - Опциональные изменения рейтинга семей.
   * @param {Array<object>} [completionData.playerStats] - Опциональная статистика игроков из JSON.
   * @returns {Promise<import('@/models/map/Map').Map>}
   */
  async completeMap(mapId, completionData) {
    const validationResult = completionSchema.safeParse(completionData);
    if (!validationResult.success) {
      throw new ValidationError('Ошибка валидации при завершении карты', validationResult.error.flatten().fieldErrors);
    }
    const { winnerFamilyId, mvpPlayerId, ratingChanges, playerStats } = validationResult.data;

    const map = await this.repo.findById(mapId);

    if (!map) {
      throw new NotFoundError(`Карта с ID ${mapId} не найдена.`);
    }
    if (map.status !== 'active') {
      throw new AppError(`Нельзя завершить карту со статусом '${map.status}'. Карта должна быть активна.`, 409);
    }

    const [winner, mvp] = await Promise.all([
      this.familyRepo.findById(winnerFamilyId),
      this.playerRepo.findById(mvpPlayerId),
    ]);
    
    if (!winner) throw new NotFoundError(`Семья-победитель с ID ${winnerFamilyId} не найдена.`);
    if (!mvp) throw new NotFoundError(`Игрок MVP с ID ${mvpPlayerId} не найден.`);


    // 1. Обновляем рейтинги семей (если данные предоставлены)
    if (ratingChanges && ratingChanges.length > 0) {
      // Добавляем информацию о победителе в данные для FamilyRating
      const ratingChangesWithWinner = ratingChanges.map(rc => ({
        ...rc,
        isWinner: rc.familyId === winnerFamilyId,
      }));
      await this.ratingService.updateFamilyRatings(map, ratingChangesWithWinner);
    }

    // 2. Обрабатываем статистику и рейтинг игроков (если данные предоставлены)
    if (playerStats && playerStats.length > 0) {
      const statsWithPlayerIds = await this.statisticsService.parseAndApplyMapStats(mapId, map.tournament, playerStats);
      await this.ratingService.updatePlayerRatings(statsWithPlayerIds);
    }
    
    // 3. Обновляем саму карту
    const updatedMapData = {
      status: 'completed',
      winner: winnerFamilyId,
      mvp: mvpPlayerId,
      // ratingChanges are not stored on the map document itself anymore.
    };
    const completedMap = await this.repo.update(mapId, updatedMapData);


    // 4. Генерируем достижения
    // await this.achievementService.processMapCompletionAchievements(mapId, completedMap, playerStats || []);

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

    if (map.status !== 'completed') {
      throw new AppError(`Откатить можно только завершенную карту. Текущий статус: '${map.status}'.`, 409);
    }

    // 1. Откатываем все связанные данные
    await this.ratingService.rollbackMapRatings(mapId);
    await this.statisticsService.rollbackMapStats(mapId);
    // await this.achievementService.rollbackMapAchievements(mapId);

    // 2. Сбрасываем состояние карты
    const rolledBackMapData = {
      status: 'active',
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
    const result = await this.repo.archive(mapId);
    if (!result) {
      throw new NotFoundError(`Карта с ID ${mapId} для архивации не найдена.`);
    }
    return result;
  }
  
  /**
   * Восстанавливает карту из архива.
   * @param {string} mapId - ID карты для восстановления.
   */
  async unarchiveMap(mapId) {
    const result = await this.repo.unarchive(mapId);
    if (!result) {
      throw new NotFoundError(`Карта с ID ${mapId} для восстановления не найдена.`);
    }
    return result;
  }
}

// Удаляем старый экспорт синглтона
export { MapService }; 