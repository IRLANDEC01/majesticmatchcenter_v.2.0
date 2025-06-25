import mongoose, { HydratedDocument } from 'mongoose';
import tournamentTemplateRepo from '@/lib/repos/tournament-templates/tournament-template-repo';
import { ConflictError, NotFoundError } from '@/lib/errors';
import mapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';
import { ITournamentTemplate } from '@/models/tournament/TournamentTemplate';
import { IMapTemplate } from '@/models/map/MapTemplate';
import {
  CreateTournamentTemplateDto,
  GetTournamentTemplatesDto,
  UpdateTournamentTemplateDto,
} from '@/lib/api/schemas/tournament-templates/tournament-template-schemas';
import { IFindResult } from '@/lib/repos/base-repo';

/**
 * @class TournamentTemplateService
 * @description Сервис для управления бизнес-логикой шаблонов турниров.
 */
class TournamentTemplateService {
  private repo = tournamentTemplateRepo;
  private mapTemplateRepo = mapTemplateRepo;

  /**
   * @description Находит один шаблон турнира по его ID.
   * @param {string} id - ID искомого шаблона.
   * @returns {Promise<ITournamentTemplate>} Найденный шаблон.
   * @throws {NotFoundError} Если шаблон с таким ID не найден.
   */
  async getTournamentTemplateById(id: string): Promise<HydratedDocument<ITournamentTemplate>> {
    const template = await this.repo.findById(id);
    if (!template) {
      throw new NotFoundError(`Шаблон турнира с ID ${id} не найден.`);
    }
    return template;
  }

  /**
   * @description Возвращает список всех шаблонов турниров с поддержкой пагинации, фильтрации и поиска.
   * @param {GetTournamentTemplatesDto} params - Параметры для поиска и фильтрации.
   * @returns {Promise<IFindResult<ITournamentTemplate>>} Результат поиска с пагинацией.
   */
  async getTournamentTemplates(params: GetTournamentTemplatesDto): Promise<IFindResult<ITournamentTemplate>> {
    const { page, limit, q, status } = params;
    const query: mongoose.FilterQuery<ITournamentTemplate> = {};

    if (q) {
      query.name = { $regex: q, $options: 'i' };
    }

    return this.repo.find({
      query,
      page,
      limit,
      status,
    });
  }

  /**
   * @description Создает новый шаблон турнира.
   * @param {CreateTournamentTemplateDto} data - DTO с данными для создания.
   * @returns {Promise<ITournamentTemplate>} Созданный шаблон турнира.
   */
  async createTournamentTemplate(data: CreateTournamentTemplateDto): Promise<HydratedDocument<ITournamentTemplate>> {
    const { name } = data;
    const existingTemplate = await this.repo.find({ query: { name }, limit: 1 });
    if (existingTemplate.total > 0) {
      throw new ConflictError(`Шаблон турнира с именем "${name}" уже существует.`);
    }

    return this.repo.create(data as any);
  }

  /**
   * @description Обновляет существующий шаблон турнира.
   * @param {string} id - ID обновляемого шаблона.
   * @param {UpdateTournamentTemplateDto} data - DTO с данными для обновления.
   * @returns {Promise<ITournamentTemplate>} Обновленный шаблон турнира.
   */
  async updateTournamentTemplate(id: string, data: UpdateTournamentTemplateDto): Promise<HydratedDocument<ITournamentTemplate>> {
    // Шаг 1: Убеждаемся, что шаблон вообще существует, прежде чем что-либо делать.
    await this.getTournamentTemplateById(id);

    // Шаг 2: Выполняем бизнес-логику, специфичную для сервиса.
    // Проверка на уникальность имени, если оно было предоставлено в данных для обновления.
    if (data.name) {
      const existingByName = await this.repo.findOne({ name: data.name });
      if (existingByName && existingByName.id !== id) {
        throw new ConflictError(`Шаблон турнира с именем "${data.name}" уже существует.`);
      }
    }

    // Проверка существования и статуса шаблонов карт, если они были переданы.
    if (data.mapTemplates) {
      await this.validateMapTemplates(data.mapTemplates as string[]);
    }

    // Шаг 3: Делегируем операцию обновления репозиторию.
    // BaseRepo обработает find-and-save и создаст запись в логе аудита.
    // Используем "as any" для обхода строгой типизации TS, т.к. Mongoose
    // самостоятельно кастует string[] в ObjectId[] при сохранении.
    return this.repo.update(id, data as any);
  }

  /**
   * @description Архивирует шаблон турнира.
   * @param {string} id - ID шаблона для архивации.
   * @returns {Promise<ITournamentTemplate>} Архивированный шаблон.
   * @throws {ConflictError} Если шаблон уже заархивирован.
   */
  async archiveTournamentTemplate(id: string): Promise<HydratedDocument<ITournamentTemplate>> {
    const template = await this.repo.findById(id, { includeArchived: true });
    if (!template) {
      throw new NotFoundError(`Шаблон турнира с ID ${id} не найден.`);
    }
    if (template.archivedAt) {
      throw new ConflictError('Этот шаблон турнира уже находится в архиве.');
    }

    // Делегируем операцию репозиторию, который содержит логику аудита
    return this.repo.archive(id);
  }

  /**
   * @description Восстанавливает шаблон турнира из архива.
   * @param {string} id - ID шаблона для восстановления.
   * @returns {Promise<ITournamentTemplate>} Восстановленный шаблон.
   * @throws {ConflictError} Если шаблон не находится в архиве.
   */
  async restoreTournamentTemplate(id: string): Promise<HydratedDocument<ITournamentTemplate>> {
    const template = await this.repo.findById(id, { includeArchived: true });
    if (!template) {
      throw new NotFoundError(`Шаблон турнира с ID ${id} не найден.`);
    }
    if (!template.archivedAt) {
      throw new ConflictError('Этот шаблон турнира не находится в архиве.');
    }

    // Делегируем операцию репозиторию, который содержит логику аудита
    return this.repo.restore(id);
  }

  /**
   * @private
   * @description Проверяет, что все переданные ID шаблонов карт существуют и не заархивированы.
   * @param {string[]} mapTemplateIds - Массив ID шаблонов карт для проверки.
   * @throws {NotFoundError} Если какой-либо ID не найден.
   * @throws {ConflictError} Если какой-либо из шаблонов карт заархивирован.
   */
  private async validateMapTemplates(mapTemplateIds: string[]) {
    if (!mapTemplateIds || mapTemplateIds.length === 0) {
      return;
    }
    
    const queryResult = await this.mapTemplateRepo.find({
      query: { _id: { $in: mapTemplateIds } },
      limit: mapTemplateIds.length,
    });
    const existingMapTemplates = queryResult.data;
    
    if (existingMapTemplates.length !== mapTemplateIds.length) {
      const foundIds = new Set(existingMapTemplates.map(t => String(t._id)));
      const notFoundId = mapTemplateIds.find(id => !foundIds.has(id));
      throw new NotFoundError(`Шаблон карты с ID ${notFoundId} не найден.`);
    }

    const archivedTemplate = existingMapTemplates.find((mt) => mt.archivedAt);
    if (archivedTemplate) {
      throw new ConflictError(`Нельзя добавить в шаблон архивированную карту: ${archivedTemplate.name} (ID: ${archivedTemplate.id}).`);
    }
  }
}

const tournamentTemplateService = new TournamentTemplateService();
export default tournamentTemplateService;