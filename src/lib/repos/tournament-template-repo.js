import TournamentTemplate from '@/models/tournament/TournamentTemplate.js';
import { cache } from '@/lib/cache/index.js';

/**
 * Репозиторий для работы с шаблонами турниров.
 * Инкапсулирует всю логику взаимодействия с базой данных и кэшем.
 */
class TournamentTemplateRepository {
  /**
   * Находит шаблон по ID, используя кэш.
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
        tags: [`tournament_template:${id}`],
      });
    }

    return template;
  }

  /**
   * Находит все шаблоны турниров.
   * @param {boolean} [populateMapTemplates=false] - Если true, подгружает данные шаблонов карт.
   * @returns {Promise<object[]>} - Массив шаблонов.
   */
  async findAll(populateMapTemplates = false) {
    const query = TournamentTemplate.find({}).sort({ createdAt: -1 });

    if (populateMapTemplates) {
      query.populate({
        path: 'mapTemplates',
        select: 'name', // Оставляем только имя для идентификации
      });
    }
    
    const templates = await query.lean();
    return templates;
  }

  /**
   * Создает новый шаблон турнира.
   * @param {object} data - Данные для создания шаблона.
   * @returns {Promise<object>} - Созданный шаблон.
   */
  async create(data) {
    const template = new TournamentTemplate(data);
    await template.save();
    return template.toObject();
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
}

export const tournamentTemplateRepository = new TournamentTemplateRepository(); 