import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

// Мокируем зависимости ДО импорта самого сервиса
vi.mock('meilisearch');
vi.mock('../../../../configs/meilisearch-config');
vi.mock('@/queues/search-queue');
// vi.mock('mongoose'); // Мокировать mongoose не нужно, т.к. мы будем использовать in-memory db

// Импортируем типы и мокированные модули
import { MeiliSearch, EnqueuedTask } from 'meilisearch';
import { meilisearchConfig } from '../../../../configs/meilisearch-config';
import searchQueue from '@/queues/search-queue';
import { connectToTestDB, clearTestDB, disconnectFromTestDB } from '@/lib/test-helpers';
import MapTemplate from '@/models/map/MapTemplate';
import mongoose, { Model } from 'mongoose';

// @ts-ignore
const MockedMeiliSearch = MeiliSearch as vi.Mock;

describe('SearchService', () => {
  let searchService: any;
  let mockClient: any;

  beforeAll(async () => {
    await connectToTestDB();
  });

  beforeEach(async () => {
    // vi.resetModules() критически важен для тестирования синглтонов.
    // Он очищает кэш модулей, заставляя search-service.ts исполняться заново для каждого теста.
    vi.resetModules();
    vi.clearAllMocks();
    await clearTestDB();

    // Настраиваем мок MeiliSearch
    const mockIndexInstance = {
      updateSettings: vi.fn().mockResolvedValue({} as EnqueuedTask),
      addDocuments: vi.fn().mockResolvedValue({} as EnqueuedTask),
      deleteDocument: vi.fn().mockResolvedValue({} as EnqueuedTask),
    };
    mockClient = {
      index: vi.fn(() => mockIndexInstance),
      multiSearch: vi.fn(),
      createIndex: vi.fn().mockResolvedValue({} as EnqueuedTask),
    };
    // @ts-ignore
    (MockedMeiliSearch as vi.Mock).mockReturnValue(mockClient);

    // Импортируем сервис ПОСЛЕ настройки моков
    const serviceModule = await import('./search-service');
    searchService = serviceModule.default;
  });

  afterAll(async () => {
    await disconnectFromTestDB();
  });


  it('init() - должен создать индексы и обновить настройки для всех сущностей из конфига', async () => {
    await searchService.init();

    const configuredIndexes = Object.keys(meilisearchConfig);
    expect(mockClient.createIndex).toHaveBeenCalledTimes(configuredIndexes.length);

    // Проверяем что для КАЖДОГО индекса из конфига была вызвана его настройка
    for (const entityName of configuredIndexes) {
      const config = meilisearchConfig[entityName as keyof typeof meilisearchConfig];
      const index = mockClient.index(entityName);

      expect(mockClient.createIndex).toHaveBeenCalledWith(entityName, { primaryKey: 'id' });
      expect(index.updateSettings).toHaveBeenCalledWith({
        filterableAttributes: config.filterableAttributes,
        sortableAttributes: config.sortableAttributes,
        searchableAttributes: config.searchableAttributes,
      });
    }
  });

  it('search() - должен выполнять мультипоиск и форматировать результаты', async () => {
    mockClient.multiSearch.mockResolvedValue({
      results: [{ hits: [{ id: 1, name: 'Test Map' }], indexUid: 'map_templates' }],
    });

    const result = await searchService.search('test', ['map_templates']);

    expect(mockClient.multiSearch).toHaveBeenCalledWith({
      queries: [{ indexName: 'map_templates', q: 'test' }],
    });
    expect(result.map_templates).toEqual([{ id: 1, name: 'Test Map' }]);
  });
  
  it('syncDocument() - [update] должен добавить документ в индекс, если он существует в БД', async () => {
    const mapTemplate = await MapTemplate.create({ name: 'Test Map', image: 'test.jpg' });
    
    await searchService.syncDocument('map_templates', mapTemplate.id, 'update');

    const mapIndex = mockClient.index('map_templates');
    expect(mapIndex.addDocuments).toHaveBeenCalledTimes(1);
    // Проверяем, что ID конвертируется в строку для Meilisearch
    const sentDocument = mapIndex.addDocuments.mock.calls[0][0][0];
    expect(sentDocument.id).toBe(mapTemplate.id.toString());
    expect(sentDocument.name).toBe('Test Map');
  });

  it('syncDocument() - [update] должен удалить документ из индекса, если он не найден в БД', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    await searchService.syncDocument('map_templates', nonExistentId, 'update');

    const mapIndex = mockClient.index('map_templates');
    expect(mapIndex.deleteDocument).toHaveBeenCalledWith(nonExistentId.toString());
    expect(mapIndex.addDocuments).not.toHaveBeenCalled();
  });

  it('syncDocument() - [delete] должен удалить документ из индекса', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    await searchService.syncDocument('map_templates', nonExistentId, 'delete');

    const mapIndex = mockClient.index('map_templates');
    expect(mapIndex.deleteDocument).toHaveBeenCalledWith(nonExistentId.toString());
  });
}); 