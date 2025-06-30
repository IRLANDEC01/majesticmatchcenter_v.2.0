import { HydratedDocument, UpdateQuery } from 'mongoose';
import mapTemplateRepo, { IMapTemplateRepo } from '@/lib/repos/map-templates/map-template-repo';
import searchQueue from '@/queues/search-queue';
import searchService from '@/lib/domain/search/search-service';
import tournamentTemplateRepo from '@/lib/repos/tournament-templates/tournament-template-repo';
import { IMapTemplate } from '@/models/map/MapTemplate';
import { NotFoundError, ConflictError } from '@/lib/errors';
import { IFindParams, IFindResult } from '@/lib/repos/base-repo';
import { GetMapTemplatesDto, CreateMapTemplateApiDto, UpdateMapTemplateApiDto } from '@/lib/api/schemas/map-templates/map-template-schemas';
import * as cache from '@/lib/cache';
import { cacheKeys, cacheTags, cacheTtls } from '@/lib/cache/cache-policy';
import { getApiRedisClient } from '@/lib/redis-clients';
import { revalidateTag } from 'next/cache';
import { uploadImageVariants, deleteImageVariants } from '@/lib/s3/upload';
import { IImageSet, IImageKeys } from '@/models/shared/image-set-schema';

export interface IMapTemplateService {
  createMapTemplate(data: CreateMapTemplateApiDto): Promise<HydratedDocument<IMapTemplate>>;
  getMapTemplates(options: GetMapTemplatesDto): Promise<IFindResult<IMapTemplate>>;
  getMapTemplateById(id: string): Promise<HydratedDocument<IMapTemplate>>;
  updateMapTemplate(id: string, data: UpdateMapTemplateApiDto): Promise<HydratedDocument<IMapTemplate>>;
  archiveMapTemplate(id: string): Promise<HydratedDocument<IMapTemplate>>;
  restoreMapTemplate(id: string): Promise<HydratedDocument<IMapTemplate>>;
}

/**
 * Cервис для управления бизнес-логикой шаблонов карт.
 */
class MapTemplateService implements IMapTemplateService {
  constructor(private repo: IMapTemplateRepo) {}

  /**
   * Создает новый шаблон карты.
   * @param {CreateMapTemplateApiDto} data - Данные для создания шаблона.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Созданный объект шаблона карты.
   */
  async createMapTemplate(data: CreateMapTemplateApiDto): Promise<HydratedDocument<IMapTemplate>> {
    const existingTemplate = await this.repo.findOne({ name: data.name });
    if (existingTemplate) {
      throw new ConflictError(`Шаблон карты с именем "${data.name}" уже существует.`);
    }

    let imagePayload: { imageUrls?: IImageSet; imageKeys?: IImageKeys } = {};

    if (data.image instanceof File) {
      const uploadResult = await uploadImageVariants(data.image, 'map-template');
      imagePayload = {
        imageUrls: uploadResult.urls as unknown as IImageSet,
        imageKeys: uploadResult.keys as unknown as IImageKeys,
      };
    }

    const newTemplate = await this.repo.create({
      ...data,
      ...imagePayload,
    });

    // Инвалидация кэша списков
    await cache.incrementListRevision(cacheKeys.mapTemplatesRev());
    
    // Инвалидация Next.js Data Cache для публичных страниц
    revalidateTag('map-templates:public');

    // Немедленная синхронная индексация для критических операций создания
    try {
      await searchService.syncDocument('update', 'MapTemplate', newTemplate.id);
      console.log(`🔍 [Search] Шаблон карты ${newTemplate.id} немедленно проиндексирован`);
    } catch (error) {
      console.error(`⚠️ [Search] Ошибка немедленной индексации шаблона ${newTemplate.id}:`, error);
      // Не прерываем выполнение, если индексация упала
    }

    // Дублирующая асинхронная задача для надежности (если что-то пошло не так с синхронной)
    const jobId = `map-template:${newTemplate.id}:v1`;
    await searchQueue.add('update', { entity: 'MapTemplate', entityId: newTemplate.id }, { jobId });
    
    return newTemplate;
  }

