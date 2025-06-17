import { mapTemplateRepository } from '@/lib/repos/map-templates/map-template-repo';

/**
 * @class MapTemplateService
 * @description Cервис для управления бизнес-логикой шаблонов карт.
 */
export class MapTemplateService {
  /**
   * @param {object} mapTemplateRepository - Репозиторий для работы с данными шаблонов карт.
   */
  constructor(mapTemplateRepository) {
    this.mapTemplateRepository = mapTemplateRepository;
  }

  /**
   * Создает новый шаблон карты.
   * @param {object} templateData - Данные для создания шаблона.
   * @returns {Promise<object>} - Созданный объект шаблона карты.
   */
  async createTemplate(templateData) {
    return this.mapTemplateRepository.create(templateData);
  }

  /**
   * Получает все шаблоны карт.
   * @returns {Promise<Array<object>>} - Массив шаблонов карт.
   */
  async getAllTemplates() {
    return this.mapTemplateRepository.findAll();
  }

  /**
   * Получает шаблон карты по ID.
   * @param {string} id - ID шаблона.
   * @returns {Promise<object|null>} - Найденный шаблон или null.
   */
  async getTemplateById(id) {
    return this.mapTemplateRepository.findById(id);
  }

  /**
   * Обновляет шаблон карты.
   * @param {string} id - ID шаблона.
   * @param {object} templateData - Данные для обновления.
   * @returns {Promise<object>} - Обновленный объект шаблона карты.
   */
  async updateTemplate(id, templateData) {
    return this.mapTemplateRepository.update(id, templateData);
  }
}

export const mapTemplateService = new MapTemplateService(mapTemplateRepository); 