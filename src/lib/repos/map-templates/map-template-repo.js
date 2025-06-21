import MapTemplate from '@/models/map/MapTemplate.js';
import { cache } from '@/lib/cache';

/**
 * @class MapTemplateRepository
 * @description Репозиторий для работы с шаблонами карт.
 */
class MapTemplateRepository {
  /**
   * Находит шаблон карты по ID.
   * Включает логику кэширования.
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
        tags: [`map_template:${id}`, 'map_templates_list'],
      });
    }

    return template;
  }

  /**
   * Находит шаблон карты по имени.
   * @param {string} name - Имя шаблона.
   * @returns {Promise<object|null>} - Найденный шаблон или null.
   */
  async findByName(name) {
    return MapTemplate.findOne({ name }).lean();
  }

  /**
   * Находит все шаблоны карт.
   * @param {object} [options] - Опции для поиска.
   * @param {boolean} [options.includeArchived=false] - Включить ли архивированные.
   * @param {string} [options.search=''] - Строка для поиска по названию.
   * @param {string|null} [options.id=null] - ID для поиска конкретного шаблона.
   * @returns {Promise<Array<object>>} - Массив шаблонов.
   */
  async findAll({ includeArchived = false, search = '', id = null } = {}) {
    const filter = {};

    if (id) {
      filter._id = id;
    } else if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    return MapTemplate.find(filter).setOptions({ includeArchived }).lean();
  }

  /**
   * Создает новый шаблон карты.
   * @param {object} data - Данные для создания.
   * @returns {Promise<object>} - Созданный шаблон.
   */
  async create(data) {
    const template = new MapTemplate(data);
    await template.save();
    return template.toObject();
  }

  /**
   * Обновляет шаблон карты.
   * @param {string} id - ID шаблона.
   * @param {object} data - Данные для обновления.
   * @returns {Promise<object>} - Обновленный шаблон.
   */
  async update(id, data) {
    const updatedTemplate = await MapTemplate.findByIdAndUpdate(id, data, { new: true }).lean();

    if (updatedTemplate) {
      await cache.invalidateByTag(`map_template:${id}`);
      await cache.invalidateByTag('map_templates_list');
    }

    return updatedTemplate;
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

    if (updatedTemplate) {
      await cache.invalidateByTag(`map_template:${updatedTemplate._id}`);
    }

    return updatedTemplate;
  }

  /**
   * Атомарно уменьшает счетчик использования шаблона.
   * @param {string} id - ID шаблона.
   * @returns {Promise<object>} - Обновленный шаблон.
   */
  async decrementUsageCount(id) {
    const updatedTemplate = await MapTemplate.findByIdAndUpdate(
      id,
      { $inc: { usageCount: -1 } },
      { new: true }
    ).lean();

    if (updatedTemplate) {
      await cache.invalidateByTag(`map_template:${updatedTemplate._id}`);
    }

    return updatedTemplate;
  }

  /**
   * Архивирует шаблон карты по ID.
   * Устанавливает поле archivedAt в текущую дату.
   * @param {string} id - ID шаблона для архивации.
   * @returns {Promise<MapTemplate|null>}
   */
  async archive(id) {
    return MapTemplate.findByIdAndUpdate(id, { $set: { archivedAt: new Date() } }, { new: true }).lean();
  }

  /**
   * Восстанавливает шаблон карты из архива по ID.
   * Удаляет поле archivedAt.
   * @param {string} id - ID шаблона для восстановления.
   * @returns {Promise<MapTemplate|null>}
   */
  async unarchive(id) {
    return MapTemplate.findByIdAndUpdate(id, { $unset: { archivedAt: 1 } }, { new: true, includeArchived: true }).lean();
  }

  async searchMapTemplates(searchTerm, limit = 10) {
    const query = { name: { $regex: searchTerm, $options: 'i' } };
    return MapTemplate.find(query).limit(limit).lean();
  }
}

const mapTemplateRepo = new MapTemplateRepository();
export default mapTemplateRepo; 