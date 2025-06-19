import { GET, POST } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';
import { TOURNAMENT_SCORING_TYPES } from '@/lib/constants.js';

const { TournamentTemplate } = models;

describe('API /api/admin/tournament-templates', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    testData = await populateDb();
  });

  describe('POST', () => {
    it.skip('должен успешно создавать шаблон и возвращать 201', async () => {
      // Arrange
      const templateData = { 
        name: 'New Unique Tournament Template',
        mapTemplates: [testData.mapTemplates[0]._id.toString()],
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
      
      const dbTemplate = await TournamentTemplate.findById(body._id);
      expect(dbTemplate).not.toBeNull();
    });

    it('должен возвращать 409 при попытке создать дубликат', async () => {
      // Arrange
      const existingTemplate = testData.tournamentTemplate;
      const templateData = { 
        name: existingTemplate.name, // Используем то же имя
        mapTemplates: [testData.mapTemplates[0]._id.toString()],
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
        mapTemplates: [testData.mapTemplates[0]._id],
        scoringType: TOURNAMENT_SCORING_TYPES.LEADERBOARD,
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

    it('должен возвращать все шаблоны при `include_archived=true`', async () => {
      // Arrange
      // populateDb создает один шаблон. Архивируем его.
      await TournamentTemplate.findByIdAndUpdate(testData.tournamentTemplate._id, { archivedAt: new Date() });
      // Создаем еще один, чтобы в итоге было 2
      await TournamentTemplate.create({ 
        name: 'Another Template', 
        slug: 'another-template',
        mapTemplates: [testData.mapTemplates[0]._id],
        scoringType: TOURNAMENT_SCORING_TYPES.LEADERBOARD,
      });

      const url = new URL('http://localhost/api/admin/tournament-templates');
      url.searchParams.set('include_archived', 'true');
      const request = new Request(url);
      
      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.length).toBe(2);
    });
  });
}); 