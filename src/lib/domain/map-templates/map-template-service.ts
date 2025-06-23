import mapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';
import { IMapTemplate } from '@/models/map/MapTemplate';
import { DuplicateError, NotFoundError, ConflictError } from '@/lib/errors';
import { FilterQuery, UpdateQuery } from 'mongoose';
import { IFindParams } from '@/lib/repos/base-repo';
import { CreateMapTemplateDto, UpdateMapTemplateDto } from '@/lib/api/schemas/map-templates/map-template-schemas';

/**
 * Cервис для управления бизнес-логикой шаблонов карт.
 */
class MapTemplateService {
  constructor(private repo: typeof mapTemplateRepo) {}

  /**
   * Создает новый шаблон карты.
   * @param {CreateMapTemplateDto} templateData - Данные для создания шаблона.
   * @returns {Promise<IMapTemplate>} - Созданный объект шаблона карты.
   */
  async createMapTemplate(templateData: CreateMapTemplateDto): Promise<IMapTemplate> {
    try {
      // Логика генерации slug теперь полностью в хуке модели, здесь она не нужна
      return await this.repo.create(templateData);
    } catch (error: any) {
      if (error.code === 11000) {
        throw new DuplicateError('Шаблон с таким названием или slug уже существует.');
      }
      throw error;
    }
  }

  /**
   * Возвращает все шаблоны карт с возможностью фильтрации и пагинации.
   * @param {IFindParams<IMapTemplate>} options - Опции для фильтрации и пагинации.
   * @returns {Promise<{data: IMapTemplate[], total: number}>}
   */
  async getAllMapTemplates(options: IFindParams<IMapTemplate> = {}) {
    return this.repo.find(options);
  }

  /**
   * Получает шаблон карты по ID.
   * @param {string} id - ID шаблона.
   * @param {{ includeArchived?: boolean }} options - Опции для поиска.
   * @returns {Promise<IMapTemplate>} - Найденный шаблон.
   * @throws {NotFoundError} - если шаблон не найден.
   */
  async getMapTemplateById(id: string, { includeArchived = false } = {}): Promise<IMapTemplate> {
    const template = await this.repo.findById(id, { includeArchived });
    if (!template) {
      throw new NotFoundError(`Шаблон карты с ID ${id} не найден.`);
    }
    return template;
  }

  /**
   * Обновляет шаблон карты.
   * @param {string} id - ID шаблона.
   * @param {UpdateMapTemplateDto} templateData - Данные для обновления.
   * @returns {Promise<IMapTemplate>} - Обновленный объект шаблона карты.
   */
  async updateMapTemplate(id: string, templateData: UpdateMapTemplateDto): Promise<IMapTemplate | null> {
    await this.getMapTemplateById(id); // Проверка на существование (неархивированного)
    
    try {
      // Хук модели позаботится о slug, если изменится name
      return await this.repo.update(id, templateData as UpdateQuery<IMapTemplate>);
    } catch (error: any) {
      if (error.code === 11000) {
        throw new DuplicateError('Шаблон с таким названием или slug уже существует.');
      }
      throw error;
    }
  }
  
  /**
   * Архивирует шаблон карты.
   * @param {string} id - ID шаблона для архивации.
   * @returns {Promise<IMapTemplate>} - Архивированный шаблон.
   */
  async archiveMapTemplate(id: string): Promise<IMapTemplate> {
    const template = await this.getMapTemplateById(id, { includeArchived: true });

    if (template.isArchived) { // Используем удобное виртуальное поле
      throw new ConflictError('Этот шаблон уже находится в архиве.');
    }

    return this.repo.archive(id);
  }
  
  /**
   * Восстанавливает шаблон карты из архива.
   * @param {string} id - ID шаблона для восстановления.
   * @returns {Promise<IMapTemplate>} - Восстановленный шаблон.
   */
  async restoreMapTemplate(id: string): Promise<IMapTemplate> {
    const template = await this.getMapTemplateById(id, { includeArchived: true });

    if (!template.isArchived) {
      throw new ConflictError('Этот шаблон не находится в архиве.');
    }

    return this.repo.restore(id);
  }
}

const mapTemplateService = new MapTemplateService(mapTemplateRepo);
export default mapTemplateService; 