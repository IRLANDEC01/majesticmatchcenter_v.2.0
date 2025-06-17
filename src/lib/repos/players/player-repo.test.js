import { playerRepository } from './player-repo.js';
import Player from '@/models/player/Player.js';
import { cache } from '@/lib/cache';

// Мокаем кэш
jest.mock('@/lib/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    invalidateByTag: jest.fn(),
  },
}));

describe('PlayerRepository', () => {
  beforeAll(async () => {
    await Player.init();
  });

  let player1Data, player2Data;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    player1Data = { firstName: 'PlayerOne', lastName: 'Test' };
    player2Data = { firstName: 'PlayerTwo', lastName: 'Test' };
  });

  describe('create', () => {
    it('должен создавать и возвращать игрока', async () => {
      const player = await playerRepository.create(player1Data);
      expect(player).toBeDefined();
      expect(player.firstName).toBe(player1Data.firstName);
      expect(player.lastName).toBe(player1Data.lastName);
      // Slug капитализируется в модели, поэтому 'PlayerOne' -> 'playerone'
      const expectedSlug = `${player1Data.firstName.toLowerCase()}-${player1Data.lastName.toLowerCase()}`;
      expect(player.slug).toBe(expectedSlug);
    });

    it('должен вызывать инвалидацию кэша списка игроков', async () => {
      await playerRepository.create(player1Data);
      expect(cache.invalidateByTag).toHaveBeenCalledWith('players_list');
    });

    it('не должен создавать игрока с одинаковыми именем и фамилией', async () => {
      await playerRepository.create(player1Data);
      await expect(playerRepository.create(player1Data)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('должен находить игрока по ID', async () => {
      const player = await playerRepository.create(player1Data);
      if (!player) {
          throw new Error("Player creation failed in test setup");
      }
      const foundPlayer = await playerRepository.findById(player._id);
      expect(foundPlayer).toBeDefined();
      if (foundPlayer) {
        const expectedSlug = `${player1Data.firstName.toLowerCase()}-${player1Data.lastName.toLowerCase()}`;
        expect(foundPlayer.slug).toBe(expectedSlug);
      }
    });
  });

  describe('findBySlug', () => {
    it('должен находить игрока по слагу', async () => {
      const player = await playerRepository.create(player1Data);
       if (!player) {
          throw new Error("Player creation failed in test setup");
      }
      const foundPlayer = await playerRepository.findBySlug(player.slug);
      expect(foundPlayer).toBeDefined();
      if (foundPlayer) {
        // Модель капитализирует имя, поэтому сравниваем с исходными данными
        expect(foundPlayer.firstName).toBe(player1Data.firstName);
      }
    });
  });

  describe('findAll', () => {
    it('должен возвращать всех неархивированных игроков', async () => {
      await playerRepository.create(player1Data);
      await playerRepository.create(player2Data);
      const players = await playerRepository.findAll();
      expect(players).toHaveLength(2);
    });

    it('должен возвращать только неархивированных игроков по умолчанию', async () => {
      await playerRepository.create(player1Data);
      const playerToArchive = await playerRepository.create(player2Data);
      
      await playerRepository.archiveById(playerToArchive._id);

      const players = await playerRepository.findAll();
      expect(players).toHaveLength(1);
      expect(players[0].lastName).toBe(player1Data.lastName);
    });

    it('должен возвращать всех игроков, включая архивированных, если указана опция', async () => {
      await playerRepository.create(player1Data);
      const playerToArchive = await playerRepository.create(player2Data);
      
      await playerRepository.archiveById(playerToArchive._id);

      const players = await playerRepository.findAll({ includeArchived: true });
      expect(players).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('должен обновлять данные игрока и инвалидировать кэш', async () => {
      const player = await playerRepository.create(player1Data);
      if (!player) {
        throw new Error("Player creation failed in test setup");
      }
      const updatedData = { bio: 'New bio added' };

      const updatedPlayer = await playerRepository.update(player._id, updatedData);
      expect(updatedPlayer).not.toBeNull();
      if(updatedPlayer) {
          expect(updatedPlayer.bio).toBe('New bio added');
      }
      expect(cache.invalidateByTag).toHaveBeenCalledWith(`player:${player._id}`);
      expect(cache.invalidateByTag).toHaveBeenCalledWith('players_list');
    });
  });

  describe('archiveById and restoreById', () => {
    it('archiveById должен устанавливать `archivedAt` и инвалидировать кэш', async () => {
      const player = await playerRepository.create(player1Data);
      
      const archivedPlayer = await playerRepository.archiveById(player._id);
      
      expect(archivedPlayer).not.toBeNull();
      expect(archivedPlayer.archivedAt).toBeInstanceOf(Date);
      
      const foundPlayer = await Player.findById(player._id);
      expect(foundPlayer.archivedAt).toBeInstanceOf(Date);

      expect(cache.invalidateByTag).toHaveBeenCalledWith(`player:${player._id}`);
      expect(cache.invalidateByTag).toHaveBeenCalledWith(`player:slug:${foundPlayer.slug}`);
      expect(cache.invalidateByTag).toHaveBeenCalledWith('players_list');
    });

    it('findById не должен находить архивированного игрока', async () => {
      const player = await playerRepository.create(player1Data);
      await playerRepository.archiveById(player._id);

      const foundPlayer = await playerRepository.findById(player._id);
      expect(foundPlayer).toBeNull();
    });

    it('restoreById должен устанавливать `archivedAt` в null', async () => {
      const player = await playerRepository.create(player1Data);
      await playerRepository.archiveById(player._id);
      
      const restoredPlayer = await playerRepository.restoreById(player._id);
      expect(restoredPlayer).not.toBeNull();
      expect(restoredPlayer.archivedAt).toBeNull();

      const foundPlayer = await playerRepository.findById(player._id);
      expect(foundPlayer).not.toBeNull();
      expect(foundPlayer.archivedAt).toBeNull();
    });

    it('archiveById должен возвращать null, если игрок уже архивирован', async () => {
      const player = await playerRepository.create(player1Data);
      await playerRepository.archiveById(player._id);

      // Повторная архивация
      const result = await playerRepository.archiveById(player._id);
      expect(result).toBeNull();
    });
  });
}); 