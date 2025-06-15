import MapTemplate from '@/models/map/MapTemplate.js';
import { cache } from '@/lib/cache/index.js';

/**
 * Репозиторий для работы с шаблонами карт.
 * Инкапсулирует всю логику взаимодействия с базой данных и кэшем.
 */
class MapTemplateRepository {
  /**
   * Находит шаблон по ID, используя кэш.
   * @param {string} id - ID шаблона.
   * @returns {Promise<object|null>} - Найденный шаблон или null.
   */
  async findById(id) {
    const cacheKey = `map_template:${id}`;
    
    const cachedTemplate = await cache.get(cacheKey);
    if (cachedTemplate) {
      return cachedTemplate;
    }

    const template = await MapTemplate.findById(id).lean();

    if (template) {
      await cache.set(cacheKey, template, {
        tags: [`map_template:${id}`],
      });
    }

    return template;
  }

  /**
   * Находит все шаблоны карт.
   * @returns {Promise<object[]>} - Массив шаблонов.
   */
  async findAll() {
    const templates = await MapTemplate.find({}).sort({ createdAt: -1 }).lean();
    return templates;
  }

  /**
   * Создает новый шаблон карты.
   * @param {object} data - Данные для создания шаблона.
   * @returns {Promise<object>} - Созданный шаблон.
   */
  async create(data) {
    const template = new MapTemplate(data);
    await template.save();
    return template.toObject();
  }

  /**
   * Атомарно увеличивает счетчик использования шаблона.
   * @param {string} id - ID шаблона.
   * @returns {Promise<object>} - Обновленный шаблон.
   */
  async incrementUsageCount(id) {
    const updatedTemplate = await MapTemplate.findByIdAndUpdate(
      id,
      { $inc: { usageCount: 1 } },
      { new: true }
    ).lean();

    // Инвалидируем кэш для этого шаблона
    if (updatedTemplate) {
      await cache.invalidateByTag(`map_template:${updatedTemplate._id}`);
    }

    return updatedTemplate;
  }
}

export const mapTemplateRepository = new MapTemplateRepository(); 