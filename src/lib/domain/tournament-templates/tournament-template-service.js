import { DuplicateError, NotFoundError, ValidationError } from '@/lib/errors';

/**
 * Cервис для управления бизнес-логикой шаблонов турниров.
 */
export default class TournamentTemplateService {
  /**
   * @param {object} repos - Репозитории.
   * @param {import('@/lib/repos/tournament-templates/tournament-template-repo').default} repos.tournamentTemplateRepo - Репозиторий шаблонов турниров.
   * @param {import('@/lib/repos/map-templates/map-template-repo').default} repos.mapTemplateRepo - Репозиторий шаблонов карт.
   */
  constructor(repos) {
    this.tournamentTemplateRepo = repos.tournamentTemplateRepo;
    this.mapTemplateRepo = repos.mapTemplateRepo;
  }
  
  /**
   * Проверяет, что все переданные ID шаблонов карт существуют и являются активными.
   * @param {string[]} mapTemplateIds - Массив ID шаблонов карт.
   * @private
   */
  async _validateMapTemplates(mapTemplateIds) {
    if (!mapTemplateIds || mapTemplateIds.length === 0) {
      throw new ValidationError('Необходимо указать хотя бы один шаблон карты.');
    }

    const mapTemplates = await Promise.all(
      mapTemplateIds.map(id => this.mapTemplateRepo.findById(id))
    );

    const notFound = mapTemplates.some(template => !template);
    if (notFound) {
      throw new NotFoundError('Один или несколько указанных шаблонов карт не найдены.');
    }

    const archived = mapTemplates.some(template => template.archivedAt);
    if (archived) {
      throw new ValidationError('Нельзя использовать архивные шаблоны карт.');
    }
  }

  /**
   * Создает новый шаблон турнира.
   * @param {object} templateData - Данные для создания шаблона.
   * @returns {Promise<object>} - Созданный объект шаблона турнира.
   */
  async createTemplate(templateData) {
    await this._validateMapTemplates(templateData.mapTemplates);
    
    try {
      return await this.tournamentTemplateRepo.create(templateData);
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicateError('Шаблон турнира с таким названием или slug уже существует.');
      }
      throw error;
    }
  }

  /**
   * Получает все шаблоны турниров.
   * @param {object} [options] - Опции для получения шаблонов.
   * @returns {Promise<Array<object>>} - Массив шаблонов турниров.
   */
  async getAllTemplates(options = {}) {
    return this.tournamentTemplateRepo.findAll(options);
  }

  /**
   * Получает шаблон турнира по ID.
   * @param {string} id - ID шаблона.
   * @returns {Promise<object>} - Найденный шаблон.
   */
  async getTemplateById(id) {
    const template = await this.tournamentTemplateRepo.findById(id);
    if (!template) {
      throw new NotFoundError(`Шаблон турнира с ID ${id} не найден.`);
    }
    return template;
  }

  /**
   * Обновляет шаблон турнира.
   * @param {string} id - ID шаблона.
   * @param {object} templateData - Данные для обновления.
   * @returns {Promise<object>} - Обновленный объект шаблона турнира.
   */
  async updateTemplate(id, templateData) {
    // Проверяем, существует ли обновляемый документ
    await this.getTemplateById(id);
    
    if (templateData.mapTemplates) {
      await this._validateMapTemplates(templateData.mapTemplates);
    }
    
    try {
      return await this.tournamentTemplateRepo.update(id, templateData);
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicateError('Шаблон турнира с таким названием или slug уже существует.');
      }
      throw error;
    }
  }
  
  /**
   * Архивирует шаблон турнира.
   * @param {string} templateId - ID шаблона для архивации.
   * @returns {Promise<object>}
   */
  async archiveTemplate(templateId) {
    const template = await this.tournamentTemplateRepo.archive(templateId);
    if (!template) {
      throw new NotFoundError(`Шаблон турнира с ID ${templateId} не найден.`);
    }
    return template;
  }

  /**
   * Восстанавливает шаблон турнира из архива.
   * @param {string} templateId - ID шаблона для восстановления.
   * @returns {Promise<object>}
   */
  async unarchiveTemplate(templateId) {
    const template = await this.tournamentTemplateRepo.unarchive(templateId);
    if (!template) {
      throw new NotFoundError(`Шаблон турнира с ID ${templateId} не найден.`);
    }
    return template;
  }
}

// Импортируем репозитории и создаем синглтон-экземпляр сервиса
import tournamentTemplateRepo from '@/lib/repos/tournament-templates/tournament-template-repo';
import mapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';

export const tournamentTemplateService = new TournamentTemplateService({
  tournamentTemplateRepo,
  mapTemplateRepo,
});