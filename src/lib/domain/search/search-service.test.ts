import { describe, it, expect, vi, beforeEach } from 'vitest';

// Мокируем зависимости ДО импорта самого сервиса
vi.mock('meilisearch', () => {
  const mockIndex = {
    updateFilterableAttributes: vi.fn(),
    updateSortableAttributes: vi.fn(),
    updateSearchableAttributes: vi.fn(),
    addDocuments: vi.fn().mockResolvedValue({ taskUid: 1 }),
    deleteDocument: vi.fn().mockResolvedValue({ taskUid: 2 }),
  };
  const mockClient = {
    createIndex: vi.fn().mockResolvedValue({ taskUid: 3 }),
    index: vi.fn(() => mockIndex),
    multiSearch: vi.fn(),
  };
  return {
    MeiliSearch: vi.fn(() => mockClient),
  };
});

vi.mock('@/configs/meilisearch-config', () => ({
  meilisearchConfig: {
    players: {
      indexName: 'players',
      primaryKey: 'id',
      filterableAttributes: ['familyId'],
      sortableAttributes: ['rating'],
      searchableAttributes: ['firstName', 'lastName'],
    },
    families: {
      indexName: 'families',
      primaryKey: 'id',
      filterableAttributes: [],
      sortableAttributes: ['rating'],
      searchableAttributes: ['name'],
    },
  },
}));

vi.mock('mongoose', async () => {
  const actualMongoose = await vi.importActual('mongoose');
  // Используем Object.assign для обхода ошибки типизации при распространении модулей
  const mockedDefault = Object.assign({}, actualMongoose.default, { models: {} });
  const mockedModule = Object.assign({}, actualMongoose, { default: mockedDefault });
  return mockedModule;
});

// Теперь импортируем сервис
import { MeiliSearch } from 'meilisearch';
import { meilisearchConfig } from '@/configs/meilisearch-config';
import mongoose from 'mongoose';

