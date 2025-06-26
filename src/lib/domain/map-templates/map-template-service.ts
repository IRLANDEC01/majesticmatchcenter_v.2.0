import { HydratedDocument, UpdateQuery } from 'mongoose';
import mapTemplateRepo, { IMapTemplateRepo } from '@/lib/repos/map-templates/map-template-repo';
import searchQueue from '@/queues/search-queue';
import tournamentTemplateRepo from '@/lib/repos/tournament-templates/tournament-template-repo';
import { IMapTemplate } from '@/models/map/MapTemplate';
import { NotFoundError, ConflictError } from '@/lib/errors';
import { IFindParams, IFindResult } from '@/lib/repos/base-repo';
import { GetMapTemplatesDto, CreateMapTemplateDto, UpdateMapTemplateDto } from '@/lib/api/schemas/map-templates/map-template-schemas';

export interface IMapTemplateService {
  createMapTemplate(data: CreateMapTemplateDto): Promise<HydratedDocument<IMapTemplate>>;
  getMapTemplates(options: GetMapTemplatesDto): Promise<IFindResult<IMapTemplate>>;
  getMapTemplateById(id: string): Promise<HydratedDocument<IMapTemplate>>;
  updateMapTemplate(id: string, data: UpdateMapTemplateDto): Promise<HydratedDocument<IMapTemplate>>;
  archiveMapTemplate(id: string): Promise<HydratedDocument<IMapTemplate>>;
  restoreMapTemplate(id: string): Promise<HydratedDocument<IMapTemplate>>;
}

/**
 * Cервис для управления бизнес-логикой шаблонов карт.
 */
class MapTemplateService implements IMapTemplateService {
  constructor(private repo: IMapTemplateRepo) {}

  /**
   * Создает новый шаблон карты.
   * @param {CreateMapTemplateDto} data - Данные для создания шаблона.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Созданный объект шаблона карты.
   */
  async createMapTemplate(data: CreateMapTemplateDto): Promise<HydratedDocument<IMapTemplate>> {
    const existingTemplate = await this.repo.findOne({ name: data.name });
    if (existingTemplate) {
      throw new ConflictError(`Шаблон карты с именем "${data.name}" уже существует.`);
    }
    const newTemplate = await this.repo.create(data);
    await searchQueue.add('update-index', { entity: 'map-template', id: newTemplate.id });
    return newTemplate;
  }

  /**
   * Возвращает все шаблоны карт с возможностью фильтрации и пагинации.
   * @param {GetMapTemplatesDto} options - Опции для фильтрации и пагинации.
   * @returns {Promise<IFindResult<IMapTemplate>>}
   */
  async getMapTemplates(options: GetMapTemplatesDto): Promise<IFindResult<IMapTemplate>> {
    const { page, limit, q, status } = options;
    const query: UpdateQuery<IMapTemplate> = {};

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
   * Получает шаблон карты по ID.
   * @param {string} id - ID шаблона.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Найденный шаблон.
   * @throws {NotFoundError} - если шаблон не найден.
   */
  async getMapTemplateById(id: string): Promise<HydratedDocument<IMapTemplate>> {
    const template = await this.repo.findById(id);
    if (!template) {
      throw new NotFoundError(`Шаблон карты с ID ${id} не найден.`);
    }
    return template;
  }

  /**
   * Обновляет шаблон карты.
   * @param {string} id - ID шаблона.
   * @param {UpdateMapTemplateDto} data - Данные для обновления.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Обновленный объект шаблона карты.
   */
  async updateMapTemplate(id: string, data: UpdateMapTemplateDto): Promise<HydratedDocument<IMapTemplate>> {
    const templateToUpdate = await this.getMapTemplateById(id);

    if (data.name && data.name !== templateToUpdate.name) {
      const existingTemplate = await this.repo.findOne({ name: data.name });
      if (existingTemplate && existingTemplate.id !== id) {
        throw new ConflictError(`Шаблон карты с именем "${data.name}" уже существует.`);
      }
    }
    
    Object.assign(templateToUpdate, data);
    
    const updatedTemplate = await this.repo.save(templateToUpdate);
    await searchQueue.add('update-index', { entity: 'map-template', id: updatedTemplate.id });
    return updatedTemplate;
  }

  /**
   * Архивирует шаблон карты.
   * @param {string} id - ID шаблона для архивации.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Архивированный шаблон.
   */
  async archiveMapTemplate(id: string): Promise<HydratedDocument<IMapTemplate>> {
    const template = await this.repo.findById(id, { includeArchived: true });

    if (!template) {
      throw new NotFoundError(`Шаблон карты с ID ${id} для архивации не найден.`);
    }

    if (template.archivedAt) {
      throw new ConflictError('Этот шаблон уже находится в архиве.');
    }
    
    const archivedTemplate = await this.repo.archive(id);
    await searchQueue.add('update-index', { entity: 'map-template', id: archivedTemplate.id });
    return archivedTemplate;
  }

  /**
   * Восстанавливает шаблон карты из архива.
   * @param {string} id - ID шаблона для восстановления.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Восстановленный шаблон.
   */
  async restoreMapTemplate(id: string): Promise<HydratedDocument<IMapTemplate>> {
    const template = await this.repo.findById(id, { includeArchived: true });

    if (!template) {
      throw new NotFoundError(`Шаблон карты с ID ${id} для восстановления не найден.`);
    }
    if (!template.archivedAt) {
      throw new ConflictError('Этот шаблон не находится в архиве.');
    }

    const restoredTemplate = await this.repo.restore(id);
    await searchQueue.add('update-index', { entity: 'map-template', id: restoredTemplate.id });
    return restoredTemplate;
  }
}

const mapTemplateService = new MapTemplateService(mapTemplateRepo);
export default mapTemplateService; 