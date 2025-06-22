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
    let template = await cache.get(cacheKey);

    if (template) {
      return template;
    }

    template = await MapTemplate.findById(id).lean();

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
   * Находит активный шаблон карты по имени или slug.
   * Используется для проверки на дубликаты перед созданием/обновлением.
   * @param {string} name - Имя шаблона.
   * @param {string} slug - Slug шаблона.
   * @returns {Promise<object|null>} - Найденный шаблон или null.
   */
  async findActiveByNameOrSlug(name, slug) {
    return MapTemplate.findOne({
      $or: [{ name }, { slug }],
      archivedAt: { $eq: null },
    }).lean();
  }

  /**
   * Находит все шаблоны карт с возможностью фильтрации.
   * @param {object} [options] - Опции для поиска.
   * @param {string} [options.status='active'] - Статус шаблонов ('active' или 'archived').
   * @param {string} [options.search=''] - Строка для поиска по названию.
   * @param {number|null} [options.limit=null] - Ограничение на количество результатов.
   * @returns {Promise<Array<object>>} - Массив шаблонов.
   */
  async findAll({ status = 'active', search = '', limit = null } = {}) {
    const filter = {};

    if (status === 'archived') {
      filter.archivedAt = { $ne: null };
    } else {
      filter.archivedAt = { $eq: null };
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    let query = MapTemplate.find(filter);

    if (limit) {
      query = query.limit(limit);
    }

    return query.lean();
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
    const updatedTemplate = await MapTemplate.findByIdAndUpdate(
      id,
      { $set: { archivedAt: new Date() } },
      { new: true }
    ).lean();

    if (updatedTemplate) {
      await cache.invalidateByTag(`map_template:${id}`);
      await cache.invalidateByTag('map_templates_list');
    }
    
    return updatedTemplate;
  }

  /**
   * Восстанавливает шаблон карты из архива по ID.
   * Удаляет поле archivedAt.
   * @param {string} id - ID шаблона для восстановления.
   * @returns {Promise<MapTemplate|null>}
   */
  async unarchive(id) {
    const updatedTemplate = await MapTemplate.findByIdAndUpdate(
      id,
      { $set: { archivedAt: null } },
      { new: true }
    ).lean();
    
    if (updatedTemplate) {
      await cache.invalidateByTag(`map_template:${id}`);
      await cache.invalidateByTag('map_templates_list');
    }

    return updatedTemplate;
  }

  async searchMapTemplates(searchTerm, limit = 10) {
    const query = { name: { $regex: searchTerm, $options: 'i' } };
    return MapTemplate.find(query).limit(limit).lean();
  }
}

export default MapTemplateRepository; 
