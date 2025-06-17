import { tournamentTemplateRepo } from '@/lib/repos/tournament-templates/tournament-template-repo.js';

/**
 * Cервис для управления бизнес-логикой шаблонов турниров.
 */
class TournamentTemplateService {
  /**
   * Создает новый шаблон турнира.
   * @param {object} templateData - Данные для создания шаблона.
   * @returns {Promise<object>} - Созданный объект шаблона турнира.
   */
  async createTemplate(templateData) {
    return tournamentTemplateRepo.create(templateData);
  }

  /**
   * Получает все шаблоны турниров.
   * @param {object} [options] - Опции для получения шаблонов.
   * @param {boolean} [options.includeArchived=false] - Включить ли архивированные.
   * @param {boolean} [options.populateMapTemplates=false] - Флаг для populate связанных шаблонов карт.
   * @returns {Promise<Array<object>>} - Массив шаблонов турниров.
   */
  async getAllTemplates(options = {}) {
    return tournamentTemplateRepo.findAll(options);
  }

  /**
   * Получает шаблон турнира по ID.
   * @param {string} id - ID шаблона.
   * @returns {Promise<object|null>} - Найденный шаблон или null.
   */
  async getTemplateById(id) {
    return tournamentTemplateRepo.findById(id);
  }

  /**
   * Обновляет шаблон турнира.
   * @param {string} id - ID шаблона.
   * @param {object} templateData - Данные для обновления.
   * @returns {Promise<object>} - Обновленный объект шаблона турнира.
   */
  async updateTemplate(id, templateData) {
    return tournamentTemplateRepo.update(id, templateData);
  }
  
  /**
   * Архивирует шаблон турнира.
   * @param {string} templateId - ID шаблона для архивации.
   * @returns {Promise<object|null>}
   */
  async archiveTemplate(templateId) {
    // TODO: Добавить бизнес-логику
    return tournamentTemplateRepo.archive(templateId);
  }

  /**
   * Восстанавливает шаблон турнира из архива.
   * @param {string} templateId - ID шаблона для восстановления.
   * @returns {Promise<object|null>}
   */
  async unarchiveTemplate(templateId) {
    return tournamentTemplateRepo.unarchive(templateId);
  }
}

export const tournamentTemplateService = new TournamentTemplateService(); 