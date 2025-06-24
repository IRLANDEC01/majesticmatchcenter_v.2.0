import { HydratedDocument, UpdateQuery } from 'mongoose';
import mapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';
import tournamentTemplateRepo from '@/lib/repos/tournament-templates/tournament-template-repo';
import { IMapTemplate } from '@/models/map/MapTemplate';
import { NotFoundError, ConflictError } from '@/lib/errors';
import { IFindParams, IFindResult } from '@/lib/repos/base-repo';
import { CreateMapTemplateDto, UpdateMapTemplateDto } from '@/lib/api/schemas/map-templates/map-template-schemas';

/**
 * Cервис для управления бизнес-логикой шаблонов карт.
 */
class MapTemplateService {
  constructor(private repo: typeof mapTemplateRepo) {}

  /**
   * Создает новый шаблон карты.
   * @param {CreateMapTemplateDto} templateData - Данные для создания шаблона.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Созданный объект шаблона карты.
   */
  async createMapTemplate(templateData: CreateMapTemplateDto): Promise<HydratedDocument<IMapTemplate>> {
    // Логика обработки дубликатов (error.code === 11000) будет в API-слое.
    // slug генерируется хуком в модели.
    return this.repo.create(templateData);
  }

  /**
   * Возвращает все шаблоны карт с возможностью фильтрации и пагинации.
   * @param {IFindParams<IMapTemplate>} options - Опции для фильтрации и пагинации.
   * @returns {Promise<IFindResult<IMapTemplate>>}
   */
  async getAllMapTemplates(options: IFindParams<IMapTemplate> = {}): Promise<IFindResult<IMapTemplate>> {
    return this.repo.find(options);
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
   * @param {UpdateMapTemplateDto} templateData - Данные для обновления.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Обновленный объект шаблона карты.
   */
  async updateMapTemplate(id: string, templateData: UpdateMapTemplateDto): Promise<HydratedDocument<IMapTemplate>> {
    const updatedTemplate = await this.repo.update(id, templateData as UpdateQuery<IMapTemplate>);
    if (!updatedTemplate) {
      throw new NotFoundError(`Шаблон карты с ID ${id} для обновления не найден.`);
    }
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
    if (template.isArchived) {
      throw new ConflictError('Этот шаблон уже находится в архиве.');
    }

    const archivedTemplate = (await this.repo.archive(id))!;

    // TODO: После успешной архивации, нужно ли удалять этот шаблон из всех шаблонов турниров?
    // Пока решено не делать этого автоматически, чтобы не было неожиданных побочных эффектов.
    // await tournamentTemplateRepo.removeMapTemplateFromAll(id);

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
    if (!template.isArchived) {
      throw new ConflictError('Этот шаблон не находится в архиве.');
    }

    // `restore` вернет документ, поэтому `!` уместен, т.к. мы проверили его существование
    return (await this.repo.restore(id))!;
  }
}

const mapTemplateService = new MapTemplateService(mapTemplateRepo);
export default mapTemplateService; 