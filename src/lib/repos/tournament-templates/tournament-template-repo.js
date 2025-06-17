import mongoose from 'mongoose';
import TournamentTemplate from '@/models/tournament/TournamentTemplate.js';
import { cache } from '@/lib/cache';

/**
 * @class TournamentTemplateRepository
 * @description Репозиторий для работы с шаблонами турниров.
 */
class TournamentTemplateRepository {
  /**
   * Находит шаблон по ID.
   * Включает логику кэширования.
   * @param {string} id - ID шаблона.
   * @returns {Promise<object|null>} - Найденный шаблон или null.
   */
  async findById(id) {
    const cacheKey = `tournament_template:${id}`;
    const cachedTemplate = await cache.get(cacheKey);

    if (cachedTemplate) {
      return cachedTemplate;
    }

    const template = await TournamentTemplate.findById(id).lean();

    if (template) {
      await cache.set(cacheKey, template, {
        tags: [`tournament_template:${id}`, 'tournament_templates_list'],
      });
    }

    return template;
  }

  /**
   * Находит шаблон по имени.
   * @param {string} name - Имя шаблона.
   * @returns {Promise<object|null>} - Найденный шаблон или null.
   */
  async findByName(name) {
    return TournamentTemplate.findOne({ name }).lean();
  }

  /**
   * Находит все шаблоны.
   * @param {boolean} populateMapTemplates - Флаг для populate связанных шаблонов карт.
   * @returns {Promise<Array<object>>} - Массив шаблонов.
   */
  async findAll(populateMapTemplates = false) {
    const query = TournamentTemplate.find();
    if (populateMapTemplates) {
      query.populate('mapTemplates');
    }
    return query.lean();
  }

  /**
   * Создает новый шаблон.
   * @param {object} data - Данные для создания.
   * @returns {Promise<object>} - Созданный шаблон.
   */
  async create(data) {
    const template = new TournamentTemplate(data);
    await template.save();
    return template.toObject();
  }

  /**
   * Обновляет шаблон турнира.
   * @param {string} id - ID шаблона.
   * @param {object} data - Данные для обновления.
   * @returns {Promise<object>} - Обновленный шаблон.
   */
  async update(id, data) {
    const updatedTemplate = await TournamentTemplate.findByIdAndUpdate(id, data, { new: true }).lean();

    // Инвалидируем кэш для этого шаблона
    if (updatedTemplate) {
      await cache.invalidateByTag(`tournament_template:${updatedTemplate._id}`);
      await cache.invalidateByTag('tournament_templates_list');
    }

    return updatedTemplate;
  }

  /**
   * Атомарно увеличивает счетчик использования шаблона.
   * @param {string} id - ID шаблона.
   * @returns {Promise<object>} - Обновленный шаблон.
   */
  async incrementUsageCount(id) {
    const updatedTemplate = await TournamentTemplate.findByIdAndUpdate(
      id,
      { $inc: { usageCount: 1 } },
      { new: true }
    ).lean();

    // Инвалидируем кэш для этого шаблона
    if (updatedTemplate) {
      await cache.invalidateByTag(`tournament_template:${updatedTemplate._id}`);
    }

    return updatedTemplate;
  }

  /**
   * Атомарно уменьшает счетчик использования шаблона.
   * @param {string} id - ID шаблона.
   * @returns {Promise<object>} - Обновленный шаблон.
   */
  async decrementUsageCount(id) {
    const updatedTemplate = await TournamentTemplate.findByIdAndUpdate(
      id,
      { $inc: { usageCount: -1 } },
      { new: true }
    ).lean();

    // Инвалидируем кэш для этого шаблона
    if (updatedTemplate) {
      await cache.invalidateByTag(`tournament_template:${updatedTemplate._id}`);
    }

    return updatedTemplate;
  }
}

export const tournamentTemplateRepository = new TournamentTemplateRepository(); 