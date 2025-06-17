import mongoose from 'mongoose';
import { mapTemplateRepository } from './map-template-repo';
import MapTemplate from '@/models/map/MapTemplate';
import { cache } from '@/lib/cache';

jest.mock('@/lib/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    invalidateByTag: jest.fn(),
  },
}));

describe('MapTemplateRepository', () => {
  beforeAll(async () => {
    await MapTemplate.init();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('не должен создавать шаблон с одинаковым именем', async () => {
    const templateData = { name: 'Unique Map Name', slug: 'unique-map-name' };
    await mapTemplateRepository.create(templateData);
    await expect(mapTemplateRepository.create(templateData)).rejects.toThrow();
  });

  it('должен создавать и находить шаблон карты', async () => {
    const templateData = { name: 'Test Map', slug: 'test-map' };
    const createdTemplate = await mapTemplateRepository.create(templateData);
    expect(createdTemplate).toBeDefined();
    expect(createdTemplate.name).toBe(templateData.name);

    const foundTemplate = await mapTemplateRepository.findById(createdTemplate._id);
    expect(foundTemplate).toBeDefined();
    expect(foundTemplate.name).toBe(templateData.name);
  });

  it('должен находить шаблон по имени', async () => {
    const templateData = { name: 'Find By Name Map', slug: 'find-by-name-map' };
    await MapTemplate.create(templateData);

    const foundTemplate = await mapTemplateRepository.findByName(templateData.name);
    expect(foundTemplate).toBeDefined();
    expect(foundTemplate.slug).toBe(templateData.slug);
  });

  it('должен возвращать null при поиске по несуществующему имени', async () => {
    const foundTemplate = await mapTemplateRepository.findByName('Non Existent Name');
    expect(foundTemplate).toBeNull();
  });

  it('должен возвращать null при поиске по несуществующему ID', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const foundTemplate = await mapTemplateRepository.findById(nonExistentId);
    expect(foundTemplate).toBeNull();
  });

  it('должен возвращать пустой массив, если нет шаблонов', async () => {
    const templates = await mapTemplateRepository.findAll();
    expect(templates).toEqual([]);
  });

  it('должен возвращать все шаблоны карт', async () => {
    await MapTemplate.create({ name: 'First Map', slug: 'first-map' });
    await MapTemplate.create({ name: 'Second Map', slug: 'second-map' });

    const templates = await mapTemplateRepository.findAll();
    expect(templates).toHaveLength(2);
  });

  it('должен обновлять шаблон и инвалидировать кэш', async () => {
    const template = await MapTemplate.create({ name: 'Old Name', slug: 'old-name' });
    const updatedData = { name: 'New Name' };
    
    const updatedTemplate = await mapTemplateRepository.update(template._id, updatedData);
    expect(updatedTemplate).not.toBeNull();
    expect(updatedTemplate.name).toBe(updatedData.name);
    expect(cache.invalidateByTag).toHaveBeenCalledWith(`map_template:${template._id}`);
    expect(cache.invalidateByTag).toHaveBeenCalledWith('map_templates_list');
  });

  it('должен увеличивать счетчик использования', async () => {
    const template = await MapTemplate.create({ name: 'Counter Map', slug: 'counter-map' });
    expect(template.usageCount).toBe(0);

    const updatedTemplate = await mapTemplateRepository.incrementUsageCount(template._id);
    expect(updatedTemplate).not.toBeNull();
    expect(updatedTemplate.usageCount).toBe(1);

    const foundAgainTemplate = await mapTemplateRepository.findById(template._id);
    expect(foundAgainTemplate.usageCount).toBe(1);
  });

  it('должен уменьшать счетчик использования', async () => {
    const template = await MapTemplate.create({ name: 'Dec-Counter Map', slug: 'dec-counter-map', usageCount: 5 });
    expect(template.usageCount).toBe(5);

    const updatedTemplate = await mapTemplateRepository.decrementUsageCount(template._id);
    expect(updatedTemplate).not.toBeNull();
    expect(updatedTemplate.usageCount).toBe(4);

    const foundAgainTemplate = await mapTemplateRepository.findById(template._id);
    expect(foundAgainTemplate.usageCount).toBe(4);
  });

  it('должен использовать кэш при повторном поиске по ID', async () => {
    const templateData = { name: 'Cache Map', slug: 'cache-map' };
    const createdTemplate = await MapTemplate.create(templateData);
    const templateId = createdTemplate._id.toString();
    
    cache.get.mockResolvedValue(null);
    const firstCallResult = await mapTemplateRepository.findById(templateId);

    expect(cache.get).toHaveBeenCalledWith(`map_template:${templateId}`);
    expect(cache.set).toHaveBeenCalledTimes(1);
    
    cache.get.mockResolvedValue(firstCallResult);
    const secondCallResult = await mapTemplateRepository.findById(templateId);

    expect(cache.get).toHaveBeenCalledTimes(2);
    expect(cache.set).toHaveBeenCalledTimes(1); 
    expect(secondCallResult).toEqual(firstCallResult);
  });
}); 