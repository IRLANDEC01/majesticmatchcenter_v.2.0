import mongoose, { Document, Model, FilterQuery, UpdateQuery, HydratedDocument } from 'mongoose';
import { cache } from '@/lib/cache';
import { CacheAdapter } from '@/lib/cache/cache-adapter';
import { AppError } from '@/lib/errors';

// Определяем базовый интерфейс для документов, которые могут быть архивированы
interface IArchivable {
  archivedAt?: Date | null;
}

// Определяем интерфейс для параметров метода find
export interface IFindParams<T> {
  q?: string;
  status?: 'active' | 'archived' | 'all';
  page?: number;
  limit?: number;
  filter?: FilterQuery<T>;
  sort?: Record<string, 1 | -1>;
}

// Определяем интерфейс для результата метода find
export interface IFindResult<T> {
  data: HydratedDocument<T>[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Абстрактный базовый репозиторий с поддержкой Generics и кеширования.
 * @template T - Тип документа Mongoose, расширяющий Document и IArchivable.
 */
abstract class BaseRepo<T extends IArchivable> {
  protected model: Model<T>;
  protected cachePrefix: string;
  protected cache: CacheAdapter;

  constructor(model: Model<T>, cachePrefix: string) {
    if (this.constructor === BaseRepo) {
      throw new TypeError('Абстрактный класс "BaseRepo" не может быть инстанциирован напрямую.');
    }
    this.model = model;
    this.cachePrefix = cachePrefix;
    this.cache = cache;
  }

  protected getCacheKey(id: string): string {
    return `${this.cachePrefix}:${id}`;
  }

  async find({
    q,
    status = 'active',
    page = 1,
    limit = 10,
    filter = {},
    sort = { createdAt: -1 },
  }: IFindParams<T> = {}): Promise<IFindResult<T>> {
    const pageNum = page || 1;
    const limitNum = limit || 10;
    const skip = (pageNum - 1) * limitNum;

    const query: FilterQuery<T> = { ...filter };
    
    if (q) {
      // @ts-ignore
      query.name = { $regex: q, $options: 'i' };
    }

    if (status === 'active') {
      // @ts-ignore
      query.archivedAt = null;
    } else if (status === 'archived') {
      // @ts-ignore
      query.archivedAt = { $ne: null };
    }

    const [data, total] = await Promise.all([
      this.model.find(query).sort(sort).skip(skip).limit(limitNum).exec(),
      this.model.countDocuments(query),
    ]);

    return { data, total, page: pageNum, limit: limitNum };
  }

  async findById(id: string, { includeArchived = false } = {}): Promise<HydratedDocument<T> | null> {
    const query: FilterQuery<T> = { _id: id as any };
    if (!includeArchived) {
      // @ts-ignore
      query.archivedAt = null;
    }
    return this.model.findOne(query).exec();
  }

  async create(data: Partial<T>): Promise<HydratedDocument<T>> {
    const newDoc = new this.model(data);
    await newDoc.save();
    return newDoc;
  }

  async update(id: string, updateData: UpdateQuery<T>): Promise<HydratedDocument<T> | null> {
    const updatedDoc = await this.model
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .exec();

    if (updatedDoc) {
      await this.cache.delete(this.getCacheKey(id));
    }
    return updatedDoc;
  }

  async archive(id: string): Promise<HydratedDocument<T>> {
    const doc = await this.findById(id, { includeArchived: true });
    if (!doc) {
      throw new AppError(`Документ с ID ${id} не найден для архивации.`, 404);
    }
    doc.set('archivedAt', new Date());
    await doc.save();
    await this.cache.delete(this.getCacheKey(id));
    return doc;
  }

  async restore(id: string): Promise<HydratedDocument<T>> {
    const doc = await this.findById(id, { includeArchived: true });
    if (!doc) {
      throw new AppError(`Документ с ID ${id} не найден для восстановления.`, 404);
    }
    doc.set('archivedAt', null);
    await doc.save();
    await this.cache.delete(this.getCacheKey(id));
    return doc;
  }
}

export default BaseRepo;