import { HydratedDocument, UpdateQuery } from 'mongoose';
import mapTemplateRepo, { IMapTemplateRepo } from '@/lib/repos/map-templates/map-template-repo';
import searchQueue from '@/queues/search-queue';
import searchService from '@/lib/domain/search/search-service';
import tournamentTemplateRepo from '@/lib/repos/tournament-templates/tournament-template-repo';
import { IMapTemplate } from '@/models/map/MapTemplate';
import { NotFoundError, ConflictError } from '@/lib/errors';
import { IFindParams, IFindResult } from '@/lib/repos/base-repo';
import { GetMapTemplatesDto, CreateMapTemplateDto, UpdateMapTemplateDto } from '@/lib/api/schemas/map-templates/map-template-schemas';
import * as cache from '@/lib/cache';
import { cacheKeys, cacheTags, cacheTtls } from '@/lib/cache/cache-policy';
import { getApiRedisClient } from '@/lib/redis-clients';
import { revalidateTag } from 'next/cache';

export interface IMapTemplateService {
  createMapTemplate(data: CreateMapTemplateDto): Promise<HydratedDocument<IMapTemplate>>;
  getMapTemplates(options: GetMapTemplatesDto): Promise<IFindResult<IMapTemplate>>;
  getMapTemplateById(id: string): Promise<HydratedDocument<IMapTemplate>>;
  updateMapTemplate(id: string, data: UpdateMapTemplateDto): Promise<HydratedDocument<IMapTemplate>>;
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
   * @param {CreateMapTemplateDto} data - Данные для создания шаблона.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Созданный объект шаблона карты.
   */
  async createMapTemplate(data: CreateMapTemplateDto): Promise<HydratedDocument<IMapTemplate>> {
    const existingTemplate = await this.repo.findOne({ name: data.name });
    if (existingTemplate) {
      throw new ConflictError(`Шаблон карты с именем "${data.name}" уже существует.`);
    }

    // Преобразуем File в placeholder URL (временное решение до S3 интеграции)
    const processedData: Omit<CreateMapTemplateDto, 'mapTemplateImage'> & { mapTemplateImage: string } = { 
      ...data,
      mapTemplateImage: typeof data.mapTemplateImage === 'string' ? data.mapTemplateImage : ''
    };
    
    if (data.mapTemplateImage instanceof File) {
      const placeholders = [
        'https://placehold.co/600x400/F4A261/E9C46A?text=Map+1',
        'https://placehold.co/600x400/2A9D8F/E9C46A?text=Map+2',
        'https://placehold.co/600x400/E76F51/E9C46A?text=Map+3',
        'https://placehold.co/600x400/264653/E9C46A?text=Map+4',
        'https://placehold.co/600x400/A8DADC/1D3557?text=Map+5',
      ];
      const randomIndex = Math.floor(Math.random() * placeholders.length);
      processedData.mapTemplateImage = placeholders[randomIndex];
    }

    const newTemplate = await this.repo.create(processedData);

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
    await searchQueue.add('update', { entity: 'map-template', entityId: newTemplate.id }, { jobId });
    
    return newTemplate;
  }

  /**
   * Возвращает все шаблоны карт с кэшированием.
   * @param {GetMapTemplatesDto} options - Опции для фильтрации и пагинации.
   * @returns {Promise<IFindResult<IMapTemplate>>}
   */
  async getMapTemplates(options: GetMapTemplatesDto): Promise<IFindResult<IMapTemplate>> {
    const { page, limit, q, status } = options;
    const redis = getApiRedisClient();

    // 1. Получаем текущую ревизию списка
    const rev = await redis.get(cacheKeys.mapTemplatesRev()).then(Number).catch(() => 0) || 0;
    const key = cacheKeys.mapTemplatesList(page, limit, rev);
    const tags = [cacheTags.mapTemplatesList()];

    return cache.getOrSet(
      key,
      () => {
        // 2. Fetcher: эта функция выполнится только при промахе кэша
    const query: UpdateQuery<IMapTemplate> = {};
    if (q) {
      query.name = { $regex: q, $options: 'i' };
    }
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
   * @param {UpdateMapTemplateDto} data - Данные для обновления.
   * @returns {Promise<HydratedDocument<IMapTemplate>>} - Обновленный объект.
   */
  async updateMapTemplate(id: string, data: UpdateMapTemplateDto): Promise<HydratedDocument<IMapTemplate>> {
    const templateToUpdate = await this.getMapTemplateById(id);

    if (data.name && data.name !== templateToUpdate.name) {
      const existingTemplate = await this.repo.findOne({ name: data.name });
      if (existingTemplate && existingTemplate.id.toString() !== id) {
        throw new ConflictError(`Шаблон карты с именем "${data.name}" уже существует.`);
      }
    }
    
    Object.assign(templateToUpdate, data);
    
    const updatedTemplate = await this.repo.save(templateToUpdate);

    // Инвалидация кэша
    await cache.invalidateByTags([cacheTags.mapTemplate(id), cacheTags.mapTemplatesList()]);
    await cache.incrementListRevision(cacheKeys.mapTemplatesRev());
    
    // Инвалидация Next.js Data Cache
    revalidateTag('map-templates:public');
    revalidateTag(`map-template:${id}:public`);
    
    const jobId = `map-template:${updatedTemplate.id}:v1`;
    await searchQueue.add('update', { entity: 'map-template', entityId: updatedTemplate.id }, { jobId });
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

    const jobId = `map-template:${archivedTemplate.id}:v1`;
    await searchQueue.add('update', { entity: 'map-template', entityId: archivedTemplate.id }, { jobId });
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

    const jobId = `map-template:${restoredTemplate.id}:v1`;
    await searchQueue.add('update', { entity: 'map-template', entityId: restoredTemplate.id }, { jobId });
    return restoredTemplate;
  }
}

const mapTemplateService = new MapTemplateService(mapTemplateRepo);
export default mapTemplateService; 