describe('SearchService', () => {
  let searchService: any;
  let mockClient: any;
  let mockIndex: any;

  beforeEach(async () => {
    // vi.resetModules() критически важен для тестирования синглтонов.
    // Он очищает кэш модулей, заставляя search-service.ts исполняться заново для каждого теста.
    vi.resetModules();
    
    // Теперь, когда кэш чист, импортируем сервис заново, чтобы получить свежий экземпляр.
    const serviceModule = await import('./search-service');
    searchService = serviceModule.default;

    // После resetModules нам нужно получить новый хендл мока.
    const { MeiliSearch: MockedMeiliSearch } = await import('meilisearch');
    mockClient = new MockedMeiliSearch({ host: 'dummy', apiKey: 'dummy' });
    
    // Очищаем историю вызовов моков перед каждым тестом
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw an error if environment variables are not set', async () => {
      // Сохраняем оригинальные значения, установленные в setup-файле
      const originalHost = process.env.MEILISEARCH_HOST;
      const originalKey = process.env.MEILISEARCH_MASTER_KEY;

      try {
        // 1. Проверяем отсутствие HOST
        delete process.env.MEILISEARCH_HOST;
        vi.resetModules(); // Перезагружаем модуль с новым окружением
        await expect(import('./search-service')).rejects.toThrow('Переменные окружения MeiliSearch не установлены.');
        
        // Восстанавливаем HOST и удаляем KEY
        process.env.MEILISEARCH_HOST = originalHost;
        delete process.env.MEILISEARCH_MASTER_KEY;

        // 2. Проверяем отсутствие KEY
        vi.resetModules(); // Снова перезагружаем
        await expect(import('./search-service')).rejects.toThrow('Переменные окружения MeiliSearch не установлены.');

      } finally {
        // Гарантированно восстанавливаем переменные для других тестов, даже если что-то пошло не так
        process.env.MEILISEARCH_HOST = originalHost;
        process.env.MEILISEARCH_MASTER_KEY = originalKey;
      }
    });
  });
 
  describe('init', () => {
    it('should create indexes and update settings for all configured entities', async () => {
      await searchService.init();

      // Проверяем, что createIndex был вызван для каждой сущности
      expect(mockClient.createIndex).toHaveBeenCalledTimes(2);
      expect(mockClient.createIndex).toHaveBeenCalledWith('players', { primaryKey: 'id' });
      expect(mockClient.createIndex).toHaveBeenCalledWith('families', { primaryKey: 'id' });

      // Проверяем, что index() был вызван для каждой сущности
      expect(mockClient.index).toHaveBeenCalledWith('players');
      expect(mockClient.index).toHaveBeenCalledWith('families');

      // Проверяем вызовы обновления атрибутов для 'players'
      const playerIndex = mockClient.index('players');
      expect(playerIndex.updateFilterableAttributes).toHaveBeenCalledWith(meilisearchConfig.players.filterableAttributes);
      expect(playerIndex.updateSortableAttributes).toHaveBeenCalledWith(meilisearchConfig.players.sortableAttributes);
      expect(playerIndex.updateSearchableAttributes).toHaveBeenCalledWith(meilisearchConfig.players.searchableAttributes);

      // Проверяем вызовы обновления атрибутов для 'families'
      const familyIndex = mockClient.index('families');
      expect(familyIndex.updateFilterableAttributes).toHaveBeenCalledWith(meilisearchConfig.families.filterableAttributes);
      expect(familyIndex.updateSortableAttributes).toHaveBeenCalledWith(meilisearchConfig.families.sortableAttributes);
      expect(familyIndex.updateSearchableAttributes).toHaveBeenCalledWith(meilisearchConfig.families.searchableAttributes);
    });
  });

  describe('search', () => {
    it('should perform a multi-search and format results', async () => {
      const mockApiResponse = {
        results: [
          { indexUid: 'players', hits: [{ id: 'p1', name: 'Player 1' }] },
          { indexUid: 'families', hits: [{ id: 'f1', name: 'Family 1' }] },
        ],
      };
      mockClient.multiSearch.mockResolvedValue(mockApiResponse);

      const result = await searchService.search('test', ['players', 'families']);

      expect(mockClient.multiSearch).toHaveBeenCalledWith({
        queries: [
          { indexName: 'players', q: 'test' },
          { indexName: 'families', q: 'test' },
        ],
      });

      expect(result).toEqual({
        query: 'test',
        entities: ['players', 'families'],
        results: {
          players: [{ id: 'p1', name: 'Player 1' }],
          families: [{ id: 'f1', name: 'Family 1' }],
        },
      });
    });

    it('should handle entities with no config', async () => {
      const result = await searchService.search('test', ['players', 'nonexistent']);
      expect(mockClient.multiSearch).toHaveBeenCalledWith({
        queries: [{ indexName: 'players', q: 'test' }],
      });
    });
  });

  describe('syncDocument', () => {
    describe("action: 'update'", () => {
      it('should build and add a document if it exists in DB', async () => {
        const mockPlayer = { _id: new mongoose.Types.ObjectId(), name: 'John Doe' };
        mongoose.models.Player = {
          findById: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockPlayer),
          }),
        } as any;

        await searchService.syncDocument('update', 'Player', mockPlayer._id.toString());
        
        const playerIndex = mockClient.index('players');
        expect(playerIndex.addDocuments).toHaveBeenCalledWith(
          [{ id: mockPlayer._id.toString(), ...mockPlayer }],
          { primaryKey: 'id' }
        );
      });

      it('should delete a document from index if it does not exist in DB', async () => {
        const playerId = new mongoose.Types.ObjectId().toString();
        mongoose.models.Player = {
          findById: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(null),
          }),
        } as any;

        await searchService.syncDocument('update', 'Player', playerId);

        const playerIndex = mockClient.index('players');
        expect(playerIndex.deleteDocument).toHaveBeenCalledWith(playerId);
        expect(playerIndex.addDocuments).not.toHaveBeenCalled();
      });
    });

    describe("action: 'delete'", () => {
      it('should delete a document from the index', async () => {
        const playerId = new mongoose.Types.ObjectId().toString();
        await searchService.syncDocument('delete', 'Player', playerId);
        
        const playerIndex = mockClient.index('players');
        expect(playerIndex.deleteDocument).toHaveBeenCalledWith(playerId);
      });
    });

    it('should do nothing for an unconfigured entity', async () => {
        await searchService.syncDocument('update', 'Unconfigured', '123');
        // `mockClient.index` является точкой входа для любой операции с индексом.
        // Если он не был вызван, значит сервис правильно проигнорировал сущность.
        expect(mockClient.index).not.toHaveBeenCalled();
    });
  });
}); 