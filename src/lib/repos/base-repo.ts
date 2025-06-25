import mongoose, { Document, Model, FilterQuery, HydratedDocument } from 'mongoose';
import { diff } from 'deep-object-diff';
import { cache } from '@/lib/cache';
import { CacheAdapter } from '@/lib/cache/cache-adapter';
import { AppError, NotFoundError } from '@/lib/errors';
import auditLogRepo from '@/lib/repos/audit/audit-log-repo';

// Определяем базовый интерфейс для документов, которые могут быть архивированы
interface IArchivable {
  archivedAt?: Date | null;
}

// Определяем интерфейс для параметров метода find
export interface IFindParams<T> {
  query?: FilterQuery<T>;
  select?: string;
  sort?: Record<string, 1 | -1>;
  page?: number;
  limit?: number;
  status?: 'active' | 'archived' | 'all';
}

// Определяем интерфейс для результата метода find
export interface IFindResult<T> {
  data: HydratedDocument<T>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IBaseRepo<T> {
  create(data: Partial<T>): Promise<HydratedDocument<T>>;
  find(options?: IFindParams<T>): Promise<IFindResult<T>>;
  findById(id: string, options?: { includeArchived?: boolean }): Promise<HydratedDocument<T> | null>;
  findOne(query: FilterQuery<T>, options?: { includeArchived?: boolean }): Promise<HydratedDocument<T> | null>;
  save(doc: HydratedDocument<T>): Promise<HydratedDocument<T>>;
  archive(id: string): Promise<HydratedDocument<T>>;
  restore(id: string): Promise<HydratedDocument<T>>;
  update(id: string, updateData: Partial<T>): Promise<HydratedDocument<T>>;
}

/**
 * Абстрактный базовый репозиторий с поддержкой Generics и кеширования.
 * @template T - "Чистый" тип интерфейса документа (не Document).
 */
abstract class BaseRepo<T extends IArchivable> implements IBaseRepo<T> {
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

  /**
   * Записывает действие в лог аудита.
   * Ошибки логирования не прерывают основной процесс.
   * @protected
   */
  protected async _logAction(
    action: 'create' | 'update' | 'archive' | 'restore',
    entityId: string,
    changes: Record<string, any> = {},
    actorId?: mongoose.Types.ObjectId,
  ) {
    try {
      await auditLogRepo.create({
        entity: this.model.modelName,
        entityId,
        action,
        changes,
        actorId,
      });
    } catch (error) {
      console.error('FATAL: Audit log write failed.', {
        err: error,
        entity: this.model.modelName,
        entityId,
        action,
      });
    }
  }

  async find({
    query = {},
    select,
    sort = { createdAt: -1 },
    page = 1,
    limit = 10,
    status = 'active',
  }: IFindParams<T> = {}): Promise<IFindResult<T>> {
    const pageNum = page || 1;
    const limitNum = limit || 10;
    const skip = (pageNum - 1) * limitNum;

    const finalQuery: FilterQuery<T> = { ...query };

    if (status === 'active') {
      finalQuery['archivedAt'] = { $eq: null };
    } else if (status === 'archived') {
      finalQuery['archivedAt'] = { $ne: null };
    }
    // Если status === 'all', не добавляем никаких условий по archivedAt

    const [data, total] = await Promise.all([
      this.model.find(finalQuery).sort(sort).skip(skip).limit(limitNum).exec(),
      this.model.countDocuments(finalQuery),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return { data, total, page: pageNum, limit: limitNum, totalPages };
  }

  async findById(id: string, { includeArchived = false } = {}): Promise<HydratedDocument<T> | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      // Возвращаем null, чтобы соответствовать стандартному поведению findById,
      // который возвращает null для ненайденных или невалидных ID.
      // Выбрасывание ошибки здесь может быть неожиданным для вызывающего кода.
      return null;
    }

    const query: FilterQuery<T> = { _id: id as any };
    if (!includeArchived) {
      (query as IArchivable).archivedAt = null;
    }
    return this.model.findOne(query).exec();
  }

  async create(data: Partial<T>): Promise<HydratedDocument<T>> {
    const newDoc = new this.model(data);
    await newDoc.save();
    await this._logAction('create', newDoc.id, newDoc.toObject());
    return newDoc;
  }

  async update(id: string, updateData: Partial<T>): Promise<HydratedDocument<T>> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError(`Документ с невалидным ID ${id} не может быть обновлен.`);
    }
    const doc = await this.findById(id);
    if (!doc) {
      throw new NotFoundError(`Документ с ID ${id} не найден для обновления.`);
    }

    const originalObject = doc.toObject();
    Object.assign(doc, updateData);

    if (doc.isModified()) {
      await doc.save();
      const updatedObject = doc.toObject();
      const changes = diff(originalObject, updatedObject);
      await this._logAction('update', doc.id, changes);
    }

      await this.cache.delete(this.getCacheKey(id));
    return doc;
  }

  async archive(id: string): Promise<HydratedDocument<T>> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError(`Документ с невалидным ID ${id} не может быть архивирован.`);
    }
    const doc = await this.findById(id, { includeArchived: true });
    if (!doc) {
      throw new NotFoundError(`Документ с ID ${id} не найден для архивации.`);
    }

    const originalArchivedAt = doc.archivedAt;
    doc.set('archivedAt', new Date());
    await doc.save();

    await this._logAction('archive', doc.id, {
      archivedAt: { from: originalArchivedAt, to: doc.archivedAt },
    });

    await this.cache.delete(this.getCacheKey(id));
    return doc;
  }

  async restore(id: string): Promise<HydratedDocument<T>> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError(`Документ с невалидным ID ${id} не может быть восстановлен.`);
    }
    const doc = await this.findById(id, { includeArchived: true });
    if (!doc) {
      throw new NotFoundError(`Документ с ID ${id} не найден для восстановления.`);
    }

    const originalArchivedAt = doc.archivedAt;
    doc.set('archivedAt', null);
    await doc.save();

    await this._logAction('restore', doc.id, {
      archivedAt: { from: originalArchivedAt, to: null },
    });

    await this.cache.delete(this.getCacheKey(id));
    return doc;
  }

  async findOne(query: FilterQuery<T>, options?: { includeArchived?: boolean }): Promise<HydratedDocument<T> | null> {
    const finalQuery: FilterQuery<T> = { ...query };
    if (options?.includeArchived) {
      // Здесь специально оставлена логика для includeArchived,
      // так как findOne может вызываться в специфичных сценариях, где нужен именно этот флаг.
      // Например, для проверки существования архивированного документа перед восстановлением.
      finalQuery['archivedAt'] = { $ne: null };
    } else {
      (finalQuery as IArchivable).archivedAt = null;
    }
    return this.model.findOne(finalQuery).exec();
  }

  async save(doc: HydratedDocument<T>): Promise<HydratedDocument<T>> {
    await doc.save();
    await this.cache.delete(this.getCacheKey(doc.id));
    return doc;
  }
}

export default BaseRepo;