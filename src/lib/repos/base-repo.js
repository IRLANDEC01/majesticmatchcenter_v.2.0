import mongoose from 'mongoose';
import { cache } from '@/lib/cache';
import { AppError } from '@/lib/errors';

/**
 * Базовый класс репозитория, реализующий общие операции с данными и кешированием.
 * @abstract
 */
class BaseRepo {
  /**
   * @param {mongoose.Model} model - Модель Mongoose.
   * @param {string} cachePrefix - Префикс для ключей кеша.
   */
  constructor(model, cachePrefix) {
    if (this.constructor === BaseRepo) {
      throw new TypeError('Абстрактный класс "BaseRepo" не может быть инстанциирован напрямую.');
    }
    this.model = model;
    this.cachePrefix = cachePrefix;
    this.cache = cache;
  }

  /**
   * Генерирует ключ для кеша.
   * @param {string} id - Уникальный идентификатор.
   * @returns {string} Ключ кеша.
   */
  getCacheKey(id) {
    return `${this.cachePrefix}:${id}`;
  }

  /**
   * Находит документ по ID.
   * @param {string} id - ID документа.
   * @param {object} [options] - Опции запроса.
   * @param {boolean} [options.includeArchived=false] - Включить в поиск архивированные документы.
   * @returns {Promise<object|null>} Найденный документ или null.
   */
  async findById(id, options = {}) {
    const { includeArchived = false } = options;
    const query = { _id: id };

    if (!includeArchived) {
      query.archivedAt = null;
    }

    return this.model.findOne(query).lean().exec();
  }

  /**
   * Создает новый документ.
   * @param {object} data - Данные для создания.
   * @returns {Promise<object>} Созданный документ.
   */
  async create(data) {
    const newDoc = new this.model(data);
    await newDoc.save();
    return newDoc.toObject();
  }

  /**
   * Обновляет документ по ID.
   * @param {string} id - ID документа.
   * @param {object} updateData - Данные для обновления.
   * @returns {Promise<object|null>} Обновленный документ или null.
   */
  async update(id, updateData) {
    const updatedDoc = await this.model
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .lean()
      .exec();
      
    if (updatedDoc) {
      // ИСПРАВЛЕНО: используется правильный метод .delete()
      await this.cache.delete(this.getCacheKey(id)); 
    }
    return updatedDoc;
  }

  /**
   * Архивирует (мягко удаляет) документ.
   * @param {string} id - ID документа.
   * @returns {Promise<object>} Архивированный документ.
   */
  async archive(id) {
    const result = await this.update(id, { archivedAt: new Date() });
    if (!result) {
      throw new AppError(`Документ с ID ${id} не найден для архивации.`, 404);
    }
    return result;
  }

  /**
   * Восстанавливает документ из архива.
   * @param {string} id - ID документа.
   * @returns {Promise<object>} Восстановленный документ.
   */
  async restore(id) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, archivedAt: { $ne: null } },
      { $set: { archivedAt: null } },
      { new: true }
    ).lean().exec();

    if (!doc) {
      throw new AppError(`Архивированный документ с ID ${id} не найден для восстановления.`, 404);
    }
    
    // ИСПРАВЛЕНО: используется правильный метод .delete()
    await this.cache.delete(this.getCacheKey(id));
    return doc;
  }
}

export default BaseRepo;