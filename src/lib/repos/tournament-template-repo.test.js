import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { tournamentTemplateRepository } from './tournament-template-repo.js';
import MapTemplate from '@/models/map/MapTemplate.js';
import TournamentTemplate from '@/models/tournament/TournamentTemplate.js';

describe('TournamentTemplateRepository', () => {
  let mongoServer;

  // Перед всеми тестами запускаем временный сервер MongoDB
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // После всех тестов останавливаем сервер и отключаемся от БД
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Очищаем коллекции перед каждым тестом для изоляции
  beforeEach(async () => {
    await MapTemplate.deleteMany({});
    await TournamentTemplate.deleteMany({});
  });

  it('должен создавать и находить шаблон турнира', async () => {
    // 1. Создаем зависимость - шаблон карты
    const mapTemplateData = { name: 'Test Map', slug: 'test-map' };
    const mapTemplate = await new MapTemplate(mapTemplateData).save();

    // 2. Создаем шаблон турнира через репозиторий
    const tournamentTemplateData = {
      name: 'Test Tournament',
      slug: 'test-tournament',
      mapTemplates: [mapTemplate._id],
    };
    const createdTemplate = await tournamentTemplateRepository.create(tournamentTemplateData);

    // 3. Проверяем, что шаблон был создан
    expect(createdTemplate).toBeDefined();
    expect(createdTemplate.name).toBe('Test Tournament');
    expect(createdTemplate.mapTemplates).toHaveLength(1);

    // 4. Находим созданный шаблон через репозиторий
    const foundTemplate = await tournamentTemplateRepository.findById(createdTemplate._id);

    // 5. Проверяем, что найденный шаблон соответствует созданному
    expect(foundTemplate).toBeDefined();
    expect(foundTemplate.name).toBe('Test Tournament');
    expect(foundTemplate.mapTemplates[0].toString()).toEqual(mapTemplate._id.toString());
  });
}); 