import { mapTemplateRepository } from '@/lib/repos/map-templates/map-template-repo.js';

/**
 * Cервис для управления бизнес-логикой шаблонов карт.
 */
class MapTemplateService {
  /**
   * Создает новый шаблон карты.
   * @param {object} templateData - Данные для создания шаблона.
   * @returns {Promise<object>} - Созданный объект шаблона карты.
   */
  async createMapTemplate(templateData) {
    return mapTemplateRepository.create(templateData);
  }

  /**
   * Получает все шаблоны карт.
   * @param {object} [options] - Опции для получения шаблонов.
   * @param {boolean} [options.includeArchived=false] - Включить ли архивированные.
   * @returns {Promise<Array<object>>} - Массив шаблонов карт.
   */
  async getAllMapTemplates(options = { includeArchived: false }) {
    return mapTemplateRepository.findAll(options);
  }

  /**
   * Получает шаблон карты по ID.
   * @param {string} id - ID шаблона.
   * @returns {Promise<object|null>} - Найденный шаблон или null.
   */
  async getMapTemplateById(id) {
    return mapTemplateRepository.findById(id);
  }

  /**
   * Обновляет шаблон карты.
   * @param {string} id - ID шаблона.
   * @param {object} templateData - Данные для обновления.
   * @returns {Promise<object>} - Обновленный объект шаблона карты.
   */
  async updateMapTemplate(id, templateData) {
    return mapTemplateRepository.update(id, templateData);
  }
  
  /**
   * Архивирует шаблон карты.
   * @param {string} templateId - ID шаблона для архивации.
   * @returns {Promise<object|null>}
   */
  async archiveMapTemplate(templateId) {
    // TODO: Добавить бизнес-логику, например, проверку, что нельзя архивировать используемый шаблон
    return mapTemplateRepository.archive(templateId);
  }
  
  /**
   * Восстанавливает шаблон карты из архива.
   * @param {string} templateId - ID шаблона для восстановления.
   * @returns {Promise<object|null>}
   */
  async unarchiveMapTemplate(templateId) {
    return mapTemplateRepository.unarchive(templateId);
  }
}

export const mapTemplateService = new MapTemplateService(); 