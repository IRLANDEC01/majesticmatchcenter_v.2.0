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
  });

  describe('findAll', () => {
    it('должен возвращать все созданные семьи', async () => {
      await familyRepository.create({ name: 'Family One', displayLastName: 'One' });
      await familyRepository.create({ name: 'Family Two', displayLastName: 'Two' });
      const families = await familyRepository.findAll();
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

  describe('deactivate', () => {
    it('должен деактивировать семью и инвалидировать кэш', async () => {
      const family = await familyRepository.create({ name: 'ToDeactivate', displayLastName: 'Deactivate' });
      if (!family) throw new Error('Test setup failed: family not created');
      
      const familyId = family._id;
      const familySlug = family.slug;

      const deactivatedFamily = await familyRepository.deactivate(familyId);

      if (deactivatedFamily) {
        expect(deactivatedFamily.status).toBe('inactive');
      }

      const foundAfterDeactivation = await Family.findById(familyId);
      expect(foundAfterDeactivation).not.toBeNull();
      if (foundAfterDeactivation) {
        expect(foundAfterDeactivation.status).toBe('inactive');
      }

      expect(cache.invalidateByTag).toHaveBeenCalledWith(`family:${familyId.toString()}`);
      expect(cache.invalidateByTag).toHaveBeenCalledWith(`family:slug:${familySlug}`);
      expect(cache.invalidateByTag).toHaveBeenCalledWith('families_list');
    });

    it('должен возвращать null, если семья для деактивации не найдена', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const result = await familyRepository.deactivate(nonExistentId);
      expect(result).toBeNull();
    });
  });
});