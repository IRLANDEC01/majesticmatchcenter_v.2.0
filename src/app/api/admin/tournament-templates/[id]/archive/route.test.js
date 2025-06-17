import { createMocks } from 'node-mocks-http';
import { PATCH } from './route';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';

describe('API /api/admin/tournament-templates/[id]/archive', () => {
  let testTemplate;
  let mapTemplate;

  beforeAll(async () => {
    await TournamentTemplate.init();
    await MapTemplate.init();
  });

  beforeEach(async () => {
    // Сначала создаем зависимость
    mapTemplate = await MapTemplate.create({ 
      name: `map-for-tt-${Date.now()}`,
      slug: `map-for-tt-${Date.now()}` 
    });
    
    // Затем создаем основной объект с этой зависимостью
    testTemplate = await TournamentTemplate.create({
      name: `Test Archive T-Template ${Date.now()}`,
      mapTemplates: [mapTemplate._id],
    });
  });

  afterEach(async () => {
    await TournamentTemplate.deleteMany({});
    await MapTemplate.deleteMany({});
  });

  it('должен успешно архивировать шаблон', async () => {
    const { req } = createMocks({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { archived: true },
    });

    const response = await PATCH(req, { params: { id: testTemplate._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeDefined();

    const dbTemplate = await TournamentTemplate.findById(testTemplate._id).setOptions({ includeArchived: true });
    expect(dbTemplate.archivedAt).toBeDefined();
  });

  it('должен успешно восстанавливать шаблон из архива', async () => {
    // Сначала архивируем
    await testTemplate.updateOne({ $set: { archivedAt: new Date() } });

    const { req } = createMocks({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { archived: false },
    });

    const response = await PATCH(req, { params: { id: testTemplate._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeUndefined();

    const dbTemplate = await TournamentTemplate.findById(testTemplate._id);
    expect(dbTemplate).not.toBeNull();
    expect(dbTemplate.archivedAt).toBeUndefined();
  });

  it('должен возвращать 404, если шаблон не найден', async () => {
    const { req } = createMocks({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { archived: true },
    });

    const nonExistentId = '60c72b2f9b1d8e001f8e4c5e';
    const response = await PATCH(req, { params: { id: nonExistentId } });
    
    expect(response.status).toBe(404);
  });
}); 