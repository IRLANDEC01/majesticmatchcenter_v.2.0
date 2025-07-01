import 'server-only';
import { MeiliSearch, Task, EnqueuedTask } from 'meilisearch';
import { meilisearchConfig, MeiliIndexConfig } from '../../../../configs/meilisearch-config';
import mongoose from 'mongoose';
import searchQueue from '@/queues/search-queue';

interface LeanDocument {
  _id: mongoose.Types.ObjectId;
  [key: string]: any;
}

class SearchService {
  private client: MeiliSearch;

  constructor() {
    if (!process.env.MEILISEARCH_HOST || !process.env.MEILISEARCH_MASTER_KEY) {
      throw new Error('Переменные окружения MeiliSearch не установлены.');
    }

    this.client = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST,
      apiKey: process.env.MEILISEARCH_MASTER_KEY,
    });
  }

  /**
   * Инициализирует MeiliSearch индексы и их настройки.
   * Вызывается один раз при старте приложения.
   */
  public async init(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Инициализация SearchService...');
    }
    try {
      const indexes = Object.values(meilisearchConfig) as MeiliIndexConfig[];
      for (const indexConfig of indexes) {
        const { indexName, primaryKey, filterableAttributes, sortableAttributes, searchableAttributes } = indexConfig;

        // Создаем индекс, если его нет. Указываем primaryKey при создании.
        await this.client.createIndex(indexName, { primaryKey });
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Индекс "${indexName}" готов.`);
        }

        const index = this.client.index(indexName);

        // Обновляем настройки. MeiliSearch игнорирует обновления, если настройки не изменились.
        if (filterableAttributes) {
          await index.updateFilterableAttributes(filterableAttributes);
          if (process.env.NODE_ENV !== 'production') {
            console.log(`- Настроены фильтруемые атрибуты для "${indexName}"`);
          }
        }
        if (sortableAttributes) {
          await index.updateSortableAttributes(sortableAttributes);
          if (process.env.NODE_ENV !== 'production') {
            console.log(`- Настроены сортируемые атрибуты для "${indexName}"`);
          }
        }
        if (searchableAttributes) {
          await index.updateSearchableAttributes(searchableAttributes);
          if (process.env.NODE_ENV !== 'production') {
            console.log(`- Настроены поисковые атрибуты для "${indexName}"`);
          }
        }
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log('Инициализация SearchService успешно завершена.');
      }
    } catch (error) {
      console.error('Ошибка при инициализации SearchService:', error);
      // В dev-режиме можно пробросить ошибку, чтобы сразу ее увидеть.
      // В production можно просто залогировать и продолжить работу.
      if (process.env.NODE_ENV !== 'production') {
        throw error;
      }
    }
  }

  /**
   * Запускает полную переиндексацию всех сконфигурированных сущностей.
   * Проходится по всем моделям из meilisearchConfig и добавляет задачи на обновление в очередь.
   */
  public async reindexAll(): Promise<{ totalJobs: number }> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔄 [SearchService] Запуск полной переиндексации...');
    }
    let totalJobs = 0;

    const modelNames = Object.keys(meilisearchConfig);

    for (const modelNameKey of modelNames) {
      const config = meilisearchConfig[modelNameKey];
      // modelName - это имя модели Mongoose, например, 'MapTemplate'
      const modelName = config.modelName; 
      const model = mongoose.models[modelName];
      
      if (!model) {
        console.warn(`- [SearchService] Модель ${modelName} не найдена в Mongoose. Пропускаем.`);
        continue;
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`- [SearchService] Индексация модели ${modelName}...`);
      }
      
      // Находим все документы, включая архивные
      const documents = await model.find({}).lean<LeanDocument[]>();
      
      const promises = documents.map(doc => {
        // BullMQ требует два аргумента: имя задачи и данные
        return searchQueue.add('update', {
          entity: modelName,
          entityId: doc._id.toString(),
        });
      });

      await Promise.all(promises);
      totalJobs += documents.length;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`- [SearchService] Поставлено в очередь ${documents.length} документов для модели ${modelName}.`);
      }
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ [SearchService] В очередь добавлено ${totalJobs} задач на переиндексацию.`);
    }
    return { totalJobs };
  }

  /**
   * Полностью удаляет указанный индекс из MeiliSearch.
   * Внимание: это необратимая операция.
   * @param indexName - Имя индекса для удаления (e.g., 'players').
   */
  public async deleteIndex(indexName: string): Promise<EnqueuedTask> {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[SearchService] Запрос на удаление индекса "${indexName}"...`);
    }
    try {
      const task = await this.client.deleteIndex(indexName);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[SearchService] Задача на удаление индекса "${indexName}" создана (Task UID: ${task.taskUid}).`);
      }
      return task;
    } catch (error) {
      console.error(`[SearchService] Ошибка при удалении индекса "${indexName}":`, error);
      throw error;
    }
  }

  /**
   * Выполняет поиск по нескольким индексам с поддержкой фильтрации.
   * @param query - Поисковый запрос.
   * @param entities - Массив сущностей для поиска (e.g., ['players', 'families']).
   * @param filters - Опциональные фильтры для поиска.
   * @param pagination - Опциональные параметры пагинации для оптимизации payload.
   */
  public async search(
    query: string, 
    entities: string[], 
    filters?: { status?: 'active' | 'archived' | 'all' },
    pagination?: { limit?: number; offset?: number }
  ): Promise<any> {
    // Формируем фильтр для Meilisearch на основе статуса
    let meilisearchFilter: string | undefined;
    if (filters?.status) {
      switch (filters.status) {
        case 'active':
          meilisearchFilter = 'isArchived = false';
          break;
        case 'archived':
          meilisearchFilter = 'isArchived = true';
          break;
        case 'all':
          // Без фильтра - показываем все
          meilisearchFilter = undefined;
          break;
      }
    }

    const searchQueries = entities
      .map(entityKey => {
        const config = meilisearchConfig[entityKey];
        if (!config) {
          console.warn(`[SearchService] No search config found for entity key: ${entityKey}`);
          return null;
        }
        
        const searchQuery: any = { 
          indexUid: config.indexName, 
          q: query 
        };
        
        // Добавляем фильтр если он есть
        if (meilisearchFilter) {
          searchQuery.filter = meilisearchFilter;
        }
        
        // ✅ ОПТИМИЗАЦИЯ: Добавляем пагинацию для уменьшения payload
        if (pagination) {
          if (pagination.limit !== undefined) {
            searchQuery.limit = pagination.limit;
          }
          if (pagination.offset !== undefined) {
            searchQuery.offset = pagination.offset;
          }
        }
        
        return searchQuery;
      })
      .filter((q): q is { indexUid: string; q: string; filter?: string; limit?: number; offset?: number } => q !== null);

    if (searchQueries.length === 0) {
      return { query, entities, results: {} };
    }

    const searchResults = await this.client.multiSearch({ queries: searchQueries as any });

    const formattedResults = searchResults.results.reduce((acc: Record<string, any>, result) => {
      // Находим ключ сущности (например, 'mapTemplates') по имени индекса ('map_templates')
      const entityKey = Object.keys(meilisearchConfig).find(
        key => meilisearchConfig[key].indexName === result.indexUid
      );
      if (entityKey) {
        acc[entityKey] = result.hits;
      }
      return acc;
    }, {});

    return { query, entities, results: formattedResults };
  }

  /**
   * Получает документ из БД и приводит его к виду, готовому для индексации.
   * @param entityName - Имя модели (e.g., 'MapTemplate').
   * @param entityId - ID документа.
   * @returns Готовый для индексации документ или null, если документ не найден.
   * @private
   */
  private async _buildDocument(entityName: string, entityId: string): Promise<Record<string, any> | null> {
    const model = mongoose.models[entityName];
    if (!model) {
      throw new Error(`Модель "${entityName}" не найдена в Mongoose.`);
    }

    // Ищем конфиг по имени модели, чтобы найти нужную buildSearchEntry функцию
    const config = Object.values(meilisearchConfig).find(c => c.modelName === entityName);
    if (!config || !config.buildSearchEntry) {
      throw new Error(`Конфигурация поиска или функция buildSearchEntry для модели "${entityName}" не найдена.`);
    }

    // ✅ ИСПРАВЛЕНИЕ: Включаем архивные документы для поиска
    const doc = await model.findById(entityId, null, { includeArchived: true }).lean<LeanDocument>();
    if (!doc) {
      return null;
    }

    // Используем специальную функцию для построения документа
    return config.buildSearchEntry(doc);
  }

  /**
   * Синхронизирует один документ (обновляет или удаляет) с MeiliSearch.
   * @param action - Действие: 'update' или 'delete'.
   * @param entityName - Имя модели.
   * @param entityId - ID документа.
   */
  public async syncDocument(action: 'update' | 'delete', entityName: string, entityId: string): Promise<void> {
    // Ищем конфиг для этой модели по `modelName`, а не по выдуманному ключу.
    const modelConfigEntry = Object.values(meilisearchConfig).find(
      config => config.modelName === entityName
    );

    if (!modelConfigEntry) {
      // Для этой модели не настроен поиск, просто выходим.
      return;
    }

    const index = this.client.index(modelConfigEntry.indexName);

    if (action === 'delete') {
      await index.deleteDocument(entityId);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[SearchService] Документ ${entityId} удален из индекса ${modelConfigEntry.indexName}`);
      }
      return;
    }

    // Для action 'update'
    const documentPayload = await this._buildDocument(entityName, entityId);
    if (documentPayload) {
      await index.addDocuments([documentPayload], { primaryKey: 'id' });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[SearchService] Документ ${entityId} синхронизирован с индексом ${modelConfigEntry.indexName}`);
      }
    } else {
      // Если документ не найден в БД, возможно, его нужно удалить и из индекса
      await index.deleteDocument(entityId).catch(e => console.warn(`Не удалось удалить отсутствующий документ ${entityId} из индекса. Возможно, его там и не было.`));
    }
  }
}

const searchService = new SearchService();
export default searchService; 