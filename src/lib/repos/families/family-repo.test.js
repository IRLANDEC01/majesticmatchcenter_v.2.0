import mongoose from 'mongoose';
import { familyRepository } from './family-repo.js';
import Family from '@/models/family/Family.js';
import { cache } from '@/lib/cache';

// Мокаем кэш
jest.mock('@/lib/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    invalidateByTag: jest.fn(),
  },
}));

describe('FamilyRepository', () => {
  beforeAll(async () => {
    await Family.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('должен создавать и возвращать семью', async () => {
      const familyData = { name: 'The Greats', displayLastName: 'Greats' };
      const family = await familyRepository.create(familyData);
      
      expect(family).toBeDefined();
      expect(family.name).toBe(familyData.name);
      
      const expectedSlug = 'the-greats';
      expect(family.slug).toBe(expectedSlug);
    });

    it('должен вызывать инвалидацию кэша списка семей', async () => {
      const familyData = { name: 'The News', displayLastName: 'News' };
      await familyRepository.create(familyData);
      expect(cache.invalidateByTag).toHaveBeenCalledWith('families_list');
    });

    it('не должен создавать семью с одинаковым именем', async () => {
      const familyData = { name: 'The Uniques', displayLastName: 'Uniques' };
      await familyRepository.create(familyData);
      await expect(familyRepository.create(familyData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('должен находить семью по ID', async () => {
      const familyData = { name: 'Find Me', displayLastName: 'FindMe' };
      const family = await familyRepository.create(familyData);
      if (!family) throw new Error('Test setup failed: family not created');
      
      const foundFamily = await familyRepository.findById(family._id);
      expect(foundFamily).toBeDefined();
      if (foundFamily) {
          expect(foundFamily.slug).toBe(family.slug);
      }
    });
  });
  
  describe('findByName', () => {
    it('должен находить семью по имени', async () => {
      const familyData = { name: 'Find By Name', displayLastName: 'FindByName' };
      await familyRepository.create(familyData);
      const foundFamily = await familyRepository.findByName(familyData.name);
      expect(foundFamily).toBeDefined();
      if (foundFamily) {
        expect(foundFamily.slug).toBe('find-by-name');
      }
    });
  });


  describe('findBySlug', () => {
    it('должен находить семью по слагу', async () => {
      const familyData = { name: 'Slug Family', displayLastName: 'Slug' };
      const family = await familyRepository.create(familyData);
      if (!family) throw new Error('Test setup failed: family not created');
      
      const foundFamily = await familyRepository.findBySlug(family.slug);
      expect(foundFamily).toBeDefined();
      if (foundFamily) {
        expect(foundFamily.name).toBe(familyData.name);
      }
    });

    it('не должен находить архивированную семью по слагу', async () => {
      const family = await familyRepository.create({ name: 'Archived Slug', displayLastName: 'Archived' });
      await familyRepository.archiveById(family._id);
      const found = await familyRepository.findBySlug(family.slug);
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Очистка перед каждым тестом в этом блоке
      await Family.deleteMany({});
    });

    it('должен возвращать все неархивированные семьи', async () => {
      await familyRepository.create({ name: 'Family One', displayLastName: 'One' });
      await familyRepository.create({ name: 'Family Two', displayLastName: 'Two' });
      const families = await familyRepository.findAll();
      expect(families).toHaveLength(2);
    });

    it('должен возвращать только неархивированные семьи по умолчанию', async () => {
      await familyRepository.create({ name: 'Active Fam', displayLastName: 'Active' });
      const archivedFam = await familyRepository.create({ name: 'Archived Fam', displayLastName: 'Archived' });
      await familyRepository.archiveById(archivedFam._id);
      
      const families = await familyRepository.findAll();
      expect(families).toHaveLength(1);
      expect(families[0].name).toBe('Active Fam');
    });

    it('должен возвращать все семьи, включая архивированные, с опцией', async () => {
      await familyRepository.create({ name: 'Active Fam Two', displayLastName: 'ActiveTwo' });
      const archivedFam = await familyRepository.create({ name: 'Archived Fam Two', displayLastName: 'ArchivedTwo' });
      await familyRepository.archiveById(archivedFam._id);
      
      const families = await familyRepository.findAll({ includeArchived: true });
      expect(families).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('должен обновлять данные семьи и инвалидировать кэш', async () => {
      const family = await familyRepository.create({ name: 'Old Name Family', displayLastName: 'Old' });
      if (!family) throw new Error('Test setup failed: family not created');
      
      const updatedData = { description: 'New family description' };

      const updatedFamily = await familyRepository.update(family._id, updatedData);
      
      if(updatedFamily){
        expect(updatedFamily.description).toBe('New family description');
      }
      expect(cache.invalidateByTag).toHaveBeenCalledWith(`family:${family._id}`);
      expect(cache.invalidateByTag).toHaveBeenCalledWith(`family:slug:${family.slug}`);
      expect(cache.invalidateByTag).toHaveBeenCalledWith('families_list');
    });
  });

  describe('archiveById and restoreById', () => {
    it('должен архивировать семью и инвалидировать кэш', async () => {
      const family = await familyRepository.create({ name: 'ToArchive', displayLastName: 'Archive' });
      
      const familyId = family._id;
      const familySlug = family.slug;

      const archivedFamily = await familyRepository.archiveById(familyId);

      expect(archivedFamily).not.toBeNull();
      expect(archivedFamily.archivedAt).toBeInstanceOf(Date);

      const foundAfterArchive = await Family.findById(familyId);
      expect(foundAfterArchive).not.toBeNull();
      expect(foundAfterArchive.archivedAt).toBeInstanceOf(Date);

      expect(cache.invalidateByTag).toHaveBeenCalledWith(`family:${familyId.toString()}`);
      expect(cache.invalidateByTag).toHaveBeenCalledWith(`family:slug:${familySlug}`);
      expect(cache.invalidateByTag).toHaveBeenCalledWith('families_list');
    });

    it('должен восстанавливать архивированную семью', async () => {
      const family = await familyRepository.create({ name: 'ToRestore', displayLastName: 'Restore' });
      await familyRepository.archiveById(family._id);

      const restoredFamily = await familyRepository.restoreById(family._id);
      expect(restoredFamily).not.toBeNull();
      expect(restoredFamily.archivedAt).toBeNull();

      const foundAfterRestore = await Family.findById(family._id);
      expect(foundAfterRestore).not.toBeNull();
      expect(foundAfterRestore.archivedAt).toBeNull();
    });

    it('не должен находить семью для архивации, если она уже архивирована', async () => {
      const family = await familyRepository.create({ name: 'AlreadyArchived', displayLastName: 'Archived' });
      await familyRepository.archiveById(family._id);
      
      const result = await familyRepository.archiveById(family._id);
      expect(result).toBeNull();
    });

    it('должен возвращать null, если семья для архивации не найдена', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const result = await familyRepository.archiveById(nonExistentId);
      expect(result).toBeNull();
    });
  });
});