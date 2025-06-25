import { MeiliSearch, Task, EnqueuedTask } from 'meilisearch';
import { meilisearchConfig, MeiliIndexConfig } from '@/configs/meilisearch-config';
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
   * Инициализирует индексы, настройки фильтров и сортировки.
   * Вызывается один раз при старте приложения.
   */
  public async init(): Promise<void> {
    console.log('Инициализация SearchService...');
    try {
      const indexes = Object.values(meilisearchConfig) as MeiliIndexConfig[];
      for (const indexConfig of indexes) {
        const { indexName, primaryKey, filterableAttributes, sortableAttributes, searchableAttributes } = indexConfig;

        // Создаем индекс, если его нет. Указываем primaryKey при создании.
        await this.client.createIndex(indexName, { primaryKey });
        console.log(`Индекс "${indexName}" готов.`);

        const index = this.client.index(indexName);

        // Обновляем настройки. MeiliSearch игнорирует обновления, если настройки не изменились.
        if (filterableAttributes) {
          await index.updateFilterableAttributes(filterableAttributes);
          console.log(`- Настроены фильтруемые атрибуты для "${indexName}"`);
        }
        if (sortableAttributes) {
          await index.updateSortableAttributes(sortableAttributes);
          console.log(`- Настроены сортируемые атрибуты для "${indexName}"`);
        }
        if (searchableAttributes) {
          await index.updateSearchableAttributes(searchableAttributes);
          console.log(`- Настроены поисковые атрибуты для "${indexName}"`);
        }
      }
      console.log('Инициализация SearchService успешно завершена.');
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
    console.log('🔄 [SearchService] Запуск полной переиндексации...');
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
      
      console.log(`- [SearchService] Индексация модели ${modelName}...`);
      
      // Находим все документы, включая архивные
      const documents = await model.find({}).lean<LeanDocument[]>();
      
      const promises = documents.map(doc => {
        return searchQueue.add({
          action: 'update',
          entity: modelName,
          entityId: doc._id.toString(),
        });
      });

      await Promise.all(promises);
      totalJobs += documents.length;
      console.log(`- [SearchService] Поставлено в очередь ${documents.length} документов для модели ${modelName}.`);
    }
    
    console.log(`✅ [SearchService] В очередь добавлено ${totalJobs} задач на переиндексацию.`);
    return { totalJobs };
  }

  /**
   * Полностью удаляет указанный индекс из MeiliSearch.
   * Внимание: это необратимая операция.
   * @param indexName - Имя индекса для удаления (e.g., 'players').
   */
  public async deleteIndex(indexName: string): Promise<EnqueuedTask> {
    console.log(`[SearchService] Запрос на удаление индекса "${indexName}"...`);
    try {
      const task = await this.client.deleteIndex(indexName);
      console.log(`[SearchService] Задача на удаление индекса "${indexName}" создана (Task UID: ${task.taskUid}).`);
      return task;
    } catch (error) {
      console.error(`[SearchService] Ошибка при удалении индекса "${indexName}":`, error);
      throw error;
    }
  }

  /**
   * Выполняет поиск по нескольким индексам.
   * @param query - Поисковый запрос.
   * @param entities - Массив сущностей для поиска (e.g., ['players', 'families']).
   */
  public async search(query: string, entities: string[]): Promise<any> {
    const searchQueries = entities
      .map(entityKey => {
        const indexConfig = meilisearchConfig[entityKey];
        if (!indexConfig) {
          console.warn(`Конфигурация для сущности "${entityKey}" не найдена.`);
          return null;
        }
        return { indexName: indexConfig.indexName, q: query };
      })
      .filter(Boolean);

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

    const doc = await model.findById(entityId).lean<LeanDocument>();
    if (!doc) {
      return null;
    }

    // Простое преобразование для примера. В будущем здесь может быть сложная логика.
    return {
      id: doc._id.toString(),
      ...doc,
    };
  }

  /**
   * Синхронизирует один документ (обновляет или удаляет) с MeiliSearch.
   * @param action - Действие: 'update' или 'delete'.
   * @param entityName - Имя модели.
   * @param entityId - ID документа.
   */
  public async syncDocument(action: 'update' | 'delete', entityName: string, entityId: string): Promise<void> {
    const modelKey = entityName.toLowerCase() + 's'; // 'MapTemplate' -> 'maptemplates'
    const indexConfig = meilisearchConfig[modelKey];

    if (!indexConfig) {
      // Для этой модели не настроен поиск, просто выходим.
      return;
    }

    const index = this.client.index(indexConfig.indexName);

    if (action === 'delete') {
      await index.deleteDocument(entityId);
      console.log(`[SearchService] Документ ${entityId} удален из индекса ${indexConfig.indexName}`);
      return;
    }

    // Для action 'update'
    const documentPayload = await this._buildDocument(entityName, entityId);
    if (documentPayload) {
      await index.addDocuments([documentPayload], { primaryKey: 'id' });
      console.log(`[SearchService] Документ ${entityId} синхронизирован с индексом ${indexConfig.indexName}`);
    } else {
      // Если документ не найден в БД, возможно, его нужно удалить и из индекса
      await index.deleteDocument(entityId).catch(e => console.warn(`Не удалось удалить отсутствующий документ ${entityId} из индекса. Возможно, его там и не было.`));
    }
  }
}

const searchService = new SearchService();
export default searchService; 