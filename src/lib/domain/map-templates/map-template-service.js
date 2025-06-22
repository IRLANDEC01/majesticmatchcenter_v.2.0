import MapTemplateRepo from '@/lib/repos/map-templates/map-template-repo.js';
import { DuplicateError, NotFoundError } from '@/lib/errors';

/**
 * Cервис для управления бизнес-логикой шаблонов карт.
 */
export default class MapTemplateService {
  /**
   * @param {object} repos - Репозитории.
   * @param {MapTemplateRepo} repos.mapTemplateRepo - Репозиторий шаблонов карт.
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
   * Получает все шаблоны карт.
   * @param {object} [options] - Опции для получения шаблонов.
   * @param {string} [options.status='active'] - Статус для фильтрации ('active' или 'archived').
   * @param {string} [options.search] - Строка для поиска.
   * @returns {Promise<Array<object>>} - Массив шаблонов карт.
   */
  async getAllMapTemplates(options = { status: 'active', search: '' }) {
    return this.repo.findAll(options);
  }

  /**
   * Получает шаблон карты по ID.
   * @param {string} id - ID шаблона.
   * @returns {Promise<object|null>} - Найденный шаблон или null.
   */
  async getMapTemplateById(id) {
    const template = await this.repo.findById(id);
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
    // Сначала проверим, существует ли документ
    const existingTemplate = await this.repo.findById(id);
    if (!existingTemplate) {
      throw new NotFoundError(`Шаблон карты с ID ${id} для обновления не найден.`);
    }
    
    try {
      if (templateData.name && !templateData.slug) {
        templateData.slug = templateData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
      }

      // Убираем ручную проверку. База данных сама не позволит
      // обновить запись, если это приведет к дубликации имени/slug
      // среди активных документов.
      return await this.repo.update(id, templateData);
    } catch (error) {
      // "Переводим" ошибку базы данных на язык доменных ошибок
      if (error.code === 11000) {
        throw new DuplicateError('Шаблон с таким названием или slug уже существует.');
      }
      // Если это другая ошибка, пробрасываем ее дальше
      throw error;
    }
  }
  
  /**
   * Архивирует шаблон карты.
   * @param {string} templateId - ID шаблона для архивации.
   * @returns {Promise<object|null>}
   */
  async archiveMapTemplate(templateId) {
    const archivedTemplate = await this.repo.archive(templateId);
    if (!archivedTemplate) {
      throw new NotFoundError(`Шаблон карты с ID ${templateId} для архивации не найден.`);
    }
    return archivedTemplate;
  }
  
  /**
   * Восстанавливает шаблон карты из архива.
   * @param {string} templateId - ID шаблона для восстановления.
   * @returns {Promise<object|null>}
   */
  async restoreMapTemplate(templateId) {
    const restoredTemplate = await this.repo.unarchive(templateId);
    if (!restoredTemplate) {
      throw new NotFoundError(`Шаблон карты с ID ${templateId} для восстановления не найден.`);
    }
    return restoredTemplate;
  }
} 