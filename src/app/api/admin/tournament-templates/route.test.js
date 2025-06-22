import { GET, POST } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';
import { RESULT_TIERS, CURRENCY_TYPES } from '@/lib/constants.js';

const { TournamentTemplate } = models;

describe('API /api/admin/tournament-templates', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    const { testData: data } = await populateDb();
    testData = data;
  });

  describe('POST', () => {
    it('должен успешно создавать шаблон и возвращать 201', async () => {
      // Arrange
      const templateData = { 
        name: 'New Unique Tournament Template',
        mapTemplates: [testData.mapTemplateDust2._id.toString()],
        description: 'A test description',
        rules: 'A test ruleset',
        prizePool: [{
          target: { tier: RESULT_TIERS.WINNER, rank: 1 },
          currency: CURRENCY_TYPES.GTA_DOLLARS,
          amount: 100,
        }],
      };
      const request = new Request('http://localhost/api/admin/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(body.name).toBe(templateData.name);
      
      const dbTemplate = await TournamentTemplate.findById(body._id).lean();
      expect(dbTemplate).not.toBeNull();
      expect(dbTemplate.prizePool[0].target.tier).toBe(RESULT_TIERS.WINNER);
      expect(dbTemplate.prizePool[0].amount).toBe(100);
    });

    it('должен возвращать 409 при попытке создать дубликат', async () => {
      // Arrange
      const existingTemplate = testData.tournamentTemplate;
      const templateData = { 
        name: existingTemplate.name, // Используем то же имя
        mapTemplates: [testData.mapTemplateDust2._id.toString()],
      };

      const request = new Request('http://localhost/api/admin/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      // Act
      const response = await POST(request);
      
      // Assert
      expect(response.status).toBe(409);
    });
  });

  describe('GET', () => {
    it('должен возвращать только неархивированные шаблоны по умолчанию', async () => {
      // Arrange
      // populateDb создает один активный шаблон. Архивируем его.
      await TournamentTemplate.findByIdAndUpdate(testData.tournamentTemplate._id, { archivedAt: new Date() });
      // Создаем новый, чтобы было что найти
      await TournamentTemplate.create({ 
        name: 'A New Active Template', 
        slug: 'a-new-active-template',
        mapTemplates: [testData.mapTemplateDust2._id],
      });

      const request = new Request('http://localhost/api/admin/tournament-templates');
      
      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].name).toBe('A New Active Template');
    });

    it('должен возвращать только архивные шаблоны при `status=archived`', async () => {
      // Arrange
      // populateDb создает один активный шаблон. Архивируем его.
      const archivedTemplate = await TournamentTemplate.findByIdAndUpdate(
        testData.tournamentTemplate._id, 
        { archivedAt: new Date() },
        { new: true }
      );
      // Создаем еще один, активный, чтобы он НЕ попал в выборку
      await TournamentTemplate.create({ 
        name: 'Another Template', 
        slug: 'another-template',
        mapTemplates: [testData.mapTemplateDust2._id],
      });

      const url = new URL('http://localhost/api/admin/tournament-templates');
      url.searchParams.set('status', 'archived');
      const request = new Request(url);
      
      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].name).toBe(archivedTemplate.name);
    });
  });
}); 