import mongoose from 'mongoose';
import { tournamentRepository } from './tournament-repo.js';
import Tournament from '@/models/tournament/Tournament.js';
import TournamentTemplate from '@/models/tournament/TournamentTemplate.js';
import MapTemplate from '@/models/map/MapTemplate.js';
import { cache } from '@/lib/cache';

jest.mock('@/lib/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    invalidateByTag: jest.fn(),
  },
}));

describe('TournamentRepository', () => {
  let testTemplate;
  let testMapTemplate;

  beforeAll(async () => {
    await Tournament.init();
    await TournamentTemplate.init();
    await MapTemplate.init();
    
    testMapTemplate = await new MapTemplate({
      name: 'Test Map Template',
      slug: 'test-map-template',
    }).save();

    testTemplate = await new TournamentTemplate({
      name: 'Test Template',
      slug: 'test-template',
      mapTemplates: [testMapTemplate._id],
    }).save();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createTournamentData = (name, type = 'family') => ({
    name,
    template: testTemplate._id,
    tournamentType: type,
    startDate: new Date(),
  });

  describe('create', () => {
    it('должен создавать и возвращать турнир', async () => {
      const tournamentData = createTournamentData('The Great Tournament');
      const tournament = await tournamentRepository.create(tournamentData);
      
      expect(tournament).toBeDefined();
      expect(tournament.name).toBe(tournamentData.name);
      expect(tournament.slug).toBe('the-great-tournament');
    });

    it('должен вызывать инвалидацию кэша списка турниров', async () => {
      const tournamentData = createTournamentData('The Cache Invalidator');
      await tournamentRepository.create(tournamentData);
      expect(cache.invalidateByTag).toHaveBeenCalledWith('tournaments_list');
    });

    it('не должен создавать турнир с одинаковым слагом', async () => {
      const tournamentData = createTournamentData('The Unique Tournament');
      await tournamentRepository.create(tournamentData);
      // Create another with same name (and thus same slug)
      await expect(tournamentRepository.create(tournamentData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('должен находить турнир по ID', async () => {
      const tournamentData = createTournamentData('Find Me By ID');
      const tournament = await tournamentRepository.create(tournamentData);
      
      const foundTournament = await tournamentRepository.findById(tournament._id);
      expect(foundTournament).toBeDefined();
      expect(foundTournament.slug).toBe(tournament.slug);
    });

    it('не должен находить архивированный турнир по ID по умолчанию', async () => {
      const tournament = await tournamentRepository.create(createTournamentData('Archived Find By ID'));
      await tournamentRepository.archiveById(tournament._id);

      const found = await tournamentRepository.findById(tournament._id);
      expect(found).toBeNull();
    });

    it('должен находить архивированный турнир по ID с опцией includeArchived', async () => {
        const tournament = await tournamentRepository.create(createTournamentData('Archived Find By ID With Flag'));
        await tournamentRepository.archiveById(tournament._id);
  
        const found = await tournamentRepository.findById(tournament._id, { includeArchived: true });
        expect(found).toBeDefined();
        expect(found.archivedAt).toBeInstanceOf(Date);
      });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await Tournament.deleteMany({});
    });

    it('должен возвращать все неархивированные турниры', async () => {
      await tournamentRepository.create(createTournamentData('Tourney One'));
      await tournamentRepository.create(createTournamentData('Tourney Two'));
      const tournaments = await tournamentRepository.findAll();
      expect(tournaments).toHaveLength(2);
    });

    it('должен возвращать только неархивированные турниры по умолчанию', async () => {
      await tournamentRepository.create(createTournamentData('Active Tourney'));
      const archivedTourney = await tournamentRepository.create(createTournamentData('Archived Tourney'));
      await tournamentRepository.archiveById(archivedTourney._id);
      
      const tournaments = await tournamentRepository.findAll();
      expect(tournaments).toHaveLength(1);
      expect(tournaments[0].name).toBe('Active Tourney');
    });

    it('должен возвращать все турниры, включая архивированные, с опцией', async () => {
        await tournamentRepository.create(createTournamentData('Active Tourney Two'));
        const archivedTourney = await tournamentRepository.create(createTournamentData('Archived Tourney Two'));
        await tournamentRepository.archiveById(archivedTourney._id);
        
        const tournaments = await tournamentRepository.findAll({ includeArchived: true });
        expect(tournaments).toHaveLength(2);
      });
  });

  describe('update', () => {
    it('должен обновлять данные турнира и инвалидировать кэш', async () => {
      const tournament = await tournamentRepository.create(createTournamentData('Old Name Tourney'));
      const updatedData = { description: 'New tourney description' };

      const updatedTournament = await tournamentRepository.update(tournament._id, updatedData);
      
      expect(updatedTournament.description).toBe('New tourney description');
      expect(cache.invalidateByTag).toHaveBeenCalledWith(`tournament:${tournament._id}`);
      expect(cache.invalidateByTag).toHaveBeenCalledWith(`tournament:slug:${tournament.slug}`);
      expect(cache.invalidateByTag).toHaveBeenCalledWith('tournaments_list');
    });
  });

  describe('archiveById and restoreById', () => {
    it('должен архивировать турнир и инвалидировать кэш', async () => {
      const tournament = await tournamentRepository.create(createTournamentData('ToArchive Tourney'));
      
      const tournamentId = tournament._id;
      const tournamentSlug = tournament.slug;

      const archivedTournament = await tournamentRepository.archiveById(tournamentId);

      expect(archivedTournament).not.toBeNull();
      expect(archivedTournament.archivedAt).toBeInstanceOf(Date);

      const foundAfterArchive = await Tournament.findById(tournamentId);
      expect(foundAfterArchive).not.toBeNull();
      expect(foundAfterArchive.archivedAt).toBeInstanceOf(Date);

      expect(cache.invalidateByTag).toHaveBeenCalledWith(`tournament:${tournamentId.toString()}`);
      expect(cache.invalidateByTag).toHaveBeenCalledWith(`tournament:slug:${tournamentSlug}`);
      expect(cache.invalidateByTag).toHaveBeenCalledWith('tournaments_list');
    });

    it('должен восстанавливать архивированный турнир', async () => {
        const tournament = await tournamentRepository.create(createTournamentData('ToRestore Tourney'));
        await tournamentRepository.archiveById(tournament._id);
  
        const restoredTournament = await tournamentRepository.restoreById(tournament._id);
        expect(restoredTournament).not.toBeNull();
        expect(restoredTournament.archivedAt).toBeNull();
  
        const foundAfterRestore = await Tournament.findById(tournament._id);
        expect(foundAfterRestore).not.toBeNull();
        expect(foundAfterRestore.archivedAt).toBeNull();
      });
  
      it('не должен находить турнир для архивации, если он уже архивирован', async () => {
        const tournament = await tournamentRepository.create(createTournamentData('AlreadyArchived Tourney'));
        await tournamentRepository.archiveById(tournament._id);
        
        const result = await tournamentRepository.archiveById(tournament._id);
        expect(result).toBeNull();
      });
  
      it('должен возвращать null, если турнир для архивации не найден', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const result = await tournamentRepository.archiveById(nonExistentId);
        expect(result).toBeNull();
      });
  });
}); 