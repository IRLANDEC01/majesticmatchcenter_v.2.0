import mongoose from 'mongoose';
import { cache } from '@/lib/cache';
import { AppError } from '@/lib/errors';

class BaseRepo {
  constructor(model, cachePrefix) {
    if (this.constructor === BaseRepo) {
      throw new TypeError('Абстрактный класс "BaseRepo" не может быть инстанциирован напрямую.');
    }
    this.model = model;
    this.cachePrefix = cachePrefix;
    this.cache = cache;
  }

  getCacheKey(id) {
    return `${this.cachePrefix}:${id}`;
  }

  async find({ q, status = 'active', page = 1, limit = 10, filter = {}, sort = { createdAt: -1 } } = {}) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const query = { ...filter };

    if (q) {
      query.name = { $regex: q, $options: 'i' };
    }
    
    if (status === 'active') {
      query.archivedAt = { $in: [null, undefined] };
    } else if (status === 'archived') {
      query.archivedAt = { $ne: null };
    }
    // При status === 'all' никаких дополнительных условий по `archivedAt` не нужно.

    const [data, total] = await Promise.all([
      this.model.find(query).sort(sort).skip(skip).limit(limitNum).lean().exec(),
      this.model.countDocuments(query),
    ]);

    return { data, total, page: pageNum, limit: limitNum };
  }

  async findById(id, { includeArchived = false } = {}) {
    const query = { _id: id };
    if (!includeArchived) {
      query.archivedAt = { $in: [null, undefined] };
    }
    return this.model.findOne(query).lean().exec();
  }

  async create(data) {
    const newDoc = new this.model(data);
    await newDoc.save();
    return newDoc.toObject();
  }
  
  async update(id, updateData) {
    // findByIdAndUpdate по умолчанию ищет по всем документам,
    // что нам и нужно для обновления.
    const updatedDoc = await this.model
      .findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
      .lean()
      .exec();
      
    if (updatedDoc) {
      await this.cache.delete(this.getCacheKey(id)); 
    }
    return updatedDoc;
  }

  async archive(id) {
    const result = await this.update(id, { archivedAt: new Date() });
    if (!result) {
      throw new AppError(`Документ с ID ${id} не найден для архивации.`, 404);
    }
    return result;
  }

  async restore(id) {
    const result = await this.update(id, { archivedAt: null });
     if (!result) {
      throw new AppError(`Документ с ID ${id} не найден для восстановления.`, 404);
    }
    return result;
  }
}

export default BaseRepo;