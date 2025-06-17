import mongoose from 'mongoose';
import { tournamentTemplateRepository } from './tournament-template-repo.js';
import MapTemplate from '@/models/map/MapTemplate.js';
import TournamentTemplate from '@/models/tournament/TournamentTemplate.js';
import { cache } from '@/lib/cache';

// Мокаем модуль кэша, чтобы контролировать его поведение в тестах
jest.mock('@/lib/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    invalidateByTag: jest.fn(),
  },
}));

describe('TournamentTemplateRepository', () => {
  let mapTemplate;

  beforeAll(async () => {
    await TournamentTemplate.init();
    await MapTemplate.init(); // Также инициализируем зависимую модель
  });

  // Очищаем коллекции и моки перед каждым тестом
  beforeEach(async () => {
    jest.clearAllMocks();
    
    mapTemplate = await MapTemplate.create({ 
      name: 'Test Map TTRT Global', 
      slug: 'test-map-ttrt-global' 
    });
  });

  it('не должен создавать шаблон с одинаковым именем', async () => {
    const templateData = { name: 'Unique Tournament Name', mapTemplates: [mapTemplate._id] };
    await tournamentTemplateRepository.create(templateData);
    await expect(tournamentTemplateRepository.create(templateData)).rejects.toThrow();
  });

  it('должен создавать и находить шаблон турнира', async () => {
    const tournamentTemplateData = {
      name: 'Test Tournament TTRT 1',
      mapTemplates: [mapTemplate._id],
    };
    const createdTemplate = await tournamentTemplateRepository.create(tournamentTemplateData);
    expect(createdTemplate).toBeDefined();
    expect(createdTemplate.name).toBe(tournamentTemplateData.name);
    expect(createdTemplate.mapTemplates).toHaveLength(1);

    const foundTemplate = await tournamentTemplateRepository.findById(createdTemplate._id);
    expect(foundTemplate).toBeDefined();
    expect(foundTemplate.name).toBe(tournamentTemplateData.name);
    expect(foundTemplate.mapTemplates[0].toString()).toEqual(mapTemplate._id.toString());
  });

  it('должен находить шаблон по имени', async () => {
    const templateData = {
      name: 'Find By Name Tournament TTRT',
      mapTemplates: [mapTemplate._id],
    };
    await TournamentTemplate.create(templateData);

    const foundTemplate = await tournamentTemplateRepository.findByName(templateData.name);
    expect(foundTemplate).toBeDefined();
    expect(foundTemplate.name).toBe(templateData.name);
  });

  it('должен возвращать null при поиске по несуществующему имени', async () => {
    const foundTemplate = await tournamentTemplateRepository.findByName('Non Existent Name');
    expect(foundTemplate).toBeNull();
  });

  it('должен возвращать null при поиске по несуществующему ID', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const foundTemplate = await tournamentTemplateRepository.findById(nonExistentId);
    expect(foundTemplate).toBeNull();
  });

  it('должен возвращать пустой массив, если нет шаблонов', async () => {
    await TournamentTemplate.deleteMany({});
    const templates = await tournamentTemplateRepository.findAll();
    expect(templates).toHaveLength(0);
  });

  it('должен возвращать все шаблоны турниров', async () => {
    await TournamentTemplate.create({ name: 'First TTRT', mapTemplates: [mapTemplate._id] });
    await TournamentTemplate.create({ name: 'Second TTRT', mapTemplates: [mapTemplate._id] });

    const templates = await tournamentTemplateRepository.findAll();
    expect(templates).toHaveLength(2);
  });

  it('должен подгружать связанные шаблоны карт при `populateMapTemplates: true`', async () => {
    const mapName = mapTemplate.name;
    await TournamentTemplate.create({
      name: 'Populate Test TTRT',
      mapTemplates: [mapTemplate._id],
    });

    const templates = await tournamentTemplateRepository.findAll(true);
    expect(templates).toHaveLength(1);
    expect(templates[0].mapTemplates[0]).toBeInstanceOf(Object);
    expect(templates[0].mapTemplates[0]).not.toBeInstanceOf(mongoose.Types.ObjectId);
    expect(templates[0].mapTemplates[0].name).toBe(mapName);
  });

  it('должен обновлять шаблон и инвалидировать кэш', async () => {
    const template = await TournamentTemplate.create({
      name: 'Old Name TTRT',
      mapTemplates: [mapTemplate._id],
    });
    const updatedData = { name: 'New Name TTRT' };
    
    const updatedTemplate = await tournamentTemplateRepository.update(template._id, updatedData);
    expect(updatedTemplate).not.toBeNull();
    expect(updatedTemplate.name).toBe(updatedData.name);
    expect(cache.invalidateByTag).toHaveBeenCalledWith(`tournament_template:${template._id}`);
    expect(cache.invalidateByTag).toHaveBeenCalledWith('tournament_templates_list');
  });

  it('должен увеличивать счетчик использования', async () => {
    const template = await TournamentTemplate.create({ name: 'Counter Test TTRT', mapTemplates: [mapTemplate._id] });
    expect(template.usageCount).toBe(0);

    const updatedTemplate = await tournamentTemplateRepository.incrementUsageCount(template._id);
    expect(updatedTemplate).not.toBeNull();
    expect(updatedTemplate.usageCount).toBe(1);

    const foundAgainTemplate = await tournamentTemplateRepository.findById(template._id);
    expect(foundAgainTemplate).not.toBeNull();
    expect(foundAgainTemplate.usageCount).toBe(1);
  });

  it('должен уменьшать счетчик использования', async () => {
    const template = await TournamentTemplate.create({
      name: 'Dec-Counter Tournament TTRT',
      usageCount: 5,
      mapTemplates: [mapTemplate._id],
    });
    expect(template.usageCount).toBe(5);

    const updatedTemplate = await tournamentTemplateRepository.decrementUsageCount(template._id);
    expect(updatedTemplate).not.toBeNull();
    expect(updatedTemplate.usageCount).toBe(4);

    const foundAgainTemplate = await tournamentTemplateRepository.findById(template._id);
    expect(foundAgainTemplate).not.toBeNull();
    expect(foundAgainTemplate.usageCount).toBe(4);
  });

  it('должен использовать кэш при повторном поиске по ID', async () => {
    const templateData = { name: 'Cache Test TTRT', mapTemplates: [mapTemplate._id] };
    const createdTemplate = await TournamentTemplate.create(templateData);
    const templateId = createdTemplate._id.toString();
    
    cache.get.mockResolvedValue(null);
    const firstCallResult = await tournamentTemplateRepository.findById(templateId);
    expect(firstCallResult).not.toBeNull();

    expect(cache.get).toHaveBeenCalledWith(`tournament_template:${templateId}`);
    expect(cache.get).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(firstCallResult.name).toBe(templateData.name);

    cache.get.mockResolvedValue(firstCallResult);
    const secondCallResult = await tournamentTemplateRepository.findById(templateId);

    expect(cache.get).toHaveBeenCalledTimes(2);
    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(secondCallResult).toEqual(firstCallResult);
  });
}); 