  /**
   * Получает список шаблонов карт с пагинацией, фильтрацией и кэшированием.
   * @param {GetMapTemplatesDto} options - Параметры запроса.
   * @returns {Promise<IFindResult<IMapTemplate>>}
   */
  async getMapTemplates(options: GetMapTemplatesDto): Promise<IFindResult<IMapTemplate>> {
    const { page, limit, q, status } = options;
    const redis = getApiRedisClient();

    // 1. Получаем текущую ревизию списка
    const rev = await redis.get(cacheKeys.mapTemplatesRev()).then(Number).catch(() => 0) || 0;
    const key = cacheKeys.mapTemplatesList(page, limit, rev, q, status);
    const tags = [cacheTags.mapTemplatesList()];

    return cache.getOrSet(
      key,
      () => {
        // 2. Fetcher: эта функция выполнится только при промахе кэша
    const query: UpdateQuery<IMapTemplate> = {};
    
    // ✅ ИСПРАВЛЕНО: Убираем дублирующую фильтрацию - BaseRepo уже обрабатывает status
    if (q) {
      query.name = { $regex: q, $options: 'i' };
    }
    
        // ✅ ИСПРАВЛЕНО: Передаем status в BaseRepo, который правильно обработает фильтрацию
        return this.repo.find({ query, page, limit, status });
      },
      cacheTtls.listShort,
      tags
    );
  }

  /**
   * Получает шаблон карты по ID с кэшированием.
   * @param {string} id - ID шаблона.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Найденный шаблон.
   */
  async getMapTemplateById(id: string): Promise<HydratedDocument<IMapTemplate>> {
    const key = cacheKeys.mapTemplate(id);
    const tags = [cacheTags.mapTemplate(id), cacheTags.mapTemplatesList()];

    return cache.getOrSet(
      key,
      async () => {
    const template = await this.repo.findById(id);
    if (!template) {
      throw new NotFoundError(`Шаблон карты с ID ${id} не найден.`);
    }
    return template;
      },
      cacheTtls.entityMedium,
      tags
    );
  }

  /**
   * Обновляет шаблон карты и инвалидирует кэш.
   * @param {string} id - ID шаблона.
   * @param {UpdateMapTemplateApiDto} data - Данные для обновления.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Обновленный объект.
   */
  async updateMapTemplate(id: string, data: UpdateMapTemplateApiDto): Promise<HydratedDocument<IMapTemplate>> {
    const templateToUpdate = await this.getMapTemplateById(id);

    if (data.name && data.name !== templateToUpdate.name) {
      const existingTemplate = await this.repo.findOne({ name: data.name });
      if (existingTemplate && existingTemplate.id.toString() !== id) {
        throw new ConflictError(`Шаблон карты с именем "${data.name}" уже существует.`);
      }
    }

    const { image, ...restData } = data;
    Object.assign(templateToUpdate, restData);

    if (image instanceof File) {
      const oldKeys = Object.values(templateToUpdate.imageKeys || {}).filter(Boolean) as string[];

      const uploadResult = await uploadImageVariants(image, 'map-template', id);
      templateToUpdate.imageUrls = uploadResult.urls as unknown as IImageSet;
      templateToUpdate.imageKeys = uploadResult.keys as unknown as IImageKeys;
      
      if (oldKeys.length > 0) {
        await deleteImageVariants(oldKeys);
      }
    }
    
    const updatedTemplate = await this.repo.save(templateToUpdate);

    if (!updatedTemplate) {
      throw new ConflictError('Не удалось обновить шаблон карты.');
    }

    // Инвалидация кэша
    await cache.invalidateByTags([cacheTags.mapTemplate(id), cacheTags.mapTemplatesList()]);
    await cache.incrementListRevision(cacheKeys.mapTemplatesRev());
    
    // Инвалидация Next.js Data Cache
    revalidateTag('map-templates:public');
    revalidateTag(`map-template:${id}:public`);
    
    // ✅ ИСПРАВЛЕНО: Немедленная синхронная индексация для критических операций
    try {
      await searchService.syncDocument('update', 'MapTemplate', updatedTemplate.id);
      console.log(`🔍 [Search] Шаблон карты ${updatedTemplate.id} немедленно обновлен в поиске (обновление)`);
    } catch (error) {
      console.error(`⚠️ [Search] Ошибка немедленной индексации при обновлении шаблона ${updatedTemplate.id}:`, error);
      // Не прерываем выполнение, если индексация упала
    }

    // Дублирующая асинхронная задача для надежности
    const jobId = `map-template:${updatedTemplate.id}:v1`;
    await searchQueue.add('update', { entity: 'MapTemplate', entityId: updatedTemplate.id }, { jobId });
    return updatedTemplate;
  }

