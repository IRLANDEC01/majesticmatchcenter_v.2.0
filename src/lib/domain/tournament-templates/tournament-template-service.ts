import mongoose from 'mongoose';
import tournamentTemplateRepo from '@/lib/repos/tournament-templates/tournament-template-repo';
import { ConflictError, NotFoundError } from '@/lib/errors';
import mapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';
import { ITournamentTemplate } from '@/models/tournament/TournamentTemplate';
import { IMapTemplate } from '@/models/map/MapTemplate';
import { CreateTournamentTemplateDto, UpdateTournamentTemplateDto } from '@/lib/api/schemas/tournament-templates/tournament-template-schemas';
import { IFindParams } from '@/lib/repos/base-repo';
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
  async getTournamentTemplateById(id: string): Promise<ITournamentTemplate> {
    const template = await this.repo.findById(id);
    if (!template) {
      throw new NotFoundError(`Шаблон турнира с ID ${id} не найден.`);
    }
    return template;
  }

  /**
   * @description Возвращает список всех шаблонов турниров.
   * @param {boolean} [includeArchived=false] - Флаг, указывающий, включать ли архивные шаблоны в выборку.
   * @returns {Promise<IFindResult<ITournamentTemplate>>} Результат поиска с пагинацией.
   */
  async getTournamentTemplates(includeArchived: boolean = false): Promise<IFindResult<ITournamentTemplate>> {
    const params: IFindParams<ITournamentTemplate> = {};
    if (includeArchived) {
      params.status = 'all';
    }
    return this.repo.find(params);
  }

  /**
   * @description Создает новый шаблон турнира.
   * @param {CreateTournamentTemplateDto} data - DTO с данными для создания.
   * @returns {Promise<ITournamentTemplate>} Созданный шаблон турнира.
   */
  async createTournamentTemplate(data: CreateTournamentTemplateDto): Promise<ITournamentTemplate> {
    const { name, mapTemplates, ...remaningData } = data;
    const existingTemplate = await this.repo.find({ filter: { name }, limit: 1 });
    if (existingTemplate.total > 0) {
      throw new ConflictError(`Шаблон турнира с именем "${name}" уже существует.`);
    }

    const finalData = {
      ...remaningData,
      name,
      mapTemplates: mapTemplates.map(id => new mongoose.Types.ObjectId(id)),
    };

    return this.repo.create(finalData as any);
  }

  /**
   * @description Обновляет существующий шаблон турнира.
   * @param {string} id - ID обновляемого шаблона.
   * @param {UpdateTournamentTemplateDto} data - DTO с данными для обновления.
   * @returns {Promise<ITournamentTemplate>} Обновленный шаблон турнира.
   */
  async updateTournamentTemplate(id: string, data: UpdateTournamentTemplateDto): Promise<ITournamentTemplate> {
    const template = await this.getTournamentTemplateById(id);

    if (data.mapTemplates) {
      await this.validateMapTemplates(data.mapTemplates);
    }
    
    const updatedTemplate = await this.repo.update(id, data);
    if (!updatedTemplate) {
      throw new NotFoundError(`Шаблон турнира с ID ${id} не найден для обновления.`);
    }
    return updatedTemplate;
  }

  /**
   * @description Архивирует шаблон турнира.
   * @param {string} id - ID шаблона для архивации.
   * @returns {Promise<ITournamentTemplate>} Архивированный шаблон.
   * @throws {ConflictError} Если шаблон уже заархивирован.
   */
  async archiveTournamentTemplate(id: string): Promise<ITournamentTemplate> {
    const template = await this.repo.findById(id, { includeArchived: true });
    if (!template) {
      throw new NotFoundError(`Шаблон турнира с ID ${id} не найден.`);
    }
    if (template.archivedAt) {
      throw new ConflictError('Этот шаблон турнира уже находится в архиве.');
    }
    const archivedTemplate = await this.repo.archive(id);
    if (!archivedTemplate) {
      throw new NotFoundError(`Шаблон турнира с ID ${id} не найден для архивации.`);
    }
    return archivedTemplate;
  }

  /**
   * @description Восстанавливает шаблон турнира из архива.
   * @param {string} id - ID шаблона для восстановления.
   * @returns {Promise<ITournamentTemplate>} Восстановленный шаблон.
   * @throws {ConflictError} Если шаблон не находится в архиве.
   */
  async restoreTournamentTemplate(id: string): Promise<ITournamentTemplate> {
    const template = await this.repo.findById(id, { includeArchived: true });
    if (!template) {
      throw new NotFoundError(`Шаблон турнира с ID ${id} не найден.`);
    }
    if (!template.archivedAt) {
      throw new ConflictError('Этот шаблон турнира не находится в архиве.');
    }
    const restoredTemplate = await this.repo.restore(id);
    if (!restoredTemplate) {
      throw new NotFoundError(`Шаблон турнира с ID ${id} не найден для восстановления.`);
    }
    return restoredTemplate;
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
      filter: { _id: { $in: mapTemplateIds } },
      limit: mapTemplateIds.length,
    });
    const existingMapTemplates = queryResult.data;
    
    if (existingMapTemplates.length !== mapTemplateIds.length) {
      const foundIds = new Set(existingMapTemplates.map(t => String(t._id)));
      const notFoundId = mapTemplateIds.find(id => !foundIds.has(id));
      throw new NotFoundError(`Шаблон карты с ID ${notFoundId} не найден.`);
    }

    const archivedTemplate = existingMapTemplates.find((mt: IMapTemplate) => mt.isArchived);
    if (archivedTemplate) {
      throw new ConflictError(`Нельзя добавить в шаблон архивированную карту: ${archivedTemplate.name} (ID: ${(archivedTemplate._id as mongoose.Types.ObjectId).toString()}).`);
    }
  }
}

const tournamentTemplateService = new TournamentTemplateService();
export default tournamentTemplateService;