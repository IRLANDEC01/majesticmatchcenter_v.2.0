import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest';

// Мокируем зависимости ДО импорта самого сервиса
vi.mock('meilisearch');
vi.mock('../../../../configs/meilisearch-config');
vi.mock('@/queues/search-queue');

// Импортируем типы и мокированные модули
import { MeiliSearch, EnqueuedTask } from 'meilisearch';
import { meilisearchConfig as actualConfig } from '../../../../configs/meilisearch-config';
import searchQueue from '@/queues/search-queue';
import { connectToTestDB, clearTestDB, disconnectFromTestDB } from '@/lib/test-helpers';
import MapTemplate from '@/models/map/MapTemplate';
import mongoose from 'mongoose';

describe('SearchService', () => {
  let searchService: any;
  let mockClient: any;
  let mockMapTemplatesIndex: any;

  beforeAll(async () => {
    await connectToTestDB();
  });

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    await clearTestDB();

    mockMapTemplatesIndex = {
      updateFilterableAttributes: vi.fn(),
      updateSortableAttributes: vi.fn(),
      updateSearchableAttributes: vi.fn(),
      addDocuments: vi.fn().mockResolvedValue({} as EnqueuedTask),
      deleteDocument: vi.fn().mockResolvedValue({} as EnqueuedTask),
    };

    mockClient = {
      index: vi.fn((indexName) => {
        if (indexName === 'map_templates') return mockMapTemplatesIndex;
        return { 
          updateFilterableAttributes: vi.fn(), 
          updateSortableAttributes: vi.fn(), 
          updateSearchableAttributes: vi.fn() 
        };
      }),
      multiSearch: vi.fn(),
      createIndex: vi.fn().mockResolvedValue({} as EnqueuedTask),
    };

    vi.mocked(MeiliSearch).mockReturnValue(mockClient);

    vi.mocked(actualConfig, true);

    const serviceModule = await import('./search-service');
    searchService = serviceModule.default;
  });

  afterAll(async () => {
    await disconnectFromTestDB();
  });

  it('search() - должен выполнять мультипоиск и форматировать результаты', async () => {
    mockClient.multiSearch.mockResolvedValue({
      results: [{ hits: [{ id: 1, name: 'Test Map' }], indexUid: 'map_templates' }],
    });

    const result = await searchService.search('test', ['mapTemplates']);

    expect(mockClient.multiSearch).toHaveBeenCalledWith({
      queries: [{ indexUid: 'map_templates', q: 'test' }],
    });
    expect(result.results.mapTemplates).toEqual([{ id: 1, name: 'Test Map' }]);
  });
  
  it('syncDocument() - [update] должен добавить документ в правильный индекс, если он существует в БД', async () => {
    const mapTemplate = await MapTemplate.create({ 
      name: 'Test Map', 
      mapTemplateImage: 'https://example.com/test.jpg' 
    });
    
    await searchService.syncDocument('update', 'MapTemplate', mapTemplate.id.toString());

    expect(mockClient.index).toHaveBeenCalledWith('map_templates');
    expect(mockMapTemplatesIndex.addDocuments).toHaveBeenCalledTimes(1);

    const sentDocument = mockMapTemplatesIndex.addDocuments.mock.calls[0][0][0];
    expect(sentDocument.id).toBe(mapTemplate.id.toString());
    expect(sentDocument.name).toBe('Test Map');
  });

  it('syncDocument() - [update] должен удалить документ из индекса, если он не найден в БД', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    await searchService.syncDocument('update', 'MapTemplate', nonExistentId.toString());

    expect(mockClient.index).toHaveBeenCalledWith('map_templates');
    expect(mockMapTemplatesIndex.deleteDocument).toHaveBeenCalledWith(nonExistentId.toString());
    expect(mockMapTemplatesIndex.addDocuments).not.toHaveBeenCalled();
  });

  it('syncDocument() - [delete] должен удалить документ из индекса', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    await searchService.syncDocument('delete', 'MapTemplate', nonExistentId.toString());

    expect(mockClient.index).toHaveBeenCalledWith('map_templates');
    expect(mockMapTemplatesIndex.deleteDocument).toHaveBeenCalledWith(nonExistentId.toString());
  });

  it('reindexAll() - должен добавлять в очередь задачи на индексацию для каждой сущности', async () => {
    await MapTemplate.create({ 
      name: 'Map 1', 
      mapTemplateImage: 'https://example.com/map1.jpg' 
    });
    await MapTemplate.create({ 
      name: 'Map 2', 
      mapTemplateImage: 'https://example.com/map2.jpg' 
    });

    await searchService.reindexAll();

    expect(searchQueue.add).toHaveBeenCalledTimes(2);
    expect(vi.mocked(searchQueue.add).mock.calls[0][0]).toBe('update');
    expect(vi.mocked(searchQueue.add).mock.calls[0][1]).toMatchObject({ entity: 'MapTemplate' });
    
    expect(vi.mocked(searchQueue.add).mock.calls[1][0]).toBe('update');
    expect(vi.mocked(searchQueue.add).mock.calls[1][1]).toMatchObject({ entity: 'MapTemplate' });
  });
}); 