import mapTemplateRepo from '@/lib/repos/map-templates/map-template-repo.js';
import { DuplicateError } from '@/lib/errors';

/**
 * Cервис для управления бизнес-логикой шаблонов карт.
 */
class MapTemplateService {
  /**
   * @param {object} repos - Репозитории.
   * @param {import('@/lib/repos/map-templates/map-template-repo').mapTemplateRepo} repos.mapTemplateRepo - Репозиторий шаблонов карт.
   */
  constructor(repos) {
    this.repo = repos.mapTemplateRepo;
  }

  /**
   * Создает новый шаблон карты.
   * @param {object} templateData - Данные для создания шаблона.
   * @returns {Promise<object>} - Созданный объект шаблона карты.
   */
  async createMapTemplate(templateData) {
    const existingTemplate = await this.repo.findByName(templateData.name);
    if (existingTemplate) {
      throw new DuplicateError('Шаблон карты с таким названием уже существует.');
    }
    return this.repo.create(templateData);
  }

  /**
   * Получает все шаблоны карт.
   * @param {object} [options] - Опции для получения шаблонов.
   * @param {boolean} [options.includeArchived=false] - Включить ли архивированные.
   * @param {string} [options.search] - Строка для поиска.
   * @param {string} [options.id] - ID для поиска конкретного шаблона.
   * @returns {Promise<Array<object>>} - Массив шаблонов карт.
   */
  async getAllMapTemplates(options = { includeArchived: false, search: '', id: null }) {
    return this.repo.findAll(options);
  }

  /**
   * Получает шаблон карты по ID.
   * @param {string} id - ID шаблона.
   * @returns {Promise<object|null>} - Найденный шаблон или null.
   */
  async getMapTemplateById(id) {
    return this.repo.findById(id);
  }

  /**
   * Обновляет шаблон карты.
   * @param {string} id - ID шаблона.
   * @param {object} templateData - Данные для обновления.
   * @returns {Promise<object>} - Обновленный объект шаблона карты.
   */
  async updateMapTemplate(id, templateData) {
    if (templateData.name) {
      const existingTemplate = await this.repo.findByName(templateData.name);
      if (existingTemplate && existingTemplate._id.toString() !== id) {
        throw new DuplicateError('Шаблон карты с таким названием уже существует.');
      }
    }
    return this.repo.update(id, templateData);
  }
  
  /**
   * Архивирует шаблон карты.
   * @param {string} templateId - ID шаблона для архивации.
   * @returns {Promise<object|null>}
   */
  async archiveMapTemplate(templateId) {
    // TODO: Добавить бизнес-логику, например, проверку, что нельзя архивировать используемый шаблон
    return this.repo.archive(templateId);
  }
  
  /**
   * Восстанавливает шаблон карты из архива.
   * @param {string} templateId - ID шаблона для восстановления.
   * @returns {Promise<object|null>}
   */
  async unarchiveMapTemplate(templateId) {
    return this.repo.unarchive(templateId);
  }
}

export const mapTemplateService = new MapTemplateService({ mapTemplateRepo }); 