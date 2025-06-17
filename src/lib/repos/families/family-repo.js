import Family from '@/models/family/Family.js';
import { cache } from '@/lib/cache';

/**
 * @class FamilyRepository
 * @description Репозиторий для работы с данными семей.
 */
class FamilyRepository {
  /**
   * Находит семью по ID.
   * @param {string} id - ID семьи.
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const cacheKey = `family:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const family = await Family.findById(id).lean();
    if (family) {
      await cache.set(cacheKey, family, {
        tags: [`family:${id}`, 'families_list'],
      });
    }
    return family;
  }

  /**
   * Находит семью по слагу.
   * @param {string} slug - Слаг семьи.
   * @returns {Promise<object|null>}
   */
  async findBySlug(slug) {
    const cacheKey = `family:slug:${slug}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const family = await Family.findOne({ slug }).lean();
    if (family) {
      await cache.set(cacheKey, family, {
        tags: [`family:${family._id}`, 'families_list'],
      });
    }
    return family;
  }
  
    /**
   * Находит семью по имени.
   * @param {string} name - Имя семьи.
   * @returns {Promise<object|null>}
   */
  async findByName(name) {
    // Поиск по имени не кэшируется отдельно, т.к. менее частый,
    // но если семья найдена, ее основной кэш по ID может быть обновлен.
    return Family.findOne({ name }).lean();
  }


  /**
   * Находит все семьи.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeInactive=false] - Включить неактивные семьи.
   * @returns {Promise<Array<object>>}
   */
  async findAll({ includeInactive = false } = {}) {
    const query = {};
    if (!includeInactive) {
      query.status = 'active';
    }
    return Family.find(query).lean();
  }

  /**
   * Создает новую семью.
   * @param {object} data - Данные для создания.
   * @returns {Promise<object>}
   */
  async create(data) {
    const family = new Family(data);
    await family.save();
    await cache.invalidateByTag('families_list');
    return family.toObject();
  }

  /**
   * Обновляет данные семьи.
   * @param {string} id - ID семьи.
   * @param {object} data - Данные для обновления.
   * @returns {Promise<object|null>}
   */
  async update(id, data) {
    const family = await Family.findByIdAndUpdate(id, data, { new: true }).lean();
    if (family) {
      await cache.invalidateByTag(`family:${id}`);
      await cache.invalidateByTag(`family:slug:${family.slug}`);
      await cache.invalidateByTag('families_list');
    }
    return family;
  }

  /**
   * Деактивирует семью по ID (мягкое удаление).
   * @param {string} id - ID семьи.
   * @returns {Promise<object|null>}
   */
  async deactivate(id) {
    const family = await Family.findByIdAndUpdate(id, { status: 'inactive' }, { new: true }).lean();
    if (family) {
      await cache.invalidateByTag(`family:${id}`);
      await cache.invalidateByTag(`family:slug:${family.slug}`);
      await cache.invalidateByTag('families_list');
    }
    return family;
  }
}

export const familyRepository = new FamilyRepository(); 