  /**
   * Архивирует шаблон карты и инвалидирует кэш.
   * @param {string} id - ID шаблона для архивации.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Архивированный шаблон.
   */
  async archiveMapTemplate(id: string): Promise<HydratedDocument<IMapTemplate>> {
    const template = await this.repo.findById(id, { includeArchived: true });

    if (!template) {
      throw new NotFoundError(`Шаблон карты с ID ${id} для архивации не найден.`);
    }
    if (template.archivedAt) {
      throw new ConflictError('Этот шаблон уже находится в архиве.');
    }
    
    const archivedTemplate = await this.repo.archive(id);

    // Инвалидация кэша
    await cache.invalidateByTags([cacheTags.mapTemplate(id), cacheTags.mapTemplatesList()]);
    await cache.incrementListRevision(cacheKeys.mapTemplatesRev());

    // Инвалидация Next.js Data Cache
    revalidateTag('map-templates:public');
    revalidateTag(`map-template:${id}:public`);

    // ✅ ИСПРАВЛЕНО: Немедленная синхронная индексация для критических операций
    try {
      await searchService.syncDocument('update', 'MapTemplate', archivedTemplate.id);
      console.log(`🔍 [Search] Шаблон карты ${archivedTemplate.id} немедленно обновлен в поиске (архивация)`);
    } catch (error) {
      console.error(`⚠️ [Search] Ошибка немедленной индексации при архивации шаблона ${archivedTemplate.id}:`, error);
      // Не прерываем выполнение, если индексация упала
    }

    // Дублирующая асинхронная задача для надежности
    const jobId = `map-template:${archivedTemplate.id}:v1`;
    await searchQueue.add('update', { entity: 'MapTemplate', entityId: archivedTemplate.id }, { jobId });
    return archivedTemplate;
  }

  /**
   * Восстанавливает шаблон карты и инвалидирует кэш.
   * @param {string} id - ID шаблона для восстановления.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Восстановленный шаблон.
   */
  async restoreMapTemplate(id: string): Promise<HydratedDocument<IMapTemplate>> {
    const template = await this.repo.findById(id, { includeArchived: true });

    if (!template) {
      throw new NotFoundError(`Шаблон карты с ID ${id} для восстановления не найден.`);
    }
    if (!template.archivedAt) {
      throw new ConflictError('Этот шаблон не находится в архиве.');
    }

    const restoredTemplate = await this.repo.restore(id);
    
    // Инвалидация кэша
    await cache.invalidateByTags([cacheTags.mapTemplate(id), cacheTags.mapTemplatesList()]);
    await cache.incrementListRevision(cacheKeys.mapTemplatesRev());

    // Инвалидация Next.js Data Cache
    revalidateTag('map-templates:public');
    revalidateTag(`map-template:${id}:public`);

    // ✅ ИСПРАВЛЕНО: Немедленная синхронная индексация для критических операций
    try {
      await searchService.syncDocument('update', 'MapTemplate', restoredTemplate.id);
      console.log(`🔍 [Search] Шаблон карты ${restoredTemplate.id} немедленно обновлен в поиске (восстановление)`);
    } catch (error) {
      console.error(`⚠️ [Search] Ошибка немедленной индексации при восстановлении шаблона ${restoredTemplate.id}:`, error);
      // Не прерываем выполнение, если индексация упала
    }

    // Дублирующая асинхронная задача для надежности
    const jobId = `map-template:${restoredTemplate.id}:v1`;
    await searchQueue.add('update', { entity: 'MapTemplate', entityId: restoredTemplate.id }, { jobId });
    return restoredTemplate;
  }
}

const mapTemplateService = new MapTemplateService(mapTemplateRepo);
export default mapTemplateService; 
