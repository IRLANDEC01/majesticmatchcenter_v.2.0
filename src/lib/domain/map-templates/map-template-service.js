import mapTemplateRepo from '@/lib/repos/map-templates/map-template-repo.js';
import { DuplicateError, NotFoundError, ConflictError } from '@/lib/errors.js';

/**
 * Cервис для управления бизнес-логикой шаблонов карт.
 */
class MapTemplateService {
  constructor(repo) {
    this.repo = repo;
  }

  /**
   * Создает новый шаблон карты.
   * @param {object} templateData - Данные для создания шаблона.
   * @returns {Promise<object>} - Созданный объект шаблона карты.
   */
  async createMapTemplate(templateData) {
    try {
      const slug =
        templateData.slug ||
        templateData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      return await this.repo.create({ ...templateData, slug });
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicateError('Шаблон с таким названием или slug уже существует.');
      }
      throw error;
    }
  }

  /**
   * Возвращает все шаблоны карт с возможностью фильтрации и пагинации.
   * @param {object} options - Опции для фильтрации и пагинации.
   * @returns {Promise<{data: MapTemplate[], total: number}>}
   */
  async getAllMapTemplates(options = {}) {
    return this.repo.find(options);
  }

  /**
   * Получает шаблон карты по ID.
   * @param {string} id - ID шаблона.
   * @param {object} options - Опции для поиска.
   * @returns {Promise<object|null>} - Найденный шаблон или null.
   */
  async getMapTemplateById(id, { includeArchived = false } = {}) {
    const template = await this.repo.findById(id, { includeArchived });
    if (!template) {
      throw new NotFoundError(`Шаблон карты с ID ${id} не найден.`);
    }
    return template;
  }

  /**
   * Обновляет шаблон карты.
   * @param {string} id - ID шаблона.
   * @param {object} templateData - Данные для обновления.
   * @returns {Promise<object>} - Обновленный объект шаблона карты.
   */
  async updateMapTemplate(id, templateData) {
    await this.getMapTemplateById(id); // Проверка на существование (неархивированного)
    
    try {
      if (templateData.name && !templateData.slug) {
        templateData.slug = templateData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
      }
      return await this.repo.update(id, templateData);
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicateError('Шаблон с таким названием или slug уже существует.');
      }
      throw error;
    }
  }
  
  /**
   * Архивирует шаблон карты.
   * @param {string} id - ID шаблона для архивации.
   * @returns {Promise<MapTemplate>}
   */
  async archiveMapTemplate(id) {
    // Сначала ищем, включая архивные, чтобы выдать правильную ошибку
    const template = await this.getMapTemplateById(id, { includeArchived: true });

    if (template.archivedAt) {
      throw new ConflictError('Этот шаблон уже находится в архиве.');
    }

    return this.repo.archive(id);
  }
  
  /**
   * Восстанавливает шаблон карты из архива.
   * @param {string} id - ID шаблона для восстановления.
   * @returns {Promise<object|null>}
   */
  async restoreMapTemplate(id) {
    const template = await this.getMapTemplateById(id, { includeArchived: true });

    if (!template.archivedAt) {
      throw new ConflictError('Этот шаблон не находится в архиве.');
    }

    // Здесь можно добавить логику проверки на дубликат имени среди активных, если нужно

    return this.repo.restore(id);
  }
}

const mapTemplateService = new MapTemplateService(mapTemplateRepo);
export default mapTemplateService; 