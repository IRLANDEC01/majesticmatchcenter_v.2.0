import mongoose from 'mongoose';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import { cache } from '@/lib/cache';

/**
 * Репозиторий для работы с шаблонами турниров.
 */
class TournamentTemplateRepo {
  /**
   * Находит все шаблоны турниров.
   * @param {object} [options] - Опции для поиска.
   * @param {boolean} [options.populateMapTemplates=false] - Флаг для populate связанных шаблонов карт.
   * @param {boolean} [options.includeArchived=false] - Включить ли архивированные.
   * @returns {Promise<TournamentTemplate[]>}
   */
  async findAll({ populateMapTemplates = false, includeArchived = false } = {}) {
    const query = TournamentTemplate.find();
    
    query.setOptions({ includeArchived });

    if (populateMapTemplates) {
      query.populate('mapTemplates');
    }
    return query.lean();
  }

  /**
   * Находит шаблон турнира по ID.
   * @param {string} id - ID шаблона.
   * @returns {Promise<TournamentTemplate|null>}
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
   * Создает новый шаблон турнира.
   * @param {object} data - Данные для создания.
   * @returns {Promise<TournamentTemplate>}
   */
  async create(data) {
    const newTemplate = new TournamentTemplate(data);
    await newTemplate.save();
    return newTemplate.toObject();
  }

  /**
   * Обновляет шаблон турнира.
   * @param {string} id - ID шаблона.
   * @param {object} data - Данные для обновления.
   * @returns {Promise<TournamentTemplate|null>}
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

  /**
   * Архивирует шаблон турнира по ID.
   * Устанавливает поле archivedAt в текущую дату.
   * @param {string} id - ID шаблона для архивации.
   * @returns {Promise<TournamentTemplate|null>}
   */
  async archive(id) {
    return TournamentTemplate.findByIdAndUpdate(id, { $set: { archivedAt: new Date() } }, { new: true }).lean();
  }

  /**
   * Восстанавливает шаблон турнира из архива по ID.
   * Удаляет поле archivedAt.
   * @param {string} id - ID шаблона для восстановления.
   * @returns {Promise<TournamentTemplate|null>}
   */
  async unarchive(id) {
    return TournamentTemplate.findByIdAndUpdate(id, { $unset: { archivedAt: 1 } }, { new: true, includeArchived: true }).lean();
  }
}

export const tournamentTemplateRepo = new TournamentTemplateRepo(); 