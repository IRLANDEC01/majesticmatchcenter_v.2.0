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
    // Если в кэше есть, но он архивирован, считаем, что его нет
    if (cached?.archivedAt) return null;
    if (cached) return cached;

    const family = await Family.findOne({ _id: id, archivedAt: null }).lean();
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
    if (cached?.archivedAt) return null;
    if (cached) return cached;

    const family = await Family.findOne({ slug, archivedAt: null }).lean();
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
    return Family.findOne({ name, archivedAt: null }).lean();
  }


  /**
   * Находит все семьи.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeArchived=false] - Включить архивированные семьи.
   * @returns {Promise<Array<object>>}
   */
  async findAll({ includeArchived = false } = {}) {
    const query = includeArchived ? {} : { archivedAt: null };
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
      await this._invalidateCache(family);
    }
    return family;
  }
  
  /**
   * Архивирует семью по ID.
   * @param {string} id - ID семьи.
   * @returns {Promise<object|null>}
   */
  async archive(id) {
    const updatedFamily = await Family.findOneAndUpdate(
      { _id: id, archivedAt: null }, // Найти только неархивированную
      { $set: { archivedAt: new Date() } },
      { new: true }
    ).lean();

    if (updatedFamily) {
      await this._invalidateCache(updatedFamily);
    }
    return updatedFamily;
  }

  /**
   * Восстанавливает семью по ID.
   * @param {string} id - ID семьи.
   * @returns {Promise<object|null>}
   */
  async unarchive(id) {
    const updatedFamily = await Family.findByIdAndUpdate(
      id,
      { $unset: { archivedAt: 1 } },
      { new: true }
    ).lean();
    
    if (updatedFamily) {
      await this._invalidateCache(updatedFamily);
    }
    return updatedFamily;
  }

  /**
   * Инвалидирует кэш для семьи.
   * @param {object} family - Объект семьи.
   * @private
   */
  async _invalidateCache(family) {
    if (!family) return;
    await cache.invalidateByTag(`family:${family._id}`);
    await cache.invalidateByTag(`family:slug:${family.slug}`);
    await cache.invalidateByTag('families_list');
  }
}

export const familyRepository = new FamilyRepository